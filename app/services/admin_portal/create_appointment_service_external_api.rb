module AdminPortal
  class CreateAppointmentServiceExternalApi
    BOOKING_ENDPOINT = "/api/v1/bookings".freeze

    BANK_PAYMENT = "bank_transfer".freeze

    def initialize(params, user)
      @params = permitted_params(params)
      @current_user = user
    end

    def call
      # Create patient, contact, and address first (committed to DB)
      # so external API can find them by ID
      find_or_initialize_patient
      upsert_patient_contact
      upsert_patient_address

      # Now call external API and handle response
      create_single_booking
    rescue ActionController::ParameterMissing => e
      {success: false, error: "Invalid parameters: #{e.message}", type: "ParameterMissing"}
    rescue ActiveRecord::RecordInvalid => e
      {success: false, error: e.record.errors, type: "RecordInvalid"}
    rescue FisiohomeApi::Client::AuthenticationError => e
      {success: false, error: "Authentication failed: #{e.message}", type: "AuthenticationError"}
    rescue Faraday::Error => e
      {success: false, error: "API request failed: #{e.message}", type: "ApiError"}
    rescue => e
      {success: false, error: e.message, type: "GeneralError"}
    end

    private

    # Creates a single booking via external API
    def create_single_booking
      response = call_booking_api(build_booking_payload)
      handle_api_response(response)
    end

    # Calls the external booking API
    def call_booking_api(payload)
      Rails.logger.info("[CreateAppointmentServiceExternalApi] Calling booking API with payload: #{payload.to_json}")

      FisiohomeApi::Client.post(BOOKING_ENDPOINT, body: payload)
    end

    # Handles the API response and returns standardized result
    def handle_api_response(response, skip_return: false)
      if response.success?
        response_body = response.body
        Rails.logger.info("[CreateAppointmentServiceExternalApi] API response: #{response_body}")

        # Extract booking data from nested "data" key
        appointment_data = response_body["data"] || response_body[:data] || response_body
        Rails.logger.info("[CreateAppointmentServiceExternalApi] Extracted appointment data: #{appointment_data}")

        appointment = find_or_create_local_appointment(appointment_data)

        associate_admins(appointment) if appointment && @params[:admin_ids].present?

        # Return appointment if found locally, otherwise return API response data
        result_data = appointment || appointment_data
        skip_return ? {success: true, data: result_data} : (return {success: true, data: result_data})
      else
        error_message = parse_api_error(response)
        Rails.logger.error("[CreateAppointmentServiceExternalApi] API error: #{error_message}")

        skip_return ? {success: false, error: error_message, type: "ApiError"} : (return {success: false, error: error_message, type: "ApiError"})
      end
    end

    # Builds the booking payload for external API
    def build_booking_payload
      appointment_params = @params[:appointment] || {}

      payload = {
        user_id: @current_user.id,
        patient_id: @patient.id.to_s,
        patient_address_id: @patient_address.id,
        service_id: @params[:service_id].to_i,
        package_id: @params[:package_id].to_i,
        # Medical record fields (matching interface names)
        illness_onset_date: appointment_params[:patient_illness_onset_date],
        complaint_description: appointment_params[:patient_complaint_description],
        condition: appointment_params[:patient_condition],
        medical_history: appointment_params[:patient_medical_history]
      }

      # Optional fields
      payload[:voucher_code] = appointment_params[:voucher_code] if appointment_params[:voucher_code].present?
      payload[:notes] = appointment_params[:notes] if appointment_params[:notes].present?
      payload[:payment_method] = BANK_PAYMENT

      # Build visits array
      visits = []

      # Add first visit from appointment level
      visits << {
        visit_number: 1,
        therapist_id: @params[:therapist_id].present? ? @params[:therapist_id].to_s : nil,
        appointment_date_time: appointment_params[:appointment_date_time]
      }.compact

      # Append series_visits (visits 2+)
      if appointment_params[:series_visits].present?
        appointment_params[:series_visits].each do |visit|
          visits << {
            visit_number: visit[:visit_number],
            therapist_id: visit[:therapist_id].present? ? visit[:therapist_id].to_s : nil,
            appointment_date_time: visit[:appointment_date_time]
          }.compact
        end
      end

      payload[:visits] = visits if visits.present?

      # Legacy fields for backward compatibility
      if appointment_params[:preferred_therapist_gender].present?
        # Transform "NO PREFERENCE" to "OTHER" for external API compatibility
        preferred_gender = (appointment_params[:preferred_therapist_gender] == "NO PREFERENCE") ? "OTHER" : appointment_params[:preferred_therapist_gender]
        payload[:preferred_therapist_gender] = preferred_gender
      end
      payload[:referral_source] = appointment_params[:referral_source] if appointment_params[:referral_source].present?
      payload[:other_referral_source] = appointment_params[:other_referral_source] if appointment_params[:other_referral_source].present?
      payload[:fisiohome_partner_booking] = appointment_params[:fisiohome_partner_booking] unless appointment_params[:fisiohome_partner_booking].nil?
      payload[:fisiohome_partner_name] = appointment_params[:fisiohome_partner_name] if appointment_params[:fisiohome_partner_name].present?
      payload[:other_fisiohome_partner_name] = appointment_params[:other_fisiohome_partner_name] if appointment_params[:other_fisiohome_partner_name].present?

      payload
    end

    # Finds or creates a local appointment record based on API response
    def find_or_create_local_appointment(api_response)
      # The external API returns CreateBookingAppointmentResponse structure with:
      # - registration_number at root level
      # - appointments array with appointment_id for each visit
      # Try to find by first appointment's ID (UUID)
      appointments = api_response["appointments"] || api_response[:appointments] || []
      if appointments.any?
        first_appointment = appointments.first
        appointment_id = first_appointment["appointment_id"] || first_appointment[:appointment_id]

        if appointment_id
          # Retry a few times in case of database sync delay
          appointment = nil
          3.times do |i|
            appointment = Appointment.find_by(id: appointment_id)
            break if appointment
            sleep(0.3)
          end
          return appointment if appointment
        end
      end

      # Fallback: try to find by registration_number
      registration_number = api_response["registration_number"] || api_response[:registration_number]
      Appointment.find_by(registration_number: registration_number) if registration_number
    end

    # Parses error from API response
    def parse_api_error(response)
      body = response.body
      return body["error"] || body["message"] || body.to_s if body.is_a?(Hash)

      body.to_s
    end

    # Associates admin users with the appointment
    def associate_admins(appointment)
      return unless appointment && @params[:admin_ids].present?

      @params[:admin_ids].split(",").each do |admin_id|
        AppointmentAdmin.find_or_create_by!(appointment: appointment, admin_id: admin_id)
      end
    end

    # Finds or initializes a patient based on provided params
    def find_or_initialize_patient
      patient_params = @params[:patient].dup

      if (dob = patient_params[:date_of_birth])
        patient_params[:date_of_birth] = dob&.in_time_zone(Time.zone.name)
      end

      @patient = Patient.find_by(patient_params) || Patient.create!(patient_params)
    end

    # Upserts patient contact information
    def upsert_patient_contact
      return @patient_contact if @patient_contact
      return @patient_contact = @patient.patient_contact if @patient.patient_contact

      cp = @params[:patient_contact].to_h
      return if cp.blank?

      email = cp[:email].to_s.downcase.presence
      phone = cp[:contact_phone].to_s.gsub(/\D/, "").presence

      contact = if email
        PatientContact.find_by(email: email)
      elsif phone
        PatientContact.find_by(contact_phone: phone)
      end

      unless contact
        contact = PatientContact.new(cp)
        contact.save! if contact.changed?
      end

      if @patient.patient_contact != contact
        @patient.update!(patient_contact: contact)
      end

      @patient_contact = contact
    end

    # Upserts patient address
    def upsert_patient_address
      address_params = @params[:patient_address]

      address = Address.find_by(
        location_id: address_params[:location_id],
        latitude: address_params[:latitude],
        longitude: address_params[:longitude]
      )

      if address
        address.assign_attributes(address_params)
        address.save! if address.changed?
      else
        address = Address.create!(address_params)
      end

      existing_patient_address = @patient.patient_addresses.find_by(address: address)
      if existing_patient_address
        existing_patient_address.update!(active: true) unless existing_patient_address.active?
        @patient_address = existing_patient_address
      else
        @patient_address = @patient.patient_addresses.create!(address: address, active: true)
      end
    end

    def permitted_params(params)
      params.require(:appointment).permit(
        :service_id, :package_id, :location_id, :therapist_id, :admin_ids, :reference_appointment_id,
        patient_contact: %i[contact_name contact_phone email miitel_link],
        patient_address: %i[location_id latitude longitude postal_code address notes],
        patient: [:name, :date_of_birth, :gender],
        appointment: [
          :patient_illness_onset_date, :patient_complaint_description, :patient_condition, :patient_medical_history,
          :appointment_date_time, :preferred_therapist_gender,
          :referral_source, :other_referral_source, :fisiohome_partner_booking, :fisiohome_partner_name, :other_fisiohome_partner_name, :voucher_code, :notes,
          series_visits: %i[appointment_date_time therapist_id visit_number]
        ]
      ).to_h.deep_symbolize_keys
    end
  end
end
