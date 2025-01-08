class AddUniqueIndexToBankDetails < ActiveRecord::Migration[8.0]
  def change
    add_index :bank_details, [:bank_name, :account_number], unique: true
  end
end
