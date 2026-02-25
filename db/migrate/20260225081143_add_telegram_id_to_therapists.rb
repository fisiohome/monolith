class AddTelegramIdToTherapists < ActiveRecord::Migration[8.0]
  def change
    add_column :therapists, :telegram_id, :string
    add_index :therapists, :telegram_id, unique: true
  end
end
