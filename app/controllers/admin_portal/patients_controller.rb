module AdminPortal
  class PatientsController < ApplicationController
    include PatientsHelper
    include AppointmentsHelper

    def index
      page = params.fetch(:page, 1)
      limit = params.fetch(:limit, 10)
      details_param = params[:details]
      edit_param = params[:edit]
      selected_param = details_param || edit_param
      patient_search = params[:text]
      filter_by_city = params[:city]

      # * get the patients collections
      patients_collections = Patient.joins(:patient_contact).includes(:user).search(patient_search).by_city(filter_by_city).distinct
      @pagy, @patients = pagy(patients_collections, page:, limit:)
      patients_data = @patients.map { |p| serialize_patient(p, {include_active_address: false, include_patient_location: true}) }

      # * get the selected patient
      selected_patient_lambda = lambda do
        return nil unless selected_param

        get_patient(selected_param)
        deep_transform_keys_to_camel_case(
          serialize_patient(
            @patient,
            {include_patient_addresses: true, include_active_address: false}
          )
        )
      end

      # * get the selected patient appointments
      selected_patient_appts_lambda = lambda do
        return nil unless details_param

        Appointment
          .includes(:therapist, :patient, :service, :package, :location, :admins)
          .initial_visits
          .where(patient_id: details_param)
          .map { |a| deep_transform_keys_to_camel_case(serialize_appointment(a)) }
      end

      # * for get the filter options
      filter_options_lambda = lambda do
        locations = Location.cached_locations.as_json

        deep_transform_keys_to_camel_case({locations:})
      end

      # * get the options data for embedded form
      options_data_lambda = lambda do
        patient_genders = Patient.genders.map { |key, value| value }

        deep_transform_keys_to_camel_case({patient_genders:})
      end

      render inertia: "AdminPortal/Patient/Index", props: deep_transform_keys_to_camel_case({
        patients: {
          metadata: pagy_metadata(@pagy),
          data: patients_data
        },
        selected_patient: InertiaRails.defer { selected_patient_lambda.call },
        selected_patient_appts: InertiaRails.defer { selected_patient_appts_lambda.call },
        filter_options: InertiaRails.defer(group: "filter") { filter_options_lambda.call },
        options_data: InertiaRails.defer(group: "form_options") { options_data_lambda.call }
      })
    end

    def update
      id = params[:edit]
      get_patient(id)
      Rails.logger.info "Starting process to update the patient details for name: #{@patient.name}."

      result = UpdatePatientService.new(@patient, params).call
      success_message = result[:updated] ? "Patient was updated successfully." : "No changes detected."

      Rails.logger.info "Patient details for name: #{@patient.name} updated successfully."
      redirect_to admin_portal_patients_path(request.query_parameters.except(:edit)), notice: success_message
    rescue => e
      Rails.logger.error "Error while updating the patient details for name: #{@patient.name}, with error (#{e.class}): #{e.message}."

      # extract the error message
      record = e.respond_to?(:record) && e.record
      base_messages = record ? record.errors.messages.transform_values(&:uniq) : {}
      full_messages = record ? record.errors.full_messages : [e.message]
      error_payload = deep_transform_keys_to_camel_case(
        base_messages.merge(fullMessages: full_messages)
      )

      flash[:alert] = "Error update patient profile: #{full_messages}."
      redirect_to admin_portal_patients_path(request.query_parameters), inertia: {errors: error_payload}
    ensure
      Rails.logger.info "Finished process to update the patient details for name: #{@patient.name}."
    end

    private

    def get_patient(id)
      @patient = Patient.includes(:patient_contact, :user).find_by(id:)
    end
  end
end
