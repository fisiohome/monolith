class RemoveAgeFromPatient < ActiveRecord::Migration[8.0]
  def change
    remove_column :patients, :age, :integer
  end
end
