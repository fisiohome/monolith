class CreateAdmins < ActiveRecord::Migration[8.0]
  def change
    create_table :admins, id: :uuid do |t|
      t.string :admin_type
      t.string :name
      t.references :user, type: :uuid, null: false, foreign_key: true

      t.timestamps
    end
  end
end
