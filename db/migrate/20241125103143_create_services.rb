class CreateServices < ActiveRecord::Migration[8.0]
  def change
    create_table :services do |t|
      t.string :name, null: false
      t.string :code, null: false
      t.boolean :active, default: false

      t.timestamps
    end
    add_index :services, :name, unique: true
  end
end
