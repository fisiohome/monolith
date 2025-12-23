module AdminPortal
  class UpdateAppointmentService
    # Default slot duration constants (in minutes)
    # Total slot = appointment_duration + buffer_time
    DEFAULT_APPOINTMENT_DURATION = 90
    DEFAULT_BUFFER_TIME = 30
    TOTAL_SLOT_DURATION = DEFAULT_APPOINTMENT_DURATION + DEFAULT_BUFFER_TIME # 120 minutes

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
      # Step 1: Validate time collision with same-series visits before applying updates
      new_datetime = @appointment_params[:appointment_date_time]
      if new_datetime.present?
        collision_result = check_series_time_collision(new_datetime)
        if collision_result[:collision]
          return {
            success: false,
            error: collision_result[:message],
            type: "TimeCollision"
          }
        end
      end

      ActiveRecord::Base.transaction do
        # Step 2: Apply the updates
        apply_updates

        # Step 3: Reorder visit numbers if datetime changed and update was successful
        if @updated && @appointment_params[:appointment_date_time].present?
          reorder_series_visit_numbers
        end

        {success: true, data: @appointment.reload, changed: @updated}
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

    # ========================================
    # TIME COLLISION CHECK (Same Series)
    # ========================================
    # Validates that the new appointment time doesn't overlap with other visits
    # in the same series/transaction.
    #
    # Overlap Definition:
    #   Two time slots [A_start, A_end] and [B_start, B_end] overlap if:
    #   A_start < B_end AND A_end > B_start
    #
    # @param new_datetime [DateTime, String] The proposed new appointment datetime
    # @return [Hash] { collision: Boolean, message: String (if collision), conflicting_visit: Appointment (if collision) }
    def check_series_time_collision(new_datetime)
      new_start = parse_datetime(new_datetime)
      return {collision: false} if new_start.blank?

      new_end = new_start + slot_duration_minutes_for_new_visit.minutes

      # Get all visits in the same series (excluding current appointment)
      series_visits = get_series_visits_for_collision_check

      series_visits.each do |visit|
        next if visit.appointment_date_time.blank?

        exist_start = visit.appointment_date_time
        exist_end = exist_start + slot_duration_minutes_for_visit(visit).minutes

        # Overlap detection: ranges intersect if they share any time
        if new_start < exist_end && new_end > exist_start
          formatted_time = exist_start.strftime("%B %d, %Y at %H:%M")
          return {
            collision: true,
            message: "Jadwal bentrok dengan kunjungan lain (Visit #{visit.visit_number}/#{visit.total_package_visits}) " \
                     "pada #{formatted_time}. Perhitungkan durasi 2 jam termasuk buffer.",
            conflicting_visit: visit
          }
        end
      end

      {collision: false}
    end

    # Gets all visits in the same series for collision checking
    # @return [Array<Appointment>] Array of appointments in the same series
    def get_series_visits_for_collision_check
      root = @appointment.reference_appointment || @appointment

      # Include root appointment and all series appointments
      all_visits = [root] + root.series_appointments.to_a

      # Exclude current appointment and filter only scheduled visits
      all_visits.reject { |v| v.id == @appointment.id }
        .select { |v| v.appointment_date_time.present? }
    end

    # ========================================
    # DYNAMIC VISIT REORDERING
    # ========================================
    # After a successful reschedule, reorders all visit_numbers in the series
    # based on chronological order of appointment_date_time.
    #
    # Example:
    #   Before: Visit 3 (Dec 23) moved to Dec 30 (after Visit 5)
    #   After:  Visit 4 & 5 become Visit 3 & 4, original Visit 3 becomes Visit 5
    def reorder_series_visit_numbers
      root = @appointment.reference_appointment || @appointment

      # Get all visits with scheduled datetime
      scheduled_visits = ([root] + root.series_appointments.to_a)
        .select { |v| v.appointment_date_time.present? }

      return if scheduled_visits.empty?

      completed_visits, pending_visits = scheduled_visits.partition(&:status_completed?)
      pending_visits.sort_by!(&:appointment_date_time)
      current_number = completed_visits.map(&:visit_number).compact.max || 0

      # Handle unscheduled visits
      unscheduled_visits = root.series_appointments
        .where(appointment_date_time: nil)
        .where.not(id: scheduled_visits.map(&:id))
        .order(:visit_number)
        .to_a

      # Collect all visits that need reordering
      all_visits_to_reorder = pending_visits + unscheduled_visits

      # First pass: Set temporary negative visit_numbers to avoid unique constraint violations
      all_visits_to_reorder.each_with_index do |visit, index|
        visit.update_column(:visit_number, -(index + 1))
      end

      # Second pass: Assign final visit_numbers based on chronological position
      pending_visits.each do |visit|
        current_number += 1
        visit.update_column(:visit_number, current_number)
      end

      # Assign remaining numbers to unscheduled visits
      next_number = current_number + 1
      unscheduled_visits.each do |visit|
        visit.update_column(:visit_number, next_number)
        next_number += 1
      end
    end

    # Parses datetime from various formats
    # @param datetime [DateTime, String, nil] Input datetime
    # @return [DateTime, nil] Parsed datetime or nil
    def parse_datetime(datetime)
      return nil if datetime.blank?

      case datetime
      when DateTime, Time, ActiveSupport::TimeWithZone
        datetime.in_time_zone(Time.zone.name)
      when String
        Time.zone.parse(datetime)
      end
    end

    # Calculates the total slot duration (appointment + buffer) for a given visit
    # @param visit [Appointment] The appointment visit to calculate duration for
    # @return [Integer] Total duration in minutes, or TOTAL_SLOT_DURATION as fallback
    def slot_duration_minutes_for_visit(visit)
      duration = visit.total_duration_minutes.to_i
      duration.positive? ? duration : TOTAL_SLOT_DURATION
    end

    # Calculates the total slot duration for the new/updated appointment
    # Caches the result to avoid repeated calculations
    # @return [Integer] Total duration in minutes, or TOTAL_SLOT_DURATION as fallback
    def slot_duration_minutes_for_new_visit
      return @slot_duration_minutes_for_new_visit if defined?(@slot_duration_minutes_for_new_visit)

      # If therapist is being assigned/changed, use their schedule
      # Otherwise, use the appointment's current duration
      duration =
        if @appointment_params[:therapist_id].present?
          slot_duration_for_therapist(@appointment_params[:therapist_id])
        else
          @appointment.total_duration_minutes
        end

      fallback_duration = duration.to_i
      @slot_duration_minutes_for_new_visit = fallback_duration.positive? ? fallback_duration : TOTAL_SLOT_DURATION
    end

    # Retrieves the total slot duration (appointment + buffer) for a specific therapist
    # @param therapist_id [Integer] The ID of the therapist
    # @return [Integer] Sum of appointment duration and buffer time in minutes, or 0 if not found
    def slot_duration_for_therapist(therapist_id)
      therapist = Therapist.includes(:therapist_appointment_schedule).find_by(id: therapist_id)
      return 0 unless therapist&.therapist_appointment_schedule

      schedule = therapist.therapist_appointment_schedule
      duration = schedule.appointment_duration_in_minutes.to_i
      buffer = schedule.buffer_time_in_minutes.to_i

      duration + buffer
    end
  end
end
