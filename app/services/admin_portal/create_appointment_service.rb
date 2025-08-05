module AdminPortal
  class CreateAppointmentService
    def initialize(params, user)
      @params = permitted_params(params)
      @current_user = user
      @appt_ref = @params[:reference_appointment_id].present? ? Appointment.find(@params[:reference_appointment_id]) : nil
    end

    def call
      ActiveRecord::Base.transaction do
        # Handle series appointments if specified in params
        if @params[:appointment][:series_visits].present?
          create_series_appointments
        # Handle legacy sequential appointments
        elsif @appt_ref.present?
          @appointment = create_sequential_appointments
          create_patient_medical_record_appointment
          associate_admins
          next {success: true, data: @appointment}
        # Standard single appointment
        else
          find_or_initialize_patient
          upsert_patient_contact
          upsert_patient_address
          create_appointment
          create_patient_medical_record_appointment
          associate_admins
          next {success: true, data: @appointment}
        end
      end
    rescue ActionController::ParameterMissing => e
      {success: false, error: "Invalid parameters: #{e.message}", type: "ParameterMissing"}
    rescue ActiveRecord::RecordInvalid => e
      {success: false, error: e.record.errors, type: "RecordInvalid"}
    rescue => e
      {success: false, error: e.message, type: "GeneralError"}
    end

    private

    # Creates a series of appointments based on the provided visit details
    # Expects @params[:appointment][:series_visits] to be an array of visit attributes
    def create_series_appointments
      raise ArgumentError, "Missing series_visits parameter" unless @params[:appointment][:series_visits].is_a?(Array)
      raise ArgumentError, "At least one visit must be provided" if @params[:appointment][:series_visits].empty?

      # Create the first appointment which will be the reference appointment
      find_or_initialize_patient
      upsert_patient_contact
      upsert_patient_address
      create_appointment
      create_patient_medical_record_appointment
      associate_admins

      reference_appointment = @appointment
      # Create the rest of the series
      @params[:appointment][:series_visits].each do |visit_attrs|
        @appointment = Appointment.new(
          reference_appointment.attributes.except(
            "id", "registration_number", "visit_number", "appointment_reference_id",
            "therapist_id", "appointment_date_time", "status", "created_at", "updated_at"
          ).merge(visit_attrs)
        )
        @appointment.appointment_reference_id = reference_appointment.id
        @appointment.visit_number = visit_attrs[:visit_number] if visit_attrs[:visit_number]
        @appointment.appointment_date_time = visit_attrs[:appointment_date_time]&.in_time_zone(Time.zone.name) if visit_attrs[:appointment_date_time]
        @appointment.therapist_id = visit_attrs[:therapist_id] if visit_attrs[:therapist_id]
        @appointment.updater = @current_user
        @appointment.save!

        create_patient_medical_record_appointment
        associate_admins
      end

      {success: true, data: reference_appointment}
    end

    def find_or_initialize_patient
      # Duplicate patient parameters so we can safely modify them.
      patient_params = @params[:patient].dup

      # Convert the date of birth using server's timezone, if present.
      if (dob = patient_params[:date_of_birth])
        patient_params[:date_of_birth] = dob&.in_time_zone(Time.zone.name)
      end

      # Find an existing patient by the given attributes or create a new one.
      @patient = Patient.find_by(patient_params) || Patient.new(patient_params)
    end

    # This method will update the existing patient contact if it exists,
    # or create a new one if it doesn't, and always associate it with @patient.
    def upsert_patient_contact
      return @patient_contact if @patient_contact # memoization
      return @patient_contact = @patient.patient_contact if @patient.patient_contact

      cp = @params[:patient_contact].to_h
      return if cp.blank?

      # Normalize contact details
      email = cp[:email].to_s.downcase.presence
      phone = cp[:contact_phone].to_s.gsub(/\D/, "").presence

      # Try to find existing contact by email or phone
      contact = if email
        PatientContact.find_by(email: email)
      elsif phone
        PatientContact.find_by(contact_phone: phone)
      end

      # If no existing contact found, create a new one
      unless contact
        contact = PatientContact.new(cp)
        contact.save! if contact.changed?
      end

      # Update patient association if needed
      if @patient.patient_contact != contact
        @patient.update!(patient_contact: contact)
      end

      @patient_contact = contact
    end

    def upsert_patient_address
      address_params = @params[:patient_address]

      # Look up an existing Address record matching all address attributes.
      address = Address.find_by(
        location_id: address_params[:location_id],
        latitude: address_params[:latitude],
        longitude: address_params[:longitude]
      )
      if address
        # Update the address record if any attributes differ.
        address.assign_attributes(address_params)
        address.save! if address.changed?
      else
        address = Address.create!(address_params)
      end

      # Look up an existing association between this patient and the found address.
      existing_patient_address = @patient.patient_addresses.find_by(address: address)
      if existing_patient_address
        # Optionally, ensure that the association is marked active.
        existing_patient_address.update!(active: true) unless existing_patient_address.active?
        @patient_address = existing_patient_address
      else
        @patient_address = @patient.patient_addresses.create!(address: address, active: true)
      end
    end

    def associate_admins
      return if @params[:admin_ids].blank?

      @params[:admin_ids].split(",").each do |admin_id|
        AppointmentAdmin.create!(appointment: @appointment, admin_id: admin_id)
      end
    end

    def create_appointment
      # ? currently the status auto generate from appointment model while appointment creation
      # status = @params[:therapist_id].present? ? :pending_patient_approval : :pending_therapist_assignment
      base_attributes = {
        patient: @patient,
        location_id: @params[:location_id],
        service_id: @params[:service_id],
        package_id: @params[:package_id],
        therapist_id: @params[:therapist_id],
        # status:,
        updater: @current_user
      }
      appointment_params = @params[:appointment] || {}

      # Create appointment without medical fields
      appointment_date_time_formatted = appointment_params[:appointment_date_time]&.in_time_zone(Time.zone.name)
      appointment_attrs = base_attributes
        .merge(appointment_params.except(
          :patient_illness_onset_date,
          :patient_complaint_description,
          :patient_condition,
          :patient_medical_history,
          :series_visits
        ))
        .merge(appointment_date_time: appointment_date_time_formatted)

      @appointment = Appointment.create!(appointment_attrs)
    end

    def create_patient_medical_record_appointment
      appointment_params = @params[:appointment] || {}

      # Extract medical fields from appointment params
      medical_attrs = {
        illness_onset_date: appointment_params[:patient_illness_onset_date],
        complaint_description: appointment_params[:patient_complaint_description],
        condition: appointment_params[:patient_condition],
        medical_history: appointment_params[:patient_medical_history]
      }

      @appointment.create_patient_medical_record!(medical_attrs)
    end

    def create_sequential_appointments
      # Get next visit number
      current_max_visit = @appt_ref.series_appointments.maximum(:visit_number) || @appt_ref.visit_number
      next_visit = current_max_visit + 1

      appointment_params = @params[:appointment] || {}
      base_attributes = {
        patient: @appt_ref.patient,
        location: @appt_ref.location,
        service: @appt_ref.service,
        package: @appt_ref.package,
        updater: @current_user,
        appointment_reference_id: @appt_ref.id,
        therapist_id: @params[:therapist_id],
        visit_number: next_visit,
        appointment_date_time: appointment_params[:appointment_date_time]&.in_time_zone(Time.zone.name),
        preferred_therapist_gender: appointment_params[:preferred_therapist_gender],
        notes: appointment_params[:notes]
      }.merge(appointment_params.except(
        :patient_illness_onset_date,
        :patient_complaint_description,
        :patient_condition,
        :patient_medical_history,
        :appointment_date_time,
        :preferred_therapist_gender,
        :notes,
        :series_visits
      ))

      Appointment.create!(base_attributes)
    end

    def permitted_params(params)
      params.require(:appointment).permit(
        # appointemnt reference associations
        :service_id, :package_id, :location_id, :therapist_id, :admin_ids, :reference_appointment_id,
        # contact information
        patient_contact: %i[contact_name contact_phone email miitel_link],
        # address information
        patient_address: %i[location_id latitude longitude postal_code address notes],
        # patient details
        patient: [:name, :date_of_birth, :gender],
        # appointment settings
        appointment: [
          # patient medical record
          :patient_illness_onset_date, :patient_complaint_description, :patient_condition, :patient_medical_history,
          # appointment scheduling
          :appointment_date_time, :preferred_therapist_gender,
          # additional settings
          :referral_source, :other_referral_source, :fisiohome_partner_booking, :fisiohome_partner_name, :other_fisiohome_partner_name, :voucher_code, :notes,
          # series visits
          series_visits: %i[appointment_date_time therapist_id visit_number preferred_therapist_gender]
        ]
      ).to_h.deep_symbolize_keys
    end
  end
end
