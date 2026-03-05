module AdminPortal
  class UpdatePatientService
    def initialize(patient, params)
      @patient = patient
      @params = permitted_params(params)
      @updated = false
      Rails.logger.info "[UpdatePatientService] Initializing service for patient: #{@patient.id}"
    end

    def call
      Rails.logger.info "[UpdatePatientService] Starting patient update process"
      ActiveRecord::Base.transaction do
        update_patient_contact
        update_profile
        update_patient_address
        create_new_patient_address
        update_active_address if @params[:set_active_address].present?

        Rails.logger.info "[UpdatePatientService] Update completed. Updated: #{@updated}"
        {updated: @updated}
      end
    rescue => e
      Rails.logger.error "[UpdatePatientService] Transaction failed: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      raise
    end

    private

    def update_patient_contact
      cp = @params[:contact]
      Rails.logger.info "[UpdatePatientService] Updating patient contact"
      return unless cp

      # find or initialize the PatientContact
      contact = PatientContact.find_by(id: cp[:id])
      Rails.logger.info "[UpdatePatientService] Found contact: #{contact&.id}" if contact
      contact.assign_attributes(cp)

      # save the contact if needed
      if contact.new_record? || contact.changed?
        Rails.logger.info "[UpdatePatientService] Contact changes: #{contact.changes.inspect}"
        contact.save!
        @updated = true
        Rails.logger.info "[UpdatePatientService] Contact saved successfully"
      else
        Rails.logger.info "[UpdatePatientService] No changes detected in contact"
      end

      # now attach it to @patient and save the patient
      @patient.patient_contact = contact
      if @patient.new_record? || @patient.changed?
        Rails.logger.info "[UpdatePatientService] Patient changes: #{@patient.changes.inspect}"
        @patient.save!
        @updated = true
        Rails.logger.info "[UpdatePatientService] Patient saved successfully"
      end

      @patient_contact = contact
    end

    def update_profile
      pp = @params[:profile]
      Rails.logger.info "[UpdatePatientService] Updating patient profile"
      return unless pp

      # Convert the date of birth using server's timezone
      pp[:date_of_birth] = pp[:date_of_birth].in_time_zone(Time.zone.name)

      # save or attach to the patient
      @patient.assign_attributes(pp)
      if @patient.new_record? || @patient.changed?
        Rails.logger.info "[UpdatePatientService] Profile changes: #{@patient.changes.inspect}"
        @patient.save!
        @updated = true
        Rails.logger.info "[UpdatePatientService] Profile saved successfully"
      else
        Rails.logger.info "[UpdatePatientService] No changes detected in profile"
      end
    end

    def update_patient_address
      pa = @params[:patient_address]
      Rails.logger.info "[UpdatePatientService] Updating patient address"
      Rails.logger.info "[UpdatePatientService] Patient address params: #{pa.inspect}"
      return unless pa

      # Find the patient address
      patient_address = @patient.patient_addresses.find_by(id: pa[:id])
      Rails.logger.info "[UpdatePatientService] Found patient address: #{patient_address&.inspect}"
      return unless patient_address

      # Find the associated address
      address = patient_address.address
      Rails.logger.info "[UpdatePatientService] Found address: #{address.inspect}"
      return unless address

      # Update address attributes
      address.assign_attributes(
        address: pa[:address],
        postal_code: pa[:postal_code],
        latitude: pa[:latitude],
        longitude: pa[:longitude],
        location_id: pa[:location_id],
        notes: pa[:notes]  # Move notes to address model
      )

      Rails.logger.info "[UpdatePatientService] Address changes: #{address.changes.inspect}"
      Rails.logger.info "[UpdatePatientService] Patient address changes: #{patient_address.changes.inspect}"

      # Save if there are changes
      if address.changed? || patient_address.changed?
        address.save! if address.changed?
        patient_address.save! if patient_address.changed?
        @updated = true
        Rails.logger.info "[UpdatePatientService] Address updated successfully"
      else
        Rails.logger.info "[UpdatePatientService] No changes detected in address"
      end
    end

    def create_new_patient_address
      new_pa = @params[:new_patient_address]
      Rails.logger.info "[UpdatePatientService] Creating new patient address"
      Rails.logger.info "[UpdatePatientService] New patient address params: #{new_pa.inspect}"
      return unless new_pa

      # Create new address
      address = Address.new(
        address: new_pa[:address],
        postal_code: new_pa[:postal_code],
        latitude: new_pa[:latitude],
        longitude: new_pa[:longitude],
        location_id: new_pa[:location_id],
        notes: new_pa[:notes]
      )

      Rails.logger.info "[UpdatePatientService] New address: #{address.inspect}"

      # Validate and save the address
      if address.valid?
        address.save!
        Rails.logger.info "[UpdatePatientService] Address created successfully"

        # Create patient address linking the address to the patient
        patient_address = @patient.patient_addresses.build(
          address: address,
          active: false  # New addresses are not active by default
        )

        if patient_address.valid?
          patient_address.save!
          Rails.logger.info "[UpdatePatientService] Patient address link created successfully"
          @updated = true
        else
          Rails.logger.error "[UpdatePatientService] Patient address validation failed: #{patient_address.errors.full_messages.join(", ")}"
          raise ActiveRecord::RecordInvalid, patient_address
        end
      else
        Rails.logger.error "[UpdatePatientService] Address validation failed: #{address.errors.full_messages.join(", ")}"
        raise ActiveRecord::RecordInvalid, address
      end
    end

    def update_active_address
      saa = @params[:set_active_address]
      Rails.logger.info "[UpdatePatientService] Updating active address"
      Rails.logger.info "[UpdatePatientService] Set active address params: #{saa.inspect}"
      return unless saa

      # Find the patient address to activate/deactivate
      patient_address = @patient.patient_addresses.find_by(id: saa[:patient_address_id])
      Rails.logger.info "[UpdatePatientService] Found patient address for active update: #{patient_address&.inspect}"
      return unless patient_address

      # If setting as active, deactivate all other addresses first
      if saa[:active]
        Rails.logger.info "[UpdatePatientService] Deactivating all other addresses"
        @patient.patient_addresses.where.not(id: patient_address.id).update_all(active: false)
        Rails.logger.info "[UpdatePatientService] All other addresses deactivated"
      end

      # Update the active status
      old_active = patient_address.active
      patient_address.update!(active: saa[:active])
      Rails.logger.info "[UpdatePatientService] Address active status changed from #{old_active} to #{saa[:active]}"

      @updated = true
      Rails.logger.info "[UpdatePatientService] Active address updated successfully"
    end

    def permitted_params(params)
      Rails.logger.info "[UpdatePatientService] Processing permitted params"
      permitted = params.require(:patient).permit(
        contact: %i[id contact_name contact_phone email miitel_link],
        profile: %i[id name date_of_birth gender],
        patient_address: %i[id address postal_code latitude longitude location_id notes],
        new_patient_address: %i[address postal_code latitude longitude location_id notes],
        set_active_address: %i[patient_address_id active]
      )
      Rails.logger.info "[UpdatePatientService] Permitted params: #{permitted.inspect}"
      permitted
    end
  end
end
