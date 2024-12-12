class CreateTherapists < ActiveRecord::Migration[8.0]
  def change
    create_enum :gender_enum, [ "MALE", "FEMALE" ]
    create_enum :employment_type_enum, [ "KARPIS", "FLAT" ]
    create_enum :employment_status_enum, [ "ACTIVE", "HOLD", "INACTIVE" ]

    create_table :therapists, id: :uuid do |t|
      t.string :name, null: false
      t.string :phone_number, null: false
      t.string :registration_number, null: false
      t.enum :gender, enum_type: :gender_enum, null: false
      t.integer :batch, null: false
      t.string :specialization, array: true, default: []
      t.string :modality, array: true, default: []
      t.enum :employment_type, enum_type: :employment_type_enum, null: false
      t.enum :employment_status, enum_type: :employment_status_enum, null: false
      t.references :user, type: :uuid, null: false, foreign_key: true

      t.timestamps
    end
    add_index :therapists, :phone_number, unique: true
    add_index :therapists, :registration_number, unique: true
    add_index :therapists, :specialization, using: "gin"
    add_index :therapists, :modality, using: "gin"
  end
end
