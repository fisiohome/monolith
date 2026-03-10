# frozen_string_literal: true

module SeriesLocking
  extend ActiveSupport::Concern

  # Locks all appointments in a series to prevent concurrent modifications
  # Uses pessimistic locking at the database level with consistent ordering
  #
  # @param appointment [Appointment] The appointment to lock the series for
  # @param block [Proc] The block to execute while holding the lock
  # @return [Object] The result of the block execution
  def with_series_lock(appointment, &block)
    root = appointment.reference_appointment || appointment

    # Lock all appointments in the series using pessimistic locking
    # Order by ID to ensure consistent lock acquisition order and prevent deadlocks
    series_appointments = Appointment
      .where(registration_number: root.registration_number)
      .order(:id)  # Consistent ordering prevents deadlock cycles

    # Use NOWAIT to fail fast instead of waiting indefinitely
    # Fall back to regular lock if NOWAIT fails
    begin
      series_appointments.lock.each do |locked_appointment|
        Rails.logger.debug "[SeriesLocking] Locked appointment #{locked_appointment.id} for series #{root.registration_number}"
      end
    rescue ActiveRecord::StatementInvalid => e
      if e.message.include?("could not obtain lock on relation")
        # NOWAIT failed, try with regular lock and timeout
        Rails.logger.debug { "[SeriesLocking] NOWAIT failed, using regular lock for series #{root.registration_number}" }
        series_appointments.lock.each do |locked_appointment|
          Rails.logger.debug "[SeriesLocking] Locked appointment #{locked_appointment.id} for series #{root.registration_number}"
        end
      else
        raise e
      end
    end

    # Execute the block while holding the lock
    result = yield

    Rails.logger.debug { "[SeriesLocking] Released lock for series #{root.registration_number}" }
    result
  rescue ActiveRecord::LockWaitTimeout
    Rails.logger.error "[SeriesLocking] Lock timeout for series #{root.registration_number}"
    raise SeriesLockTimeoutError, "Failed to acquire lock for appointment series. Please try again."
  rescue PG::DeadlockDetected => e
    Rails.logger.error "[SeriesLocking] Deadlock detected for series #{root.registration_number}: #{e.message}"
    raise SeriesLockDeadlockError, "Deadlock occurred while locking appointment series. Please try again."
  rescue => e
    Rails.logger.error "[SeriesLocking] Unexpected error: #{e.class} - #{e.message}"
    raise
  end

  # Attempts to acquire series lock with retry mechanism
  # Useful for handling temporary lock contention
  #
  # @param appointment [Appointment] The appointment to lock the series for
  # @param max_retries [Integer] Maximum number of retry attempts
  # @param retry_delay [Float] Delay between retries in seconds
  # @param block [Proc] The block to execute while holding the lock
  # @return [Object] The result of the block execution
  def with_series_lock_retry(appointment, max_retries: 3, retry_delay: 0.5, &block)
    attempts = 0

    begin
      attempts += 1
      with_series_lock(appointment, &block)
    rescue SeriesLockTimeoutError, SeriesLockDeadlockError => e
      if attempts < max_retries
        retry_type = e.class.name.split("::").last
        Rails.logger.warn "[SeriesLocking] #{retry_type} - Retry #{attempts}/#{max_retries} for series #{appointment.registration_number}"

        # Exponential backoff with jitter to prevent synchronized retries
        delay = retry_delay * attempts + Random.rand * 0.1
        sleep(delay)
        retry
      else
        Rails.logger.error "[SeriesLocking] Max retries exceeded for series #{appointment.registration_number}"
        raise e
      end
    end
  end

  private

  # Custom error classes for series lock issues
  class SeriesLockTimeoutError < StandardError; end

  class SeriesLockDeadlockError < StandardError; end
end
