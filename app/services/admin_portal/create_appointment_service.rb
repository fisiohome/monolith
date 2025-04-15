module AdminPortal
  class CreateAppointmentService
    def initialize(params)
      @params = permitted_params(params)
    end

    def call
      ActiveRecord::Base.transaction do
        create_patient
        create_patient_contact
        create_patient_address
        check_appointment_conflicts
        create_appointment
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

    def create_patient
      # Duplicate patient parameters so we can safely modify them.
      patient_params = @params[:patient].dup

      # Convert the date of birth using server's timezone, if present.
      if patient_params[:date_of_birth].present?
        patient_params[:date_of_birth] = patient_params[:date_of_birth]&.in_time_zone(Time.zone.name)
      end

      # Find an existing patient by the given attributes or create a new one.
      @patient = Patient.find_by(@params[:patient]) || Patient.create!(@params[:patient])
    end

    def create_patient_contact
      contact_params = @params[:patient_contact]
      @patient_contact = PatientContact.find_by(
        contact_name: contact_params[:contact_name],
        contact_phone: contact_params[:contact_phone]
      ) || PatientContact.create!(contact_params.merge(patient: @patient))
    end

    def create_patient_address
      address_params = @params[:patient_address]

      # Look up an existing Address record matching all address attributes
      address = Address.find_by(address_params) || Address.create!(address_params)

      # Look up an existing association between this patient and the found address
      @patient_address = @patient.patient_addresses.find_by(address: address) ||
        @patient.patient_addresses.create!(address: address, active: true)
    end

    def associate_admins
      return if @params[:admin_ids].blank?

      @params[:admin_ids].split(",").each do |admin_id|
        AppointmentAdmin.create!(appointment: @appointment, admin_id: admin_id)
      end
    end

    def create_appointment
      base_attributes = {
        patient: @patient,
        location_id: @params[:location_id],
        service_id: @params[:service_id],
        package_id: @params[:package_id],
        therapist_id: @params[:therapist_id],
        status: @params[:therapist_id].present? ? "PENDING PATIENT APPROVAL" : "PENDING THERAPIST ASSIGNMENT"
      }
      appointment_params = @params[:appointment] || {}
      appointment_attrs = base_attributes
        .merge(appointment_params)
        .merge(appointment_date_time: appointment_params[:appointment_date_time]&.in_time_zone(Time.zone.name))
      @appointment = Appointment.create!(appointment_attrs)
    end

    def check_appointment_conflicts
      appointment_time = @params.dig(:appointment, :appointment_date_time)&.in_time_zone(Time.zone.name)
      check_duplicate_time(appointment_time)
      check_overlapping_appointments(appointment_time)
    end

    def check_duplicate_time(appointment_time)
      return unless Appointment.exists?(patient: @patient, appointment_date_time: appointment_time)

      dummy = Appointment.new
      dummy.errors.add(:base, "Patient already has an appointment at this exact time")
      raise ActiveRecord::RecordInvalid.new(dummy)
    end

    def check_overlapping_appointments(new_start_time)
      new_therapist_id = @params[:therapist_id]
      new_duration, new_buffer = if new_therapist_id.present?
        therapist = Therapist.find(new_therapist_id)
        schedule = therapist.therapist_appointment_schedule
        [schedule.appointment_duration_in_minutes, schedule.buffer_time_in_minutes]
      else
        [0, 0]
      end
      new_end_time = new_start_time + (new_duration + new_buffer).minutes

      Appointment.where(patient: @patient).find_each do |existing|
        next if existing.therapist_id.blank?

        existing_schedule = existing.therapist.therapist_appointment_schedule
        existing_duration = existing_schedule.appointment_duration_in_minutes
        existing_buffer = existing_schedule.buffer_time_in_minutes
        existing_end = existing.appointment_date_time + (existing_duration + existing_buffer).minutes

        if overlapping?(new_start_time, new_end_time, existing.appointment_date_time, existing_end)
          dummy = Appointment.new
          # Format time to "April 17, 2025 at 10:15 AM" format
          formatted_time = existing.appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
          dummy.errors.add(:base, "Appointment overlaps with existing appointment at #{formatted_time}")
          raise ActiveRecord::RecordInvalid.new(dummy)
        end
      end
    end

    def overlapping?(start1, end1, start2, end2)
      start1 < end2 && end1 > start2
    end

    def permitted_params(params)
      params.require(:appointment).permit(
        # appointemnt reference associations
        :service_id, :package_id, :location_id, :therapist_id, :admin_ids,
        # contact information
        patient_contact: %i[contact_name contact_phone email miitel_link],
        # address information
        patient_address: %i[location_id latitude longitude postal_code address notes],
        # patient details
        patient: [:name, :date_of_birth, :gender],
        # appointment settings
        appointment: [
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
