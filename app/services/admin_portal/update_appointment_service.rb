module AdminPortal
  class UpdateAppointmentService
    def initialize(appointment, params, user)
      @appointment = appointment
      @original_status = appointment.status
      @appointment_params = params
        .require(:appointment)
        .permit(:therapist_id, :appointment_date_time, :preferred_therapist_gender, :reason, :is_all_of_day)
      @current_user = user
      @updated = false
    end

    def call
      ActiveRecord::Base.transaction do
        apply_updates
        {success: true, data: @appointment, changed: @updated}
      end
    rescue ActionController::ParameterMissing => e
      {success: false, error: "Missing parameter: #{e.param}", type: "ParameterMissing"}
    rescue ActiveRecord::RecordInvalid => e
      {success: false, error: e.record.errors, type: "RecordInvalid"}
    rescue => e
      {success: false, error: e.message, type: "GeneralError"}
    end

    private

    def apply_updates
      attrs = {}

      # Appointment Date/Time
      date_time_param = @appointment_params[:appointment_date_time]
      attrs[:appointment_date_time] = date_time_param&.in_time_zone(Time.zone.name)

      # Therapist Assignment & Status Logic
      therapist_param = @appointment_params[:therapist_id]
      attrs[:therapist_id] = therapist_param

      # Preferred Therapist Gender
      preferred_therapist_gender_param = @appointment_params[:preferred_therapist_gender]
      attrs[:preferred_therapist_gender] = preferred_therapist_gender_param

      # status_reason (user‐provided or default)
      reason = @appointment_params[:reason]
      attrs[:status_reason] = reason if reason.present?

      # status should stay as-is once the appointment is paid
      attrs[:status] = determine_new_status unless @original_status == "paid"

      # Assign everything (but don’t touch the DB yet)
      @appointment.assign_attributes(attrs)

      # Only persist if something actually changed
      if @appointment.changed?
        # If no reason came in, default it now
        @appointment.assign_attributes(status_reason: attrs[:status_reason].presence || "RESCHEDULED")
        # Who made the change
        @appointment.assign_attributes(updater: @current_user)

        # Ensure we actually have something to update
        if @appointment.valid?(:update)
          @appointment.save!
          @updated = true
        else
          raise ActiveRecord::RecordInvalid.new(@appointment)
        end
      end
    end

    # Determines the new status of the appointment based on the presence of a therapist and date/time.
    # This logic is applied when the original status is not "paid".
    def determine_new_status
      # If a therapist is assigned, the appointment is pending patient approval.
      if @appointment_params[:therapist_id].present?
        :pending_patient_approval
      # If a date/time is set but no therapist is assigned, it's pending therapist assignment.
      elsif @appointment_params[:appointment_date_time].present?
        :pending_therapist_assignment
      # Otherwise, the appointment is unscheduled.
      else
        :unscheduled
      end
    end
  end
end
