class BackfillPatientContactId < ActiveRecord::Migration[8.0]
  def up
    say_with_time "Back-filling patients.patient_contact_id" do
      Patient.reset_column_information
      PatientContact.reset_column_information

      PatientContact.find_each do |contact|
        next unless contact.patient_id
        Patient.where(id: contact.patient_id)
          .update_all(patient_contact_id: contact.id)
      end
    end
  end

  def down
    # no-op, or optionally reverse if you really want:
    say_with_time "Clearing back-filled patients.patient_contact_id" do
      Patient.reset_column_information
      Patient.find_each do |patient|
        next unless patient.patient_contact_id
        PatientContact.where(id: patient.patient_contact_id)
          .update_all(patient_id: patient.id)
      end
    end
  end
end
