class CreatePatients < ActiveRecord::Migration[8.0]
  create_enum :gender_enum, ["MALE", "FEMALE"]

  def change
    create_table :patients, id: :uuid do |t|
      t.string :name, null: false
      t.date :date_of_birth, null: false
      t.integer :age, null: false
      t.enum :gender, enum_type: :gender_enum, null: false

      t.timestamps
    end
    add_index :patients, [:name, :date_of_birth, :age, :gender], unique: true, name: "index_unique_patients"
  end
end
