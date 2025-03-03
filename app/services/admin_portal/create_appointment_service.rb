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
        status: @params[:therapist_id].present? ? "BOOKED" : "PENDING THERAPIST ASSIGNMENT"
      }
      appointment_params = @params[:appointment] || {}
      appointment_attrs = base_attributes.merge(appointment_params)
      @appointment = Appointment.create!(appointment_attrs)
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
        patient: [:name, :date_of_birth, :age, :gender],
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
