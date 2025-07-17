module AdminPortal
  module TherapistQueryHelper
    # Fetch therapists with location, location-rule, gender, and availability filtering
    # Applies location filtering in Ruby if therapist's schedule rules require it (per therapist)
    def filtered_therapists(location:, service:, params:, formatter:, current_appointment_id: nil)
      location_ids =
        if location.city == "KOTA ADM. JAKARTA PUSAT"
          Location.where(state: "DKI JAKARTA").pluck(:id)
        else
          [location.id]
        end

      # Eager-load all associations needed for Ruby-side filtering and availability checks
      therapists = Therapist
        .joins(:service, active_therapist_address: {address: :location})
        .includes(
          :therapist_appointment_schedule,
          active_address: :location,
          appointments: {}, # for availability_details
          therapist_appointment_schedule: [
            :therapist_weekly_availabilities,
            :therapist_adjusted_availabilities
          ]
        )
        .where(service: service)
        .where(employment_status: "ACTIVE")
        .where.not("addresses.latitude = 0 OR addresses.longitude = 0")
        .distinct

      therapists = therapists.uniq { |t| t.id }

      # Ruby-side location rule filtering for therapists whose schedule requires it
      therapists = therapists.select do |therapist|
        schedule = therapist.therapist_appointment_schedule
        next false unless schedule
        rules = schedule.effective_availability_rules
        # If the therapist's schedule has a location rule ("location" key), apply location-based filtering
        location_rule = rules.any? { |rule| rule["location"] == true }
        if location_rule
          therapist_location = therapist.active_address&.location
          # Special case: If the appointment location is in DKI JAKARTA, allow therapists from any location in DKI JAKARTA or from Jakarta Pusat
          if location.state == "DKI JAKARTA"
            location_ids.include?(therapist_location&.id) || therapist_location&.city == "KOTA ADM. JAKARTA PUSAT"
          else
            location_ids.include?(therapist_location&.id)
          end
        else
          # If no location rule, include therapist (already filtered by SQL location)
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
      is_all_of_day = params[:is_all_of_day]
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

        # Memoization cache for availability_details per therapist/time
        availability_cache = {}

        therapists.filter_map do |therapist|
          cache_key = [therapist.id, appointment_date_time.to_s, is_all_of_day, current_appointment_id].join(":")
          details = availability_cache[cache_key] ||= therapist.availability_details(
            appointment_date_time_server_time: appointment_date_time,
            is_all_of_day: is_all_of_day,
            current_appointment_id: current_appointment_id
          )
          # The formatter will serialize the therapist and include availability details
          formatter.call(therapist, details)
        end
      else
        # If no specific date/time is requested, just serialize all therapists
        therapists.map { |therapist| formatter.call(therapist) }
      end
    end
  end
end
