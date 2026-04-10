class AddStatusReasonToAppointmentDrafts < ActiveRecord::Migration[8.0]
  def change
    add_column :appointment_drafts, :status_reason, :string
  end
end
