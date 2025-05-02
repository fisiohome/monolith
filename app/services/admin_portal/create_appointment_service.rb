module AdminPortal
  class CreateAppointmentService
    def initialize(params, user)
      @params = permitted_params(params)
      @current_user = user
      @appt_ref = @params[:reference_appointment_id].present? ? Appointment.find(@params[:reference_appointment_id]) : nil
    end

    def call
      ActiveRecord::Base.transaction do
        # create the visit series
        if @appt_ref.present?
          @appointment = create_sequential_appointments

          create_patient_medical_record_appointment
          associate_admins

          next {success: true, data: @appointment}
        end

        find_or_initialize_patient
        upsert_patient_contact
        upsert_patient_address
        create_appointment
        create_patient_medical_record_appointment
        associate_admins

        {success: true, data: @appointment}
      end
    rescue ActionController::ParameterMissing => e
      {success: false, error: "Invalid parameters: #{e.message}", type: "ParameterMissing"}
    rescue ActiveRecord::RecordInvalid => e
      {success: false, error: e.record.errors, type: "RecordInvalid"}
    rescue => e
      {success: false, error: e.message, type: "GeneralError"}
    end

    private

    def find_or_initialize_patient
      # Duplicate patient parameters so we can safely modify them.
      patient_params = @params[:patient].dup

      # Convert the date of birth using server's timezone, if present.
      if patient_params[:date_of_birth].present?
        date_of_birth_formatted = patient_params[:date_of_birth]&.in_time_zone(Time.zone.name)
        patient_params[:date_of_birth] = date_of_birth_formatted
      end

      # Find an existing patient by the given attributes or create a new one.
      @patient = Patient.find_by(patient_params) || Patient.create!(patient_params)
    end

    def upsert_patient_contact
      contact_params = @params[:patient_contact]

      # Find a patient contact based on unique identifiers such as contact name and phone.
      existing_contact = PatientContact.find_by(
        contact_name: contact_params[:contact_name],
        contact_phone: contact_params[:contact_phone]
      )

      if existing_contact
        # Merge patient association into the parameters (if applicable).
        existing_contact.assign_attributes(contact_params.merge(patient: @patient))
        existing_contact.save! if existing_contact.changed?
        @patient_contact = existing_contact
      else
        # Create new contact with the patient association.
        @patient_contact = PatientContact.create!(contact_params.merge(patient: @patient))
      end
    end

    def upsert_patient_address
      address_params = @params[:patient_address]

      # Look up an existing Address record matching all address attributes.
      address = Address.find_by(
        location_id: address_params[:location_id],
        postal_code: address_params[:postal_code],
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
          :patient_medical_history
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
        :notes
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
          :referral_source, :other_referral_source, :fisiohome_partner_booking, :fisiohome_partner_name, :other_fisiohome_partner_name, :voucher_code, :notes
        ]
      ).to_h.deep_symbolize_keys
    end
  end
end
