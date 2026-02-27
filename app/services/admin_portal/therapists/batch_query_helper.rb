module AdminPortal
  module Therapists
    module BatchQueryHelper
      # Fetch therapists in batches to improve performance
      # @param location [Location] The appointment location
      # @param service [Service] The service type
      # @param params [Hash] Query parameters (date/time, gender, etc.)
      # @param formatter [Proc] Method to format therapist data
      # @param batch_size [Integer] Number of therapists to process per batch
      # @param current_appointment_id [Integer] Current appointment ID for updates
      # @return [Array] Formatted therapist data
      def filtered_therapists_in_batches(location:, service:, params:, formatter:, current_appointment_id: nil, batch_size: 100)
        location_ids =
          if location.city == "KOTA ADM. JAKARTA PUSAT"
            Location.where(state: "DKI JAKARTA").pluck(:id)
          else
            [location.id]
          end

        # Build base scope with necessary joins
        base_scope = Therapist
          .joins(:service, active_therapist_address: {address: :location})
          .joins("LEFT JOIN therapist_appointment_schedules ON therapists.id = therapist_appointment_schedules.therapist_id")
          .where(employment_status: "ACTIVE")

        # Apply employment type filter if specified
        base_scope = if params[:employment_type].present? && params[:employment_type] != "ALL"
          # When filtering by specific employment type, only apply that filter
          base_scope.where(employment_type: params[:employment_type])
        else
          # Default behavior: show FLAT type OR therapists with coordinates
          base_scope.where(
            "therapists.employment_type = :flat OR (addresses.latitude <> 0 AND addresses.longitude <> 0)",
            flat: "FLAT"
          )
        end

        # Filter by location rules at SQL level when possible
        base_scope = base_scope.where(
          "(therapist_appointment_schedules.availability_rules IS NULL OR " \
          "therapist_appointment_schedules.availability_rules::text = '[]' OR " \
          "NOT EXISTS (SELECT 1 FROM json_array_elements(therapist_appointment_schedules.availability_rules) " \
          "WHERE value->>'location' = 'true') OR " \
          "addresses.location_id IN (?))",
          location_ids
        )

        # Get total count for progress tracking
        total_count = base_scope.count
        results = []

        # Process in batches to reduce memory usage
        batch_offset = 0

        loop do
          # Get batch of therapist IDs
          therapist_ids = base_scope.limit(batch_size).offset(batch_offset).pluck(:id)
          break if therapist_ids.empty?

          # Load full therapist records for this batch
          batch_therapists = Therapist
            .includes(
              :therapist_appointment_schedule,
              active_address: :location,
              therapist_appointment_schedule: [
                :therapist_weekly_availabilities,
                :therapist_adjusted_availabilities
              ]
            )
            .where(id: therapist_ids)
            .to_a

          # Apply gender filtering to batch
          selected_preferred_therapist_gender = params[:preferred_therapist_gender]
          if selected_preferred_therapist_gender.present? && selected_preferred_therapist_gender != "NO PREFERENCE"
            batch_therapists = batch_therapists.select { |t| t.gender == selected_preferred_therapist_gender }
          end

          # Apply availability filtering if date/time specified
          batch_results = if params[:appointment_date_time].present?
            process_availability_for_batch(
              batch_therapists,
              params,
              formatter,
              current_appointment_id
            )
          else
            # If no date/time, just format all therapists
            batch_therapists.map { |therapist| formatter.call(therapist) }
          end

          results.concat(batch_results)

          # Log progress for large datasets
          Rails.logger.info "Processed #{batch_offset + therapist_ids.size}/#{total_count} therapists" if total_count > 500

          batch_offset += batch_size
        end

        results
      end

      private

      # Process availability checking for a batch of therapists
      def process_availability_for_batch(therapists, params, formatter, current_appointment_id)
        selected_appointment_date_time = params[:appointment_date_time]
        is_all_of_day = params[:is_all_of_day] || false

        # Parse the appointment date/time
        appointment_date_time =
          if selected_appointment_date_time.is_a?(String)
            begin
              Time.zone.parse(selected_appointment_date_time)
            rescue
              selected_appointment_date_time.in_time_zone(Time.zone.name)
            end
          else
            selected_appointment_date_time
          end

        # Preload appointments for all therapists in this batch
        appointment_date = appointment_date_time.to_date
        all_appointments = Appointment
          .where(therapist_id: therapists.map(&:id))
          .where(appointment_date_time: appointment_date.all_day)
          .where.not(status: ["CANCELLED", "UNSCHEDULED"])
          .where.not(id: current_appointment_id)
          .includes(:location)
          .group_by(&:therapist_id)

        # Memoization cache for this batch
        availability_cache = {}

        therapists.filter_map do |therapist|
          cache_key = [therapist.id, appointment_date_time.to_s, is_all_of_day.to_s, current_appointment_id].join(":")

          # Use cached result or compute availability
          details = availability_cache[cache_key] ||= begin
            # Get preloaded appointments for this therapist
            therapist_appointments = all_appointments[therapist.id] || []

            # Create a singleton method to access preloaded appointments
            therapist.define_singleton_method(:preloaded_appointments) { therapist_appointments }

            therapist.availability_details(
              appointment_date_time_server_time: appointment_date_time,
              current_appointment_id: current_appointment_id,
              is_all_of_day: is_all_of_day
            )
          end

          # Only include if available
          formatter.call(therapist, details) if details[:available]
        end
      end
    end
  end
end
