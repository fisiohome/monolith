class RemoveAgeFromPatient < ActiveRecord::Migration[8.0]
  def change
    remove_column :patients, :age, :integer
  end
  add_index :patients, [:name, :date_of_birth, :gender], unique: true, name: "index_unique_patients"
end
