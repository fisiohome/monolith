class CreateAppointmentDrafts < ActiveRecord::Migration[8.0]
  def change
    create_table :appointment_drafts do |t|
      t.references :admin_pic, null: false, type: :uuid, foreign_key: {to_table: :admins}
      t.references :created_by_admin, null: false, type: :uuid, foreign_key: {to_table: :admins}
      t.string :current_step
      t.jsonb :form_data, default: {}
      t.integer :status, default: 0, null: false
      t.references :appointment, null: true, type: :uuid, foreign_key: true
      t.datetime :expires_at

      t.timestamps
    end

    add_index :appointment_drafts, :status
    add_index :appointment_drafts, :expires_at
  end
end
