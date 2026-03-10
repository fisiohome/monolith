module AdminPortal
  class TherapistDiagnosisController < ApplicationController
    include AppointmentsHelper

    before_action :authenticate_user!

    # GET /admin-portal/therapist-diagnosis
    # Shows the therapist diagnosis page
    def index
      appointment_search_requested = params[:appt_reg].present?
      appointment_registration_number = params[:appt_reg].to_s
      appointment_scope = Appointment.includes(:patient, :service, :address_history, :package_history)
      appointment_search_error = if appointment_search_requested &&
          !Appointment.where(registration_number: appointment_registration_number).exists?
        "No appointments found for this registration number"
      end

      # for get the selected appointment
      selected_appointment_lambda = lambda do
        next nil if params[:appt_id].blank?

        selected_appointment = appointment_scope.find_by(id: params[:appt_id])
        selected_appointment ? serialize_appointment(selected_appointment) : nil
      end

      # for get the appointments based on the appt search requested
      appointment_options_lambda = lambda do
        next [] unless appointment_search_requested

        appointment_scope
          .where(registration_number: appointment_registration_number)
          .order(appointment_date_time: :desc)
          .map { |appointment| serialize_appointment(appointment) }
      end

      # get therapists with lambda
      get_therapists_option_lambda = lambda do
        version = [Therapist.maximum(:updated_at), User.maximum(:updated_at), Service.maximum(:updated_at)].compact.max&.to_i || 0

        Rails.cache.fetch("therapists_options:v#{version}", expires_in: 10.minutes) do
          therapists_scope = Therapist
            .joins(:user)
            .includes(:user, :service)
            .with_active_addresses
            .employment_status_ACTIVE
            .where(
              # active user (not suspended or suspension ended)
              ["users.suspend_at IS NULL OR (users.suspend_end IS NOT NULL AND users.suspend_end < ?)", Time.current]
            )
            .select(:id, :user_id, :service_id, :name, :employment_type, :employment_status, :gender, :registration_number)
            .order(Arel.sql("LOWER(therapists.name) ASC"))

          deep_transform_keys_to_camel_case({
            data: therapists_scope.map do |therapist|
              {
                id: therapist.id,
                name: therapist.name,
                employment_type: therapist.employment_type,
                employment_status: therapist.employment_status,
                gender: therapist.gender,
                registration_number: therapist.registration_number,
                user: therapist.user && {id: therapist.user.id, email: therapist.user.email},
                service: therapist.service && {id: therapist.service.id, name: therapist.service.name}
              }
            end.as_json
          })
        end
      end

      # get selected therapists from query params
      get_selected_therapists_lambda = lambda do
        therapist_ids = params[:therapist_ids]
        return [] if therapist_ids.blank?

        # Handle both string and array inputs
        ids = therapist_ids.is_a?(Array) ? therapist_ids : [therapist_ids]
        ids = ids.compact_blank

        return [] if ids.empty?

        Therapist
          .includes(:user, :service)
          .where(id: ids)
          .map do |therapist|
            deep_transform_keys_to_camel_case({
              id: therapist.id,
              name: therapist.name,
              employment_type: therapist.employment_type,
              employment_status: therapist.employment_status,
              gender: therapist.gender,
              registration_number: therapist.registration_number,
              user: therapist.user && {id: therapist.user.id, email: therapist.user.email},
              service: therapist.service && {id: therapist.service.id, name: therapist.service.name}
            })
          end
      end

      get_analyze_lambda = lambda do
        deep_transform_keys_to_camel_case(perform_analysis)
      end

      render inertia: "AdminPortal/Therapist/Diagnosis", props: deep_transform_keys_to_camel_case({
        selected_appt: InertiaRails.defer(group: "appt") { selected_appointment_lambda.call },
        appointment_options: InertiaRails.defer(group: "appt") { appointment_options_lambda.call },
        appointment_search_error:,
        therapist_options: InertiaRails.optional { get_therapists_option_lambda.call },
        selected_therapists: InertiaRails.defer { get_selected_therapists_lambda.call },
        analyze_report: InertiaRails.optional { get_analyze_lambda.call }
      })
    end

    # POST /admin-portal/therapist-diagnosis/analyze
    # Analyzes why specific therapists are not available for a patient's visit
    def analyze
      result = perform_analysis
      render json: result
    end

    private

    def serialize_appointment(appointment)
      package_history = appointment&.package_history || appointment&.package
      patient = appointment&.patient
      service = appointment&.service
      address_history = appointment&.address_history
      location = address_history&.location

      deep_transform_keys_to_camel_case({
        id: appointment.id,
        appointment_date_time: appointment.appointment_date_time.iso8601,
        registration_number: appointment&.registration_number,
        status: appointment&.status,
        visit_number: appointment&.visit_number,
        visit_progress: appointment&.visit_progress,
        patient: {
          id: patient&.id,
          name: patient&.name,
          patient_number: patient&.patient_number,
          age: patient&.age,
          gender: patient&.gender,
          date_of_birth: patient&.date_of_birth
        },
        service: {
          id: service&.id,
          name: service&.name,
          code: service&.code,
          description: service&.description
        },
        package: {
          id: package_history&.id,
          name: package_history&.name,
          number_of_visit: package_history&.number_of_visit
        },
        visit_location: {
          id: address_history&.id,
          address_line: address_history&.address_line,
          latitude: address_history&.latitude,
          longitude: address_history&.longitude,
          notes: address_history&.notes,
          postal_code: address_history&.postal_code,
          location_id: location&.id,
          country: location&.country,
          city: location&.city,
          country_code: location&.country_code,
          state: location&.state
        }
      })
    end

    def perform_analysis
      # Use existing query parameters instead of requiring data parameters
      appointment_id = params[:appt_id]
      therapist_ids = params[:therapist_ids]

      # Only perform analysis if we have the required parameters
      if appointment_id && therapist_ids
        # Initialize diagnosis service with appointment ID
        diagnosis_service = AdminPortal::TherapistDiagnosisService.new(
          appointment_id: appointment_id
        )

        # Handle both string and array inputs for therapist IDs
        ids = therapist_ids.is_a?(Array) ? therapist_ids : [therapist_ids]
        ids = ids.compact_blank

        # Perform complete analysis using service
        results = diagnosis_service.analyze(ids)

        {
          success: true,
          data: results
        }
      else
        {
          success: false,
          error: "Missing required parameters for analysis"
        }
      end
    rescue => e
      Rails.logger.error "Therapist diagnosis error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")

      {
        success: false,
        error: "Failed to analyze therapist availability: #{e.message}"
      }
    end
  end
end
