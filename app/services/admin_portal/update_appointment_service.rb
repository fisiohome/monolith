module AdminPortal
  class UpdateAppointmentService
    def initialize(appointment, params, user)
      @appointment = appointment
      @original_status = appointment.status
      @appointment_params = params
        .require(:appointment)
        .permit(:therapist_id, :appointment_date_time, :preferred_therapist_gender, :reason)
      @current_user = user
      @updated = false
    end

    def call
      ActiveRecord::Base.transaction do
        validate_paid_requires_therapist
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

    # Enforce that paid appointments must have a therapist when rescheduling
    def validate_paid_requires_therapist
      if @original_status == "paid" && @appointment_params[:therapist_id].blank?
        @appointment.errors.add(
          :therapist_id,
          "must be selected when rescheduling a paid appointment"
        )
        raise ActiveRecord::RecordInvalid.new(@appointment)
      end
    end

    def apply_updates
      attrs = {}

      # 1) Appointment Date/Time
      if @appointment_params.key?(:appointment_date_time)
        attrs[:appointment_date_time] =
          @appointment_params[:appointment_date_time].in_time_zone(Time.zone.name)
      end

      # 2) Therapist Assignment & Status Logic
      if @appointment_params.key?(:therapist_id)
        new_therapist = @appointment_params[:therapist_id]
        attrs[:therapist_id] = new_therapist

        # Only reset status if it hasn’t already been PAID
        unless @original_status == "paid"
          attrs[:status] =
            if new_therapist.present?
              :pending_patient_approval
            else
              :pending_therapist_assignment
            end
        end
      end

      # 3) Preferred Therapist Gender
      if @appointment_params.key?(:preferred_therapist_gender)
        attrs[:preferred_therapist_gender] = @appointment_params[:preferred_therapist_gender]
      end

      # 4) status_reason (user‐provided or default)
      if @appointment_params.key?(:reason) && @appointment_params[:reason].present?
        attrs[:status_reason] = @appointment_params[:reason]
      end

      # Assign everything (but don’t touch the DB yet)
      @appointment.assign_attributes(attrs)

      # Only persist if something actually changed
      if @appointment.changed?
        # If no reason came in, default it now
        @appointment.assign_attributes(status_reason: attrs[:status_reason].presence || "RESCHEDULED")
        # Who made the change
        @appointment.assign_attributes(updater: @current_user)

        @appointment.save!
        @updated = true
      end
    end
  end
end
