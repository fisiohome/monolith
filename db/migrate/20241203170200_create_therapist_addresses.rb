class CreateTherapistAddresses < ActiveRecord::Migration[8.0]
  def change
    create_table :therapist_addresses do |t|
      t.references :therapist, type: :uuid, null: false, foreign_key: true
      t.references :address, null: false, foreign_key: true
      t.boolean :active, default: false

      t.timestamps
    end
    add_index :therapist_addresses, [:therapist_id, :active], unique: true, where: "active = true"
  end
end
