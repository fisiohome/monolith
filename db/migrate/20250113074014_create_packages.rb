class CreatePackages < ActiveRecord::Migration[8.0]
  def change
    create_table :packages do |t|
      t.references :service, null: false, foreign_key: true
      t.string :name, null: false
      t.boolean :active, null: false, default: false
      t.string :currency, null: false
      t.integer :number_of_visit, null: false, default: 1
      t.numeric :price_per_visit, null: false
      t.numeric :discount
      t.numeric :total_price, null: false
      t.numeric :fee_per_visit, null: false
      t.numeric :total_fee, null: false

      t.timestamps
    end
  end
end
