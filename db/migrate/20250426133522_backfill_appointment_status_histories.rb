class BackfillAppointmentStatusHistories < ActiveRecord::Migration[8.0]
  def up
    Appointment.find_each do |appointment|
      # Find the most appropriate user (modify this logic based on your actual data)
      # This is an example - you might want to use admin user, therapist, or system user
      user = appointment.therapist&.user || User.first

      # First status entry should have old_status = NULL
      AppointmentStatusHistory.create!(
        appointment_id: appointment.id,
        old_status: nil,  # Explicit NULL for initial state
        new_status: appointment.status,
        reason: appointment.status_reason,
        changed_by: user.id,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at
      )
    end
  end

  def down
    # Remove all historical records created by this migration
    AppointmentStatusHistory.delete_all
  end
end
