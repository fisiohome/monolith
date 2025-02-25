class AddNotesToAddresses < ActiveRecord::Migration[8.0]
  def change
    add_column :addresses, :notes, :text, null: true
  end
end
