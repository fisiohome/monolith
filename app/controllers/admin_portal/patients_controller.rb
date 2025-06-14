module AdminPortal
  class PatientsController < ApplicationController
    include PatientsHelper
    include AppointmentsHelper

    def index
      page = params.fetch(:page, 1)
      limit = params.fetch(:limit, 10)
      selected_param = params[:details]
      patient_search = params[:text]
      filter_by_city = params[:city]

      # * get the patients collections
      patients_collections = Patient.joins(:patient_contact).search(patient_search).by_city(filter_by_city).distinct
      @pagy, @patients = pagy(patients_collections, page:, limit:)
      patients_data = @patients.map { |p| serialize_patient(p, {include_active_address: false}) }

      # * get the selected patient
      selected_patient_lambda = lambda do
        return nil unless selected_param

        get_patient
        deep_transform_keys_to_camel_case(
          serialize_patient(
            @patient,
            {include_patient_addresses: true, include_active_address: false}
          )
        )
      end

      # * get the selected patient appointments
      selected_patient_appts_lambda = lambda do
        return nil unless selected_param

        Appointment
          .includes(:therapist, :patient, :service, :package, :location, :admins)
          .initial_visits
          .where(patient_id: selected_param)
          .map { |a| deep_transform_keys_to_camel_case(serialize_appointment(a)) }
      end

      # * for get the filter options
      filter_options_lambda = lambda do
        locations = Location.cached_locations.as_json

        deep_transform_keys_to_camel_case({locations:})
      end

      render inertia: "AdminPortal/Patient/Index", props: deep_transform_keys_to_camel_case({
        patients: {
          metadata: pagy_metadata(@pagy),
          data: patients_data
        },
        selected_patient: InertiaRails.defer { selected_patient_lambda.call },
        selected_patient_appts: InertiaRails.defer { selected_patient_appts_lambda.call },
        filter_options: InertiaRails.defer { filter_options_lambda.call }
      })
    end

    private

    def get_patient
      selected_param = params[:details] || params[:id]
      @patient = Patient.includes(:patient_contact).find_by(id: selected_param)
    end
  end
end
