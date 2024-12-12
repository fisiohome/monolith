class CreateLocations < ActiveRecord::Migration[8.0]
  def change
    create_table :locations do |t|
      t.string :country, null: false
      t.string :country_code, null: false
      t.string :state, null: false
      t.string :city, null: false

      t.timestamps
    end
    add_index :locations, :city, unique: true
  end
end
