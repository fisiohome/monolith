module PatientsHelper
  def serialize_patient(patient, options = {})
    patient.as_json(only: options[:only]).tap do |patient_serialized|
      # Serialize patient contact details
      if options.fetch(:include_patient_contact, true) && patient.patient_contact.present?
        patient_serialized["contact"] = patient.patient_contact.as_json(only: options[:patient_contact_only])
      end

      # Serialize the active address (if any)
      if options.fetch(:include_active_address, true) && patient.active_address.present?
        patient_serialized["active_address"] = patient.active_address.as_json(only: options[:active_address_only])
      end

      # Serialize patient addresses with their associated address record
      if options.fetch(:include_patient_addresses, false) && patient.patient_addresses.present?
        patient_serialized["patient_addresses"] = patient.patient_addresses.map do |pa|
          pa.as_json(only: options[:patient_addresses_only]).merge(
            "address" => pa.address.as_json(only: options[:address_only])
          )
        end
      end

      # Optionally include all addresses (direct through the association)
      if options.fetch(:include_addresses, false) && patient.addresses.present?
        patient_serialized["addresses"] = patient.addresses.as_json(only: options[:addresses_only])
      end

      # Optionally include associated therapists (through appointments)
      if options.fetch(:include_therapists, false) && patient.therapists.present?
        patient_serialized["therapists"] = patient.therapists.as_json(only: options[:therapists_only])
      end
    end
  end
end
