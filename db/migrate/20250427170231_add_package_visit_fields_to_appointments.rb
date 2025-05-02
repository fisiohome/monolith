class AddPackageVisitFieldsToAppointments < ActiveRecord::Migration[8.0]
  def change
    change_column_null :appointments, :appointment_date_time, true
    add_column :appointments, :appointment_reference_id, :uuid
    add_column :appointments, :visit_number, :integer, default: 1, null: false
    change_column_default :appointments, :status, from: nil, to: "UNSCHEDULED"
    add_foreign_key :appointments, :appointments, column: :appointment_reference_id
    add_index :appointments, [:appointment_reference_id, :visit_number]
    add_index :appointments, :visit_number
  end
end
