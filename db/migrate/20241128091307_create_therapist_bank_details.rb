class CreateTherapistBankDetails < ActiveRecord::Migration[8.0]
  def change
    create_table :therapist_bank_details do |t|
      t.references :therapist, type: :uuid, null: false, foreign_key: true
      t.references :bank_detail, null: false, foreign_key: true
      t.boolean :active, default: false

      t.timestamps
    end
    add_index :therapist_bank_details, [ :therapist_id, :active ], unique: true, where: "active = true"
  end
end
