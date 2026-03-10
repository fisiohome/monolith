# frozen_string_literal: true

module SeriesLocking
  extend ActiveSupport::Concern

  # Locks all appointments in a series to prevent concurrent modifications
  # Uses pessimistic locking at the database level
  #
  # @param appointment [Appointment] The appointment to lock the series for
  # @param block [Proc] The block to execute while holding the lock
  # @return [Object] The result of the block execution
  def with_series_lock(appointment, &block)
    root = appointment.reference_appointment || appointment

    # Lock all appointments in the series using pessimistic locking
    # This prevents other transactions from modifying any appointment in the series
    series_appointments = Appointment.where(registration_number: root.registration_number)

    series_appointments.lock.each do |locked_appointment|
      Rails.logger.debug "[SeriesLocking] Locked appointment #{locked_appointment.id} for series #{root.registration_number}"
    end

    # Execute the block while holding the lock
    result = yield

    Rails.logger.debug { "[SeriesLocking] Released lock for series #{root.registration_number}" }
    result
  rescue ActiveRecord::LockWaitTimeout
    Rails.logger.error "[SeriesLocking] Lock timeout for series #{root.registration_number}"
    raise SeriesLockTimeoutError, "Failed to acquire lock for appointment series. Please try again."
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
    rescue SeriesLockTimeoutError => e
      if attempts < max_retries
        Rails.logger.warn "[SeriesLocking] Retry #{attempts}/#{max_retries} for series #{appointment.registration_number}"
        sleep(retry_delay * attempts) # Exponential backoff
        retry
      else
        Rails.logger.error "[SeriesLocking] Max retries exceeded for series #{appointment.registration_number}"
        raise e
      end
    end
  end

  private

  # Custom error class for series lock timeouts
  class SeriesLockTimeoutError < StandardError; end
end
