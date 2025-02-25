class CreatePatientContacts < ActiveRecord::Migration[8.0]
  def change
    create_table :patient_contacts do |t|
      t.string :contact_name, null: false
      t.string :contact_phone, null: false
      t.string :email
      t.string :miitel_link
      t.references :patient, type: :uuid, null: false, foreign_key: true

      t.timestamps
    end
    add_index :patient_contacts, :email, unique: true
    add_index :patient_contacts, :contact_phone, unique: true
  end
end
