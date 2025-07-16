module AdminPortal
  class PreparationNewAppointmentService
    include ApplicationHelper
    include ServicesHelper
    include LocationsHelper
    include TherapistsHelper
    include AppointmentsHelper

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

      location = Location.find(selected_location_id)
      active_services = location.services
        .joins(:location_services)
        .where(location_services: {active: true})
        .where(active: true)
        .distinct
        .includes(:packages)
        .where(packages: {active: true})

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

      # Eager-load location and service in a single query to minimize DB hits
      location, service = Location.includes(:services).find(selected_location_id), Service.find(selected_service_id)

      # Determine location_ids for therapist filtering
      location_ids =
        if location.city == "KOTA ADM. JAKARTA PUSAT"
          Location.where(state: "DKI JAKARTA").pluck(:id)
        else
          [location.id]
        end

      always_include_names = [
        "Riswanda Khoiruddin Imawan",
        "Muhammad Fajri Ramadhana",
        "Satya Liwa Marliando",
        "Nanda Riezki Fajri"
      ]

      # Build base scope for therapists to DRY up includes/joins
      base_therapist_scope = Therapist
        .joins(:service, active_therapist_address: {address: :location})
        .includes(
          :appointments,
          therapist_appointment_schedule: [
            :therapist_weekly_availabilities,
            :therapist_adjusted_availabilities
          ]
        )
        .where(service: service)
        .where(employment_status: "ACTIVE")
        .where.not("addresses.latitude = 0 OR addresses.longitude = 0")
        .distinct

      # Query always-include therapists and normal therapists in a single query, then merge
      therapists = base_therapist_scope.where(
        (location.state == "DKI JAKARTA") ?
          ["(therapists.name IN (?) OR addresses.location_id IN (?) OR locations.city = ?)", always_include_names, location_ids, "KOTA ADM. JAKARTA PUSAT"] :
          ["(therapists.name IN (?) OR addresses.location_id IN (?))", always_include_names, location_ids]
      )

      # Remove duplicates by id (since always_include_names may overlap with location filter)
      therapists = therapists.uniq { |t| t.id }

      # Gender filtering (in-memory if small, or DB if possible)
      selected_preferred_therapist_gender = @params[:preferred_therapist_gender]
      therapists = apply_gender_filter(therapists, selected_preferred_therapist_gender)

      # Availability filtering
      selected_appointment_date_time = @params[:appointment_date_time]
      if selected_appointment_date_time.present?
        apply_availability_filter(therapists, selected_appointment_date_time)
      else
        therapists.map { |therapist| formatted_therapists(therapist) }
      end
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
      appointment_date_time = Time.zone.parse(param_value)
      therapists.to_a.filter_map do |therapist|
        details = therapist.availability_details(
          appointment_date_time_server_time: appointment_date_time,
          is_all_of_day:
        )
        formatted_therapists(therapist, details)
      end
    end
  end
end
