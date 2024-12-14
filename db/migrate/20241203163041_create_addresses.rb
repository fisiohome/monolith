class CreateAddresses < ActiveRecord::Migration[8.0]
  def change
    create_table :addresses do |t|
      t.references :location, null: false, foreign_key: true
      t.float :latitude, null: false
      t.float :longitude, null: false
      t.text :address, null: false
      t.string :postal_code, null: false
      t.float :coordinates, default: [], array: true

      t.timestamps
    end
  end
end
