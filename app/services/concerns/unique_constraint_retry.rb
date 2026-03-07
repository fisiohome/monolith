# frozen_string_literal: true

module UniqueConstraintRetry
  extend ActiveSupport::Concern

  # Retry mechanism for handling unique constraint violations
  # Specifically designed for (registration_number, visit_number) constraint
  #
  # @param max_retries [Integer] Maximum number of retry attempts
  # @param retry_delay [Float] Base delay between retries in seconds
  # @param block [Proc] The block to execute with retry logic
  # @return [Object] The result of the block execution
  def with_unique_constraint_retry(max_retries: 3, base_delay: 0.1, &block)
    attempts = 0

    begin
      attempts += 1
      yield
    rescue ActiveRecord::RecordNotUnique => e
      if e.message.include?("index_appointments_on_registration_number_and_visit_number")
        if attempts < max_retries
          Rails.logger.warn "[UniqueConstraintRetry] Duplicate key violation, retry #{attempts}/#{max_retries}: #{e.message}"

          # Exponential backoff with jitter to prevent thundering herd
          delay = base_delay * (2**(attempts - 1)) + Random.rand * 0.1
          sleep(delay)
          retry
        else
          Rails.logger.error "[UniqueConstraintRetry] Max retries exceeded for unique constraint: #{e.message}"
          raise UniqueConstraintMaxRetriesError, "Failed to resolve unique constraint violation after #{max_retries} attempts. Please try again."
        end
      else
        # Re-raise if it's a different unique constraint
        raise e
      end
    end
  end

  # Enhanced retry with deadlock detection for concurrent operations
  #
  # @param appointment [Appointment] The appointment being processed
  # @param max_retries [Integer] Maximum number of retry attempts
  # @param base_delay [Float] Base delay between retries in seconds
  # @param block [Proc] The block to execute with retry logic
  # @return [Object] The result of the block execution
  def with_visit_number_retry(appointment, max_retries: 3, base_delay: 0.1, &block)
    attempts = 0

    begin
      attempts += 1
      yield
    rescue ActiveRecord::RecordNotUnique => e
      if e.message.include?("index_appointments_on_registration_number_and_visit_number")
        if attempts < max_retries
          Rails.logger.warn "[VisitNumberRetry] Duplicate visit number for #{appointment.registration_number}, retry #{attempts}/#{max_retries}"

          # Check for concurrent operations on the same series
          check_concurrent_operations(appointment)

          # Exponential backoff
          delay = base_delay * (2**(attempts - 1))
          sleep(delay)
          retry
        else
          Rails.logger.error "[VisitNumberRetry] Max retries exceeded for visit number assignment"
          raise VisitNumberAssignmentError, "Failed to assign unique visit number after #{max_retries} attempts. Series: #{appointment.registration_number}"
        end
      else
        raise e
      end
    rescue PG::DeadlockDetected => e
      if attempts < max_retries
        Rails.logger.warn "[VisitNumberRetry] Deadlock detected, retry #{attempts}/#{max_retries}: #{e.message}"
        sleep(base_delay * attempts)
        retry
      else
        Rails.logger.error "[VisitNumberRetry] Max retries exceeded due to deadlocks"
        raise VisitNumberAssignmentError, "Deadlock occurred during visit number assignment. Please try again."
      end
    end
  end

  private

  # Check for potential concurrent operations on the same series
  def check_concurrent_operations(appointment)
    # Look for recent operations that might indicate concurrency issues
    recent_operations = Appointment
      .where(registration_number: appointment.registration_number)
      .where("updated_at > ?", 1.minute.ago)
      .where.not(id: appointment.id)
      .count

    if recent_operations > 0
      Rails.logger.warn "[VisitNumberRetry] Detected #{recent_operations} recent operations on series #{appointment.registration_number}"
    end
  end

  # Custom error classes
  class UniqueConstraintMaxRetriesError < StandardError; end

  class VisitNumberAssignmentError < StandardError; end
end
