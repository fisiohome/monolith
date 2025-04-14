module AdminPortal
  class UpsertTherapistAppointmentScheduleService
    def initialize(params)
      @params = params
    end

    def call
      schedule = TherapistAppointmentSchedule.find_or_initialize_by(therapist_id: schedule_attributes[:therapist_id])
      schedule.assign_attributes(schedule_attributes)

      return result(schedule) unless schedule.valid?

      begin
        ActiveRecord::Base.transaction do
          schedule.save!
          process_weekly_availabilities(schedule)
          process_adjusted_availabilities(schedule)

          # Check for failed imports and rollback transaction if any errors
          if import_errors?
            schedule.errors.add(:base, "Failed to save availabilities due to validation errors.")
            raise ActiveRecord::Rollback
          end
        end
        result(schedule)
      rescue ActiveRecord::RecordInvalid => e
        result(e.record)
      rescue ActiveRecord::Rollback
        result(schedule)
      end
    end

    private

    def schedule_params
      @params.require(:therapist_appointment_schedule).permit(
        :therapist_id,
        :time_zone,
        :appointment_duration_in_minutes,
        :max_advance_booking_in_days,
        :min_booking_before_in_hours,
        :buffer_time_in_minutes,
        :available_now,
        :start_date_window,
        :end_date_window,
        weekly_availabilities: [:day_of_week, :start_time, :end_time],
        adjusted_availabilities: [:specific_date, :start_time, :end_time, :reason]
      )
    end

    def schedule_attributes
      schedule_params
        .except(:weekly_availabilities, :adjusted_availabilities)
        .merge(
          start_date_window: schedule_params[:start_date_window]&.in_time_zone(Time.zone.name),
          end_date_window: schedule_params[:end_date_window]&.in_time_zone(Time.zone.name)
        )
    end

    def weekly_availability_params
      schedule_params[:weekly_availabilities] || []
    end

    def adjusted_availability_params
      schedule_params[:adjusted_availabilities] || []
    end

    def import_errors?
      @weekly_import_errors || @adjusted_import_errors
    end

    def result(schedule)
      # Debugging line can be removed or logged properly
      # puts schedule.errors.inspect

      if schedule.errors.any?
        {success: false, errors: schedule.errors}
      else
        {success: true, schedule: schedule.as_json(include: [:therapist_weekly_availabilities, :therapist_adjusted_availabilities])}
      end
    end

    def process_weekly_availabilities(schedule)
      schedule.therapist_weekly_availabilities.destroy_all
      return if weekly_availability_params.empty?

      weekly_availabilities = weekly_availability_params.map do |wp|
        TherapistWeeklyAvailability.new(wp.merge(
          therapist_appointment_schedule_id: schedule.id
        ))
      end

      result = TherapistWeeklyAvailability.import(
        weekly_availabilities,
        validate: true,
        all_or_none: true # Rollback if any record fails
      )

      # Capture import errors and attach to schedule
      result.failed_instances.each do |failed|
        failed.errors.each do |error|
          schedule.errors.add(:weekly_availabilities, error.message)
        end
      end
      @weekly_import_errors = result.failed_instances.present?
    end

    def process_adjusted_availabilities(schedule)
      schedule.therapist_adjusted_availabilities.destroy_all
      return if adjusted_availability_params.empty?

      adjusted_availabilities = adjusted_availability_params.map do |ap|
        TherapistAdjustedAvailability.new(ap.merge(
          therapist_appointment_schedule_id: schedule.id,
          # * save date in the app timezone
          specific_date: ap[:specific_date]&.in_time_zone(Time.zone.name)
        ))
      end

      result = TherapistAdjustedAvailability.import(
        adjusted_availabilities,
        validate: true,
        all_or_none: true # Rollback if any record fails
      )

      # Capture import errors and attach to schedule
      result.failed_instances.each do |failed|
        failed.errors.each do |error|
          schedule.errors.add(:adjusted_availabilities, error.message)
        end
      end
      @adjusted_import_errors = result.failed_instances.present?
    end
  end
end
