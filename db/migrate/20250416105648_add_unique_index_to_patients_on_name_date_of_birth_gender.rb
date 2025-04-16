class AddUniqueIndexToPatientsOnNameDateOfBirthGender < ActiveRecord::Migration[8.0]
  def change
    add_index :patients, [:name, :date_of_birth, :gender], unique: true
  end
end
