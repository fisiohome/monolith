class AddStatusReasonToAppointments < ActiveRecord::Migration[8.0]
  def change
    add_column :appointments, :status_reason, :text
  end
end
