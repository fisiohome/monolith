class CreateBankDetails < ActiveRecord::Migration[8.0]
  def change
    create_table :bank_details do |t|
      t.string :bank_name, null: false
      t.string :account_number, null: false
      t.string :account_holder_name, null: false

      t.timestamps
    end
  end
end
