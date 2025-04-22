class CreateAppointmentAddressHistories < ActiveRecord::Migration[8.0]
  def change
    create_table :appointment_address_histories do |t|
      t.references :appointment, type: :uuid, null: false, foreign_key: true
      t.references :location, null: false, foreign_key: true

      t.float :latitude, null: false
      t.float :longitude, null: false
      t.text :address_line, null: false
      t.string :postal_code, null: false
      t.text :notes, null: true

      # Postgres "point" column
      t.point :coordinates, null: false

      t.timestamps
    end
  end
end
