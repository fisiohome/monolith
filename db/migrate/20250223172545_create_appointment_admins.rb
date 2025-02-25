class CreateAppointmentAdmins < ActiveRecord::Migration[8.0]
  def change
    create_table :appointment_admins do |t|
      t.references :admin, type: :uuid, null: false, foreign_key: true
      t.references :appointment, type: :uuid, null: false, foreign_key: true

      t.timestamps
    end
  end
end
