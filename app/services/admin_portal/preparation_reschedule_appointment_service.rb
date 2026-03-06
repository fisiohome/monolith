module AdminPortal
  class PreparationRescheduleAppointmentService
    include ApplicationHelper
    include TherapistsHelper
    include AdminPortal::Therapists
    include AdminPortal::Therapists::QueryHelper

    def initialize(appointment, params)
      @appointment = appointment
      @params = params
    end

    # retrieves all therapists available by selected location and service
    def fetch_therapists
      return unless @appointment.location.present? && @appointment.service.present?

      location = Location.includes(:services).find(@appointment.location.id)
      service = Service.find(@appointment.service.id)

      # Get employment type filter from params
      employment_type = @params[:employment_type] || "ALL"
      # Get bypass constraints flag from params
      bypass_constraints = @params[:bypass_constraints] || false

      # using the batching
      batch_size = @params[:batch_size].to_i || AdminPortal::Therapists::QueryConfig::DEFAULT_BATCH_SIZE
      extend AdminPortal::Therapists::BatchQueryHelper
      filtered_therapists_in_batches(
        location: location,
        service: service,
        params: @params.merge(employment_type: employment_type, bypass_constraints: bypass_constraints),
        formatter: method(:formatted_therapists),
        batch_size: batch_size,
        current_appointment_id: @appointment.id
      )

      # ? if wanna not batching filtered processed
      # filtered_therapists(location:, service:, params: @params.merge(employment_type: employment_type, bypass_constraints: bypass_constraints), formatter: method(:formatted_therapists))
    end

    def fetch_options_data
      preferred_therapist_gender = Appointment::PREFERRED_THERAPIST_GENDER

      # For dynamic ordering: only set min date (no max date constraint)
      # Users can reschedule to any future date, but dates with existing visits will be disabled
      min_date = @appointment&.min_datetime

      # Collect all other visits' scheduled dates/times to disable them
      # This prevents scheduling on dates/times where visit N+ already exists
      disabled_visits = collect_disabled_visits

      # Build info message about other scheduled visits
      message = build_disabled_visits_message(disabled_visits)

      deep_transform_keys_to_camel_case(
        {
          preferred_therapist_gender:,
          appt_date_time: {
            min: min_date,
            max: nil, # No max constraint for dynamic ordering
            message:,
            disabled_visits: # Array of {date, time, visitNumber} for dates/times with scheduled visits
          }
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

    # Collects all other visits (excluding current appointment) that have scheduled dates/times
    # Returns array of hashes with date, time, and visit_number for each scheduled visit
    def collect_disabled_visits
      return [] if @appointment&.registration_number.blank?

      # Get all appointments with the same registration number
      all_visits = Appointment.where(registration_number: @appointment.registration_number)

      # Filter out current appointment and collect only those with scheduled date/time
      all_visits
        .reject { |appt| appt.id == @appointment.id }
        .select { |appt| appt.appointment_date_time.present? }
        .map do |appt|
          end_time = appt.appointment_date_time + appt.total_duration_minutes.minutes
          {
            date: appt.appointment_date_time.to_date.iso8601,
            start_time: appt.appointment_date_time.strftime("%H:%M"),
            end_time: end_time.strftime("%H:%M"),
            visit_number: appt.visit_number
          }
        end
        .sort_by { |v| [v[:date], v[:start_time]] }
    end

    # Builds info message about disabled visits
    def build_disabled_visits_message(disabled_visits)
      return nil if disabled_visits.empty?

      visit_descriptions = disabled_visits.map do |visit|
        date = Date.parse(visit[:date]).strftime("%B %d, %Y")
        "Visit #{visit[:visit_number]} (#{date} at #{visit[:start_time]} — #{visit[:end_time]})"
      end

      "Other scheduled visits: #{visit_descriptions.join(", ")}. These dates/times are unavailable."
    end
  end
end
