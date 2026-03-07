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
      batch_size_param = @params[:batch_size]
      batch_size = if batch_size_param.present?
        batch_size_param.to_i
      else
        AdminPortal::Therapists::QueryConfig::DEFAULT_BATCH_SIZE
      end
      # Log batch_size parameter for debugging
      Rails.logger.info "[TherapistSearch-Reschedule] batch_size_param: #{batch_size_param.inspect}, final batch_size: #{batch_size}"
      Rails.logger.info "[TherapistSearch-Reschedule] appointment_id: #{@appointment.id}, location_id: #{@appointment.location&.id}, service_id: #{@appointment.service&.id}"
      Rails.logger.info "[TherapistSearch-Reschedule] employment_type: #{employment_type}, bypass_constraints: #{bypass_constraints}"
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
      # Custom optimized serialization for reschedule appointments
      # Include series-based appointments for suggested therapists and visit progress

      # Pre-construct active address for maximum performance
      active_address = if therapist.active_address
        {
          address: therapist.active_address.address,
          latitude: therapist.active_address.latitude,
          longitude: therapist.active_address.longitude,
          location: {
            id: therapist.active_address.location.id,
            city: therapist.active_address.location.city,
            state: therapist.active_address.location.state,
            country: therapist.active_address.location.country,
            countryCode: therapist.active_address.location.country_code
          }
        }
      end

      # Pre-construct availability for maximum performance
      availability = if therapist.therapist_appointment_schedule
        {
          availabilityRules: therapist.therapist_appointment_schedule.availability_rules
        }
      end

      # Get appointments from the same series (if current appointment exists)
      appointments = if @appointment&.id.present?
        if @appointment&.registration_number.present?
          # Include appointments from the same series (same registration number)
          therapist.appointments.where(registration_number: @appointment.registration_number)
        else
          # If no registration number, include only the current appointment
          therapist.appointments.where(id: @appointment.id)
        end
      else
        [] # No appointments if no reference
      end

      therapist_data = {
        id: therapist.id,
        name: therapist.name,
        registrationNumber: therapist.registration_number,
        employmentStatus: therapist.employment_status,
        employmentType: therapist.employment_type,
        gender: therapist.gender,
        activeAddress: active_address,
        availability: availability,
        appointments: appointments.map do |appointment|
          {
            id: appointment.id,
            registrationNumber: appointment.registration_number,
            visitNumber: appointment.visit_number,
            visitProgress: appointment.visit_progress,
            totalPackageVisits: appointment.total_package_visits
          }
        end
      }

      deep_transform_keys_to_camel_case(therapist_data.merge(availability_details:))
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
