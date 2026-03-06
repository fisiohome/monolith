# test file: test/runner/test_fetch_therapists_availabiliies.rb
module AdminPortal
  module Therapists
    module QueryHelper
      # Fetch therapists with location, location-rule, gender, and availability filtering
      # Optimized to filter at database level where possible before Ruby processing
      def filtered_therapists(location:, service:, params:, formatter:, current_appointment_id: nil)
        # * Resolve location IDs - special case for Jakarta Pusat to allow all DKI Jakarta therapists
        # * This implements the business rule: "Allow Jakarta Pusat therapists for any DKI Jakarta location"
        location_ids =
          if location.city == "KOTA ADM. JAKARTA PUSAT"
            # When user requests Jakarta Pusat, include all DKI Jakarta locations
            # This allows therapists from any DKI Jakarta city to serve Jakarta Pusat appointments
            Location.where(state: "DKI JAKARTA").pluck(:id)
          else
            # For other locations, only use the specific location
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

        # Check if this is a Jabodetabek location to apply appropriate filtering rules
        # Jabodetabek includes: Jakarta, Bogor, Depok, Tangerang, Bekasi, Kepulauan Seribu
        jabodetabek_keywords = ["JAKARTA", "BOGOR", "DEPOK", "TANGERANG", "BEKASI", "KEPULAUAN SERIBU"]
        is_jabodetabek_location = jabodetabek_keywords.any? { |kw| location.city&.include?(kw) }

        # Get all Jabodetabek location IDs for filtering logic
        # Used to exclude Jabodetabek therapists when serving non-Jabodetabek locations
        jabodetabek_location_ids = Location.where(
          "city LIKE ANY (ARRAY[?])",
          jabodetabek_keywords.map { |kw| "%#{kw}%" }
        ).pluck(:id)

        # Filter therapists based on their availability rules and location
        base_scope = if is_jabodetabek_location
          # FOR JABODETABEK LOCATIONS: More permissive filtering
          # Business rule: Jabodetabek therapists can serve any Jabodetabek location
          # This SQL filter handles the following cases:
          # 1. No availability rules defined (NULL) - therapist is available everywhere
          # 2. Empty availability rules array ('[]') - therapist is available everywhere
          # 3. No location-specific rules exist in the array - therapist is available everywhere
          # 4. Therapist's address location matches one of the target location IDs (including Jakarta Pusat → all DKI Jakarta)
          # This ensures we only include therapists who can serve the requested Jabodetabek location
          base_scope.where(
            "(therapist_appointment_schedules.availability_rules IS NULL OR " \
            "therapist_appointment_schedules.availability_rules::text = '[]' OR " \
            "NOT EXISTS (SELECT 1 FROM json_array_elements(therapist_appointment_schedules.availability_rules) " \
            "WHERE value->>'location' = 'true') OR " \
            "addresses.location_id IN (?))",
            location_ids
          )
        else
          # FOR NON-JABODETABEK LOCATIONS: Stricter filtering
          # Business rule: Jabodetabek therapists should NOT serve non-Jabodetabek locations unless explicitly allowed
          # This ensures:
          # 1. Non-Jabodetabek therapists without location rules can serve any location
          # 2. Jabodetabek therapists are excluded UNLESS they have location rules that specifically include this location
          # 3. Therapists with address in the target location are always included
          base_scope.where(
            "(" \
            "  (addresses.location_id NOT IN (?) AND " \
            "   (therapist_appointment_schedules.availability_rules IS NULL OR " \
            "    therapist_appointment_schedules.availability_rules::text = '[]' OR " \
            "    NOT EXISTS (SELECT 1 FROM json_array_elements(therapist_appointment_schedules.availability_rules) " \
            "                WHERE value->>'location' = 'true'))) OR " \
            "  addresses.location_id IN (?)" \
            ")",
            jabodetabek_location_ids,
            location_ids
          )
        end

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
            .where.not(status: ["CANCELLED", "UNSCHEDULED", "ON HOLD", "PENDING THERAPIST ASSIGNMENT"])
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
