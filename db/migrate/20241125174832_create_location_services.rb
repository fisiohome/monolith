class CreateLocationServices < ActiveRecord::Migration[8.0]
  def change
    create_table :location_services do |t|
      t.references :location, null: false, foreign_key: true
      t.references :service, null: false, foreign_key: true
      t.boolean :active, default: false

      t.timestamps
    end
    add_index :location_services, [:location_id, :service_id], unique: true, name: "index_location_services_on_location_and_service"
  end
end
