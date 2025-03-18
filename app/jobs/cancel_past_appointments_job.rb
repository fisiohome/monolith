class CancelPastAppointmentsJob < ApplicationJob
  queue_as :default

  def perform(*args)
    Appointment
      .where("appointment_date_time < ?", Time.zone.today)
      .where(status: [
        "PENDING THERAPIST ASSIGNMENT",
        "PENDING PATIENT APPROVAL",
        "PENDING PAYMENT"
      ])
      .update_all(status: "CANCELLED")
  end
end
