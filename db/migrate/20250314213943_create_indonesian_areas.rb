class CreateIndonesianAreas < ActiveRecord::Migration[8.0]
  def change
    create_table :indonesian_areas do |t|
      t.string :code
      t.string :name
      t.string :area_type

      t.timestamps
    end
  end
end
