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
      Location.all.map do |location|
        deep_transform_keys_to_camel_case(
          serialize_location(
            location,
            only: %i[id city country country_code state]
          )
        )
      end
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
      location = Location.find(selected_location_id)
      service = Service.find(selected_service_id)

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
      patient_genders = Patient.genders.map { |key, value| value }
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

      # Convert to an array to filter and map in Ruby
      therapists.to_a.filter_map do |therapist|
        details = therapist.availability_details(appointment_date_time)

        # You could add a condition here if you want to exclude non-available therapists.
        # if details[:available]
        formatted_therapists(therapist, details)
        # end
      end
    end
  end
end
