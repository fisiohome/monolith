class MigratePatientMedicalData < ActiveRecord::Migration[8.0]
  def up
    Appointment.find_each do |appointment|
      # Create a corresponding patient medical record if any of these fields contain data.
      if appointment.patient_complaint_description.present? || appointment.patient_condition.present? ||
          appointment.patient_illness_onset_date.present? || appointment.patient_medical_history.present?
        PatientMedicalRecord.create!(
          appointment_id: appointment.id,
          illness_onset_date: appointment.patient_illness_onset_date,
          complaint_description: appointment.patient_complaint_description,
          condition: appointment.patient_condition,
          medical_history: appointment.patient_medical_history
        )
      end
    end
  end

  def down
    # Optionally, reverse the migration if needed.
    PatientMedicalRecord.find_each do |record|
      appointment = Appointment.find(record.appointment_id)
      appointment.update!(
        patient_illness_onset_date: record.illness_onset_date,
        patient_complaint_description: record.complaint_description,
        patient_condition: record.condition,
        patient_medical_history: record.medical_history
      )
    end
  end
end
