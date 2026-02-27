# frozen_string_literal: true

module AdminPortal
  class PreparationNewAppointmentService
    include ApplicationHelper
    include ServicesHelper
    include LocationsHelper
    include TherapistsHelper
    include AppointmentsHelper
    include AdminPortal::Therapists
    include AdminsHelper

    attr_reader :params

    def initialize(params)
      @params = params
    end

    # retrieves all active locations
    def fetch_locations
      Location.cached_locations
    end

    # retrieves all active services join by the selected location
    def fetch_services
      return if selected_location_id.blank?

      location = Location.includes(services: :packages).find(selected_location_id)

      active_services = location.services
        .joins(:location_services, :packages)
        .where(
          location_services: {active: true},
          services: {active: true},
          packages: {active: true}
        )
        .distinct

      active_services.map do |service|
        deep_transform_keys_to_camel_case(
          serialize_service(
            service,
            only: %i[id code active description name],
            include_packages: true,
            only_packages: %i[id name active number_of_visit]
          )
        )
      end
    end

    # retrieves all therapists available by selected location and service
    def fetch_therapists
      return unless selected_location_id.present? && selected_service_id.present?

      location = Location.includes(:services).find(selected_location_id)
      service = Service.find(selected_service_id)

      # Get employment type filter from params
      employment_type = @params[:employment_type] || "ALL"
      # Get bypass constraints flag from params
      bypass_constraints = @params[:bypass_constraints] || false

      # using the batching
      batch_size = @params[:batch_size] || AdminPortal::Therapists::QueryConfig::DEFAULT_BATCH_SIZE
      extend AdminPortal::Therapists::BatchQueryHelper
      filtered_therapists_in_batches(
        location: location,
        service: service,
        params: @params.merge(employment_type: employment_type, bypass_constraints: bypass_constraints),
        formatter: method(:formatted_therapists),
        batch_size: batch_size
      )

      # ? if wanna not batching filtered processed
      # filtered_therapists(location:, service:, params: @params.merge(employment_type: employment_type, bypass_constraints: bypass_constraints), formatter: method(:formatted_therapists))
    end

    def fetch_options_data
      # Use pluck for patient_genders to avoid loading all records
      patient_genders = Patient.genders.values
      patient_conditions = Appointment::PATIENT_CONDITION
      preferred_therapist_gender = Appointment::PREFERRED_THERAPIST_GENDER
      referral_sources = Appointment::REFERRAL_SOURCES
      fisiohome_partner_names = Appointment::FISIOHOME_PARTNER_NAMES

      deep_transform_keys_to_camel_case({
        patient_genders:,
        patient_conditions:,
        preferred_therapist_gender:,
        referral_sources:,
        fisiohome_partner_names:
      })
    end

    def fetch_patient_list
      return if patient_search_param.blank?

      term = "%#{patient_search_param.strip}%"
      Patient
        .joins(:patient_contact)
        .where(
          "patients.name ILIKE :t OR patient_contacts.email ILIKE :t OR patient_contacts.contact_phone ILIKE :t",
          t: term
        )
        .distinct
        .map { |p| deep_transform_keys_to_camel_case(serialize_patient(p).as_json) }
    end

    def fetch_patient_contact_list
      return if patient_contact_search_param.blank?

      term = "%#{patient_contact_search_param.strip}%"
      PatientContact
        .where(
          "contact_name ILIKE :t OR email ILIKE :t OR contact_phone ILIKE :t",
          t: term
        )
        .distinct
        .map { |p| deep_transform_keys_to_camel_case(p.as_json) }
    end

    def fetch_appointment_reference
      return if appointment_reference_id.blank?

      deep_transform_keys_to_camel_case(
        serialize_appointment(Appointment.find(appointment_reference_id))
      )
    end

    # retrieves all active admins for admin pic selection
    def fetch_admins
      Admin.includes(:user)
        .references(:user)
        .where(
          "users.suspend_at IS NULL OR users.suspend_end IS NOT NULL AND users.suspend_end < ?",
          Time.current
        )
        .map do |admin|
        deep_transform_keys_to_camel_case(
          serialize_admin(
            admin,
            only: %i[id name admin_type]
          )
        )
      end
    end

    private

    def selected_location_id
      @params[:location_id]
    end

    def selected_service_id
      @params[:service_id]
    end

    def patient_search_param
      @params[:patient_query]
    end

    def patient_contact_search_param
      @params[:patient_contact_query]
    end

    def appointment_reference_id
      @params[:reference]
    end

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
  end
end
