class CancelPastAppointmentsJob < ApplicationJob
  queue_as :default

  def perform(*args)
    appointments = Appointment
      .where("appointment_date_time < ?", Time.zone.today)
      .where(status: [
        "PENDING THERAPIST ASSIGNMENT",
        "PENDING PATIENT APPROVAL",
        "PENDING PAYMENT"
      ])

    appointments.find_each do |appointment|
      service = AdminPortal::AppointmentStatusUpdaterService.new(appointment, system_updater)
      unless service.call(new_status: "cancelled", reason: "Automatically cancelled: appointment was in the past and not confirmed.")
        Rails.logger.warn "Failed to auto-cancel appointment #{appointment.id}: #{service.errors.join(", ")}"
      end
    end
  end

  private

  # System user for audit purposes
  def system_updater
    @system_updater ||= User.find_by!(email: "tech@fisiohome.id")
  end
end
