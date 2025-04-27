module AdminPortal
  class AppointmentStatusUpdaterService
    def initialize(appointment)
      @appointment = appointment
      @errors = []
    end

    # args: new_status (string), reason (string)
    def call(new_status:, reason:)
      Appointment.transaction do
        @appointment.update!(status: new_status, status_reason: reason)
      end
      true
    rescue ActiveRecord::RecordInvalid => e
      @errors = e.record.errors.full_messages
      false
    end
  end
end
