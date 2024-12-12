class CreateTherapistRegistrationCounters < ActiveRecord::Migration[8.0]
  def change
    create_table :therapist_registration_counters do |t|
      t.string :service_code, null: false
      t.integer :last_number, default: 0, null: false

      t.timestamps
    end
    add_index :therapist_registration_counters, :service_code, unique: true
  end
end
