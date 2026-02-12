class CreateAppointmentDraftAdmins < ActiveRecord::Migration[8.0]
  def change
    create_table :appointment_draft_admins do |t|
      t.references :appointment_draft, null: false, foreign_key: true
      t.references :admin, null: false, type: :uuid, foreign_key: true
      t.boolean :is_primary, default: false, null: false

      t.timestamps
    end

    add_index :appointment_draft_admins, [:appointment_draft_id, :admin_id], unique: true
    add_index :appointment_draft_admins, :is_primary
  end
end
