module AdminPortal
  class AppointmentStatusUpdaterService
    TRANSITION_METHODS = {
      # "pending_therapist_assignment" => :schedule!,
      "pending_patient_approval" => :assign_therapist!,
      "pending_payment" => :patient_approve!,
      "paid" => :mark_paid!,
      "on_hold" => :hold!,
      "cancelled" => :cancel!
    }.freeze

    def initialize(appointment, updater)
      @appointment = appointment
      @updater = updater
      @errors = []
    end

    attr_reader :errors

    # args: new_status (string), reason (string)
    def call(new_status:, reason:)
      method_name = TRANSITION_METHODS[new_status.downcase]
      unless method_name
        @errors << "Invalid status: #{new_status}"
        return false
      end

      @appointment.transaction do
        @appointment.assign_attributes(status_reason: reason, updater: @updater)

        if @appointment.send(method_name)
          true
        else
          @errors += @appointment.errors.full_messages
          raise ActiveRecord::Rollback
        end
      end
    rescue ActiveRecord::RecordInvalid => e
      @errors += e.record.errors.full_messages
      false
    end
  end
end
