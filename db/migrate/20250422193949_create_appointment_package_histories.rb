class CreateAppointmentPackageHistories < ActiveRecord::Migration[8.0]
  def change
    create_table :appointment_package_histories do |t|
      t.references :appointment, type: :uuid, null: false, foreign_key: true
      t.references :package, null: false, foreign_key: true

      t.string :name, null: false
      t.string :currency, null: false
      t.integer :number_of_visit, null: false, default: 1
      t.decimal :price_per_visit, null: false
      t.decimal :discount
      t.decimal :total_price, null: false
      t.decimal :fee_per_visit, null: false
      t.decimal :total_fee, null: false

      t.timestamps
    end
  end
end
