class CancelPastAppointmentsJob < ApplicationJob
  queue_as :default

  # System user for audit purposes
  SYSTEM_UPDATER = User.find_by(email: "tech@fisiohome.id")

  def perform(*args)
    appointments = Appointment
      .where("appointment_date_time < ?", Time.zone.today)
      .where(status: [
        "PENDING THERAPIST ASSIGNMENT",
        "PENDING PATIENT APPROVAL",
        "PENDING PAYMENT"
      ])

    appointments.find_each do |appointment|
      # Set attributes before cancellation to ensure business logic is respected
      appointment.updater = SYSTEM_UPDATER
      appointment.status_reason = "Automatically cancelled: appointment was in the past and not confirmed."

      # Call cancel! which will handle all business logic and callbacks
      unless appointment.cancel!
        Rails.logger.warn "Failed to auto-cancel appointment #{appointment.id}: #{appointment.errors.full_messages.join(", ")}"
      end
    end
  end
end
