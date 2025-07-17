module AdminPortal
  class PreparationRescheduleAppointmentService
    include ApplicationHelper
    include TherapistsHelper
    include TherapistQueryHelper

    def initialize(appointment, params)
      @appointment = appointment
      @params = params
    end

    # retrieves all therapists available by selected location and service
    def fetch_therapists
      return unless @appointment.location.present? && @appointment.service.present?
      location = Location.find(@appointment.location.id)
      service = Service.find(@appointment.service.id)

      filtered_therapists(location:, service:, params: @params, current_appointment_id: @appointment.id, formatter: method(:formatted_therapists))
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

    def is_all_of_day
      @params[:is_all_of_day]
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
