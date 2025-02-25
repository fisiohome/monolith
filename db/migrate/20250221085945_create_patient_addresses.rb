class CreatePatientAddresses < ActiveRecord::Migration[8.0]
  def change
    create_table :patient_addresses do |t|
      t.references :patient, type: :uuid, null: false, foreign_key: true
      t.references :address, null: false, foreign_key: true
      t.boolean :active, default: false

      t.timestamps
    end
    add_index :patient_addresses, [:patient_id, :active], unique: true, where: "active = true", name: "index_patient_addresses_on_patient_id_and_active"
  end
end
