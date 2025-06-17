module AdminPortal
  class UpdatePatientService
    def initialize(patient, params)
      @patient = patient
      @params = permitted_params(params)
      @updated = false
    end

    def call
      ActiveRecord::Base.transaction do
        update_patient_contact
        update_profile

        {updated: @updated}
      end
    end

    private

    def update_patient_contact
      cp = @params[:contact]

      # find or initialize the PatientContact
      contact = PatientContact.find_by(id: cp[:id])
      contact.assign_attributes(cp)

      # save the contact if needed
      if contact.new_record? || contact.changed?
        contact.save!
        @updated = true
      end

      # now attach it to @patient and save the patient
      @patient.patient_contact = contact
      if @patient.new_record? || @patient.changed?
        @patient.save!
        @updated = true
      end

      @patient_contact = contact
    end

    def update_profile
      pp = @params[:profile]

      # Convert the date of birth using server's timezone
      pp[:date_of_birth] = pp[:date_of_birth].in_time_zone(Time.zone.name)

      # save or attach to the patient
      @patient.assign_attributes(pp)
      if @patient.new_record? || @patient.changed?
        @patient.save!
        @updated = true
      end
    end

    def permitted_params(params)
      params.require(:patient).permit(
        contact: %i[id contact_name contact_phone email miitel_link],
        profile: %i[id name date_of_birth gender]
      )
    end
  end
end
