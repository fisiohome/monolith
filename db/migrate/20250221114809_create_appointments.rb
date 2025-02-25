class CreateAppointments < ActiveRecord::Migration[8.0]
  def change
    create_table :appointments, id: :uuid do |t|
      t.references :therapist, type: :uuid, foreign_key: true
      t.references :patient, type: :uuid, null: false, foreign_key: true
      t.references :service, null: false, foreign_key: true
      t.references :package, null: false, foreign_key: true
      t.references :location, null: false, foreign_key: true

      t.string :registration_number, null: false
      t.string :status, null: false
      t.datetime :appointment_date_time, null: false
      t.string :preferred_therapist_gender, null: false
      t.text :patient_illness_onset_date
      t.text :patient_complaint_description, null: false
      t.text :patient_condition, null: false
      t.text :patient_medical_history
      t.string :referral_source
      t.string :other_referral_source
      t.boolean :fisiohome_partner_booking, null: false, default: false
      t.string :fisiohome_partner_name
      t.string :other_fisiohome_partner_name
      t.string :voucher_code
      t.text :notes

      t.timestamps
    end
    add_index :appointments, :registration_number, unique: true
  end
end
