class BackfillCompleteStatusToAppointments < ActiveRecord::Migration[8.0]
  def up
    # Backfill: Update all appointments with status 'paid' to 'complete'
    say_with_time "Starting to backfill appointments from 'paid' to 'completed'" do
      Appointment.where(status: :paid).find_each(batch_size: 1000) do |appointment|
        # Create a transaction to ensure both updates happen or neither does
        ActiveRecord::Base.transaction do
          # Update the appointment status
          appointment.update_column(:status, :completed)

          # Find a suitable user for the changed_by field
          # This could be a system user or the last user who modified the appointment
          user_id = find_suitable_user_id(appointment)

          # Create status history record
          AppointmentStatusHistory.create!(
            appointment_id: appointment.id,
            old_status: "PAID",
            new_status: "COMPLETED",
            reason: "Marking completed appointments",
            changed_by: user_id,
            # Use the same timestamp as when the appointment was marked as paid
            created_at: appointment.updated_at,
            updated_at: appointment.updated_at
          )
        end
      end
    end
  end

  def down
    # Revert: Update all appointments with status 'complete' back to 'paid'
    say_with_time "Reverting appointments from 'completed' to 'paid'" do
      Appointment.where(status: :completed).find_each(batch_size: 1000) do |appointment|
        ActiveRecord::Base.transaction do
          # Update the appointment status
          appointment.update_column(:status, :paid)

          # Find a suitable user for the changed_by field
          user_id = find_suitable_user_id(appointment)

          # Create status history record for the reversion
          AppointmentStatusHistory.create!(
            appointment_id: appointment.id,
            old_status: "COMPLETED",
            new_status: "PAID",
            reason: "Reverting to paid status",
            changed_by: user_id,
            created_at: Time.current,
            updated_at: Time.current
          )
        end
      end
    end
  end

  private

  def find_suitable_user_id(appointment)
    # Try to find the last user who modified this appointment's status
    last_history = AppointmentStatusHistory.where(appointment_id: appointment.id)
      .order(created_at: :desc)
      .first

    if last_history
      return last_history.changed_by
    end

    # If no history exists, try to use an super admin user
    User.find_by!(email: "tech@fisiohome.id").id
  end
end
