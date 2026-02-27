module AdminPortal
  module Therapists
    # Service to cache therapist availability calculations
    # Reduces redundant availability checks for the same therapist/time combination
    class AvailabilityCache
      class << self
        # Cache availability results for a therapist at a specific time
        # @param therapist_id [Integer] The therapist ID
        # @param appointment_time [Time] The appointment time
        # @param is_all_day [Boolean] Whether it's an all-day appointment
        # @param current_appointment_id [Integer] Current appointment ID (for updates)
        # @param availability_data [Hash] The availability details
        # @return [Hash] The cached availability data
        def cache_availability(therapist_id:, appointment_time:, is_all_day:, current_appointment_id:, availability_data:)
          cache_key = generate_cache_key(therapist_id, appointment_time, is_all_day, current_appointment_id)

          # Cache for 15 minutes with availability namespace
          Rails.cache.write(
            cache_key,
            availability_data,
            expires_in: 15.minutes,
            namespace: "therapist_availability"
          )

          availability_data
        end

        # Get cached availability for a therapist
        # @param therapist_id [Integer] The therapist ID
        # @param appointment_time [Time] The appointment time
        # @param is_all_day [Boolean] Whether it's an all-day appointment
        # @param current_appointment_id [Integer] Current appointment ID (for updates)
        # @return [Hash, nil] The cached availability data or nil if not found
        def get_cached_availability(therapist_id:, appointment_time:, is_all_day:, current_appointment_id:)
          cache_key = generate_cache_key(therapist_id, appointment_time, is_all_day, current_appointment_id)

          Rails.cache.read(cache_key, namespace: "therapist_availability")
        end

        # Invalidate cache for a specific therapist (useful when appointments change)
        # @param therapist_id [Integer] The therapist ID
        def invalidate_therapist_cache(therapist_id)
          # Rails doesn't support pattern deletion directly, so we track keys
          tracked_keys = Rails.cache.read("therapist_availability_keys:#{therapist_id}", namespace: "therapist_availability") || []

          tracked_keys.each do |key|
            Rails.cache.delete(key, namespace: "therapist_availability")
          end

          Rails.cache.delete("therapist_availability_keys:#{therapist_id}", namespace: "therapist_availability")
        end

        # Track cache keys for pattern-based invalidation
        def track_cache_key(therapist_id, cache_key)
          keys = Rails.cache.read("therapist_availability_keys:#{therapist_id}", namespace: "therapist_availability") || []
          keys << cache_key
          keys.uniq!

          Rails.cache.write(
            "therapist_availability_keys:#{therapist_id}",
            keys,
            expires_in: 1.hour,
            namespace: "therapist_availability"
          )
        end

        private

        # Generate a unique cache key for the availability check
        # @param therapist_id [Integer] The therapist ID
        # @param appointment_time [Time] The appointment time
        # @param is_all_day [Boolean] Whether it's an all-day appointment
        # @param current_appointment_id [Integer] Current appointment ID (for updates)
        # @return [String] The cache key
        def generate_cache_key(therapist_id, appointment_time, is_all_day, current_appointment_id)
          key = "therapist_availability:therapist_#{therapist_id}:#{appointment_time.to_i}:#{is_all_day}:#{current_appointment_id}"
          track_cache_key(therapist_id, key)
          key
        end
      end
    end
  end
end
