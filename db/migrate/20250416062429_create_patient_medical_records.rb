class CreatePatientMedicalRecords < ActiveRecord::Migration[8.0]
  def change
    create_table :patient_medical_records do |t|
      t.references :appointment, type: :uuid, null: false, foreign_key: true

      t.text :illness_onset_date
      t.text :complaint_description, null: false
      t.text :condition, null: false
      t.text :medical_history

      t.timestamps
    end
  end
end
