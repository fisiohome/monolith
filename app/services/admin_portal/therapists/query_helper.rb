# test file: test/runner/test_fetch_therapists_availabiliies.rb
module AdminPortal
  module Therapists
    module QueryHelper
      # Fetch therapists with location, location-rule, gender, and availability filtering
      # Optimized to filter at database level where possible before Ruby processing
      def filtered_therapists(location:, service:, params:, formatter:, current_appointment_id: nil)
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
        # Include therapists without location rules OR with matching location
        base_scope = base_scope.where(
          "(therapist_appointment_schedules.availability_rules IS NULL OR " \
          "therapist_appointment_schedules.availability_rules::text = '[]' OR " \
          "NOT EXISTS (SELECT 1 FROM json_array_elements(therapist_appointment_schedules.availability_rules) " \
          "WHERE value->>'location' = 'true') OR " \
          "addresses.location_id IN (?))",
          location_ids
        )

        # Eager-load associations to prevent N+1 queries
        therapists = base_scope
          .includes(
            :therapist_appointment_schedule,
            active_address: :location,
            appointments: {}, # for availability_details
            therapist_appointment_schedule: [
              :therapist_weekly_availabilities,
              :therapist_adjusted_availabilities
            ]
          )
          .distinct

        # Ruby-side filtering for edge cases (Jakarta Pusat special case)
        # Only needed for Jakarta Pusat due to special business rule
        therapists = therapists.select do |therapist|
          schedule = therapist.therapist_appointment_schedule
          next false unless schedule
          rules = schedule.effective_availability_rules

          # Ensure rules is an array
          rules = Array(rules)

          # Check if therapist has location rule
          location_rule = rules.any? { |rule| rule["location"] == true }
          if location_rule && location.state == "DKI JAKARTA"
            # Special case: Allow Jakarta Pusat therapists for any DKI Jakarta location
            therapist_location = therapist.active_address&.location
            therapist_location&.city == "KOTA ADM. JAKARTA PUSAT" || location_ids.include?(therapist_location&.id)
          else
            # Already filtered at SQL level, so include all others
            true
          end
        end

        # Gender filtering
        selected_preferred_therapist_gender = params[:preferred_therapist_gender]
        therapists = if selected_preferred_therapist_gender.present? && selected_preferred_therapist_gender != "NO PREFERENCE"
          therapists.select { |t| t.gender == selected_preferred_therapist_gender }
        else
          therapists
        end

        # Availability filtering: filter therapists by their availability for the requested date/time
        selected_appointment_date_time = params[:appointment_date_time]
        is_all_of_day = params[:is_all_of_day] || false
        if selected_appointment_date_time.present?
          # Parse the appointment date/time, handling both string and time objects
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

          # Preload appointments for all therapists at once to reduce N+1 queries
          appointment_date = appointment_date_time.to_date
          all_appointments = Appointment
            .where(therapist_id: therapists.map(&:id))
            .where(appointment_date_time: appointment_date.all_day)
            .where.not(status: ["CANCELLED", "UNSCHEDULED"])
            .where.not(id: current_appointment_id)
            .includes(:location)
            .group_by(&:therapist_id)

          # Memoization cache for availability_details per therapist/time
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
        else
          # If no specific date/time is requested, just serialize all therapists
          therapists.map { |therapist| formatter.call(therapist) }
        end
      end
    end
  end
end
