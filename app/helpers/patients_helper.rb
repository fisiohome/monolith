module PatientsHelper
  include LocationsHelper

  def serialize_patient(patient, options = {})
    patient.as_json(only: options[:only]).tap do |patient_serialized|
      # Serialize patient contact details
      if options.fetch(:include_patient_contact, true) && patient.patient_contact.present?
        patient_serialized["contact"] = patient.patient_contact.as_json(only: options[:patient_contact_only])
      end

      # Serialize the active address (if any)
      if options.fetch(:include_active_address, true) && patient.active_address.present?
        addr = patient.active_address
        patient_serialized["active_address"] = addr
          .as_json(only: options[:active_address_only])
          .merge(
            "location" => serialize_location(addr.location, only: options[:location_only])
          )
      end

      # Serialize patient addresses with their associated address record
      if options.fetch(:include_patient_addresses, false) && patient.patient_addresses.present?
        patient_serialized["patient_addresses"] = patient.patient_addresses.map do |pa|
          pa.as_json(only: options[:patient_addresses_only]).merge(
            "address" => pa.address.as_json(only: options[:address_only]).merge(
              "location" => serialize_location(pa.address.location, only: options[:location_only])
            )
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

      # Optionally include all medical records for this patient
      if options.fetch(:include_patient_medical_records, false)
        records = patient.patient_medical_records
        if records.any?
          patient_serialized["patient_medical_records"] = records.as_json(only: options[:patient_medical_record_only])
        end
      end

      patient_serialized.merge!(age: patient.age)
    end
  end
end
