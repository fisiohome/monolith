class RemoveMedicalFieldsFromAppointments < ActiveRecord::Migration[8.0]
  def up
    remove_column :appointments, :patient_illness_onset_date
    remove_column :appointments, :patient_complaint_description
    remove_column :appointments, :patient_condition
    remove_column :appointments, :patient_medical_history
  end

  def down
    add_column :appointments, :patient_illness_onset_date, :text
    add_column :appointments, :patient_complaint_description, :text
    add_column :appointments, :patient_condition, :text
    add_column :appointments, :patient_medical_history, :text
  end
end
