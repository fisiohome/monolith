module AdminPortal
  class PreparationRescheduleAppointmentService
    include ApplicationHelper
    include TherapistsHelper

    def initialize(appointment, params)
      @appointment = appointment
      @params = params
    end

    # retrieves all therapists available by selected location and service
    def fetch_therapists
      return unless @appointment.location.present? && @appointment.service.present?
      location = Location.find(@appointment.location.id)
      service = Service.find(@appointment.service.id)

      location_ids = if location.city == "KOTA ADM. JAKARTA PUSAT"
        # * Booking from Jakarta Pusat: All therapists in DKI Jakarta
        Location.where(state: "DKI JAKARTA").pluck(:id)
      else
        # * Otherwise: Only therapists in the selected location
        [location.id]
      end

      therapists = Therapist
        .joins(:service, active_therapist_address: {address: :location})
        .includes(
          [
            :appointments,
            therapist_appointment_schedule: [
              :therapist_weekly_availabilities,
              :therapist_adjusted_availabilities
            ]
          ]
        )
        .where(service: service)
        # * therapist from JAKARTA PUSAT, all booking come from Greater Jakarta can taken by therapist
        .where(
          (location.state == "DKI JAKARTA") ? ["addresses.location_id IN (?) OR locations.city = ?", location_ids, "KOTA ADM. JAKARTA PUSAT"] : ["addresses.location_id IN ?", location_ids]
        )
        .where(employment_status: "ACTIVE")
        # Exclude addresses with invalid lat/long
        .where.not("addresses.latitude = 0 OR addresses.longitude = 0")
        .distinct

      # Gender filtering
      selected_preferred_therapist_gender = @params[:preferred_therapist_gender]
      therapists = apply_gender_filter(therapists, selected_preferred_therapist_gender)

      # Availability filtering
      selected_appointment_date_time = @params[:appointment_date_time]
      if selected_appointment_date_time.present?
        apply_availability_filter(therapists, selected_appointment_date_time)
      else
        # If no availability filter, at least serialize with minimal availability data
        therapists.map { |therapist| formatted_therapists(therapist) }
      end
    end

    def fetch_options_data
      preferred_therapist_gender = Appointment::PREFERRED_THERAPIST_GENDER

      min_date = @appointment&.min_datetime
      max_date = @appointment&.max_datetime

      # find the nearest visits with a datetime (backwards & forwards)
      prev_appt = safe_nearest_with_datetime(@appointment&.previous_visit, :previous_visit)
      next_appt = safe_nearest_with_datetime(@appointment&.next_visit, :next_visit)

      # bump them by ±1 minute
      min_dt = prev_appt&.appointment_date_time&.advance(minutes: 1) # +1 minute so you can’t pick the same minute as the previous appt
      max_dt = next_appt&.appointment_date_time&.advance(minutes: -1) # –1 minute so you finish before the next appt

      # build human-readable reasons
      parts = []
      if prev_appt && min_dt
        parts << "after #{min_dt.strftime("%B %d, %Y")} – visit #{prev_appt.visit_number}/#{prev_appt.total_package_visits} (##{prev_appt.registration_number})"
      end
      if next_appt && max_dt
        parts << "before #{max_dt.strftime("%B %d, %Y")} – visit #{next_appt.visit_number}/#{next_appt.total_package_visits} (##{next_appt.registration_number})"
      end
      message = parts.any? ? "Schedule available #{parts.join(" and ")}." : nil

      deep_transform_keys_to_camel_case(
        {
          preferred_therapist_gender:,
          appt_date_time: {min: min_date, max: max_date, message:}
        }
      )
    end

    private

    def apply_gender_filter(therapists, gender_param)
      return therapists unless gender_param.present? && gender_param != "NO PREFERENCE"

      therapists.where(gender: gender_param)
    end

    def formatted_therapists(therapist, availability_details = nil)
      deep_transform_keys_to_camel_case(
        serialize_therapist(
          therapist,
          {
            only: %i[id name registration_number employment_status employment_type gender],
            include_user: false,
            include_service: false,
            include_bank_details: false,
            include_addresses: false,
            include_active_address: true,
            include_availability: true,
            include_appointments: true
          }
        ).merge(availability_details:)
      )
    end

    def apply_availability_filter(therapists, param_value)
      appointment_date_time = param_value.in_time_zone(Time.zone.name)

      # Convert to an array to filter and map in Ruby
      therapists.to_a.filter_map do |therapist|
        details = therapist.availability_details(appointment_date_time, @appointment.id)

        # You could add a condition here if you want to exclude non-available therapists.
        # if details[:available]
        formatted_therapists(therapist, details)
        # end
      end
    end

    # Walks from `start_appt` following `method` (either :previous_visit or :next_visit)
    # until it finds an appointment with #appointment_date_time, or returns nil.
    # Uses a Set to avoid infinite loops if the chain ever loops back.
    def safe_nearest_with_datetime(start_appt, method)
      return nil unless start_appt

      seen = Set.new
      current = start_appt

      while current && !seen.include?(current.id)
        return current if current.appointment_date_time.present?
        seen << current.id
        current = current.send(method)
      end

      nil
    end
  end
end
