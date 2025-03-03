module AdminPortal
  class GetTherapistAvailableService
    attr_reader :reasons, :previous_appointment_location, :next_appointment_location

    # Service to check therapist availability for a specific datetime
    # Handles complex logic including time zones, adjusted schedules, and booking constraints
    def initialize(therapist, appointment_date_time_server_time)
      @therapist = therapist
      @appointment_date_time_server_time = appointment_date_time_server_time
      @schedule = therapist.therapist_appointment_schedule
      @reasons = []
      @previous_appointment_location = nil
      @next_appointment_location = nil
      @logger = Rails.logger
    end

    def available?
      return log_and_return(false, "No appointment schedule found") if @schedule.blank?

      # Convert dates to therapist's time zone
      therapist_time_zone = @schedule.time_zone.presence || Time.zone.name
      appointment_date_time_in_tz = @appointment_date_time_server_time.in_time_zone(therapist_time_zone)
      current_date_time_in_tz = Time.current.in_time_zone(therapist_time_zone)

      # Reset reasons for each check
      @reasons.clear

      fetch_adjacent_appointment_addresses
      perform_checks(appointment_date_time_in_tz, current_date_time_in_tz)
    end

    private

    # Perform checks in sequence with early returns
    def perform_checks(appointment_date_time_in_tz, current_date_time_in_tz)
      @logger.debug "Finding the therapist available for #{@therapist.name} at #{appointment_date_time_in_tz}"
      [
        -> { basic_time_checks(appointment_date_time_in_tz, current_date_time_in_tz) },
        -> { advance_booking_check(appointment_date_time_in_tz, current_date_time_in_tz) },
        -> { date_window_check(appointment_date_time_in_tz) },
        -> { availability_check(appointment_date_time_in_tz) },
        -> { no_overlapping_appointments_check }
      ].each do |check|
        result = check.call
        return result if result == false # Stop on first failure
      end

      true
    end

    # Check basic time constraints:
    # 1. Appointment date time must be in the future
    # 2. Must meet minimum booking advance requirement
    def basic_time_checks(appointment_date_time_in_tz, current_date_time_in_tz)
      if appointment_date_time_in_tz <= current_date_time_in_tz
        message = "Not available for past dates"
        @logger.debug message
        add_reason_and_return(false, message)
      end

      # ? turn off this feature, so the minimal booking time was handled manually
      # min_booking_time = current_date_time_in_tz + @schedule.min_booking_before_in_hours.hours
      # if appointment_date_time_in_tz < min_booking_time
      #   message = "Requires booking at least #{@schedule.min_booking_before_in_hours} hours in advance"
      #   @logger.debug message
      #   add_reason_and_return(false, message)
      # else
      #   true
      # end
    end

    # Check maximum advance booking window
    def advance_booking_check(appointment_date_time_in_tz, current_date_time_in_tz)
      max_advance_date = current_date_time_in_tz + @schedule.max_advance_booking_in_days.days
      if appointment_date_time_in_tz > max_advance_date
        message = "Exceeds max advance booking (#{@schedule.max_advance_booking_in_days} days)"
        @logger.debug message
        add_reason_and_return(false, message)
      else
        true
      end
    end

    # Check custom date window constraints
    def date_window_check(appointment_date_time_in_tz)
      date = appointment_date_time_in_tz.to_date

      if @schedule.start_date_window && date < @schedule.start_date_window
        message = "Before start date window (#{@schedule.start_date_window})"
        @logger.debug message
        return add_reason_and_return(false, message)
      end

      if @schedule.end_date_window && date > @schedule.end_date_window
        message = "After end date window (#{@schedule.end_date_window})"
        @logger.debug message
        return add_reason_and_return(false, message)
      end

      true
    end

    # Main availability check router
    def availability_check(appointment_date_time_in_tz)
      adjusted = @schedule.therapist_adjusted_availabilities.find_by(
        specific_date: appointment_date_time_in_tz.to_date
      )

      adjusted ? check_adjusted(appointment_date_time_in_tz, adjusted) : check_weekly(appointment_date_time_in_tz)
    end

    # Check adjusted availability for specific dates
    def check_adjusted(appointment_date_time_in_tz, adjusted)
      if adjusted.start_time.blank? || adjusted.end_time.blank?
        message = "Unavailable on #{appointment_date_time_in_tz.to_date} (#{adjusted.reason})"
        @logger.debug message
        return add_reason_and_return(false, message)
      end

      slot_start = build_time_object(appointment_date_time_in_tz, adjusted.start_time)
      slot_end = build_time_object(appointment_date_time_in_tz, adjusted.end_time)

      if time_fits?(appointment_date_time_in_tz, slot_start, slot_end)
        true
      else
        message = "Outside the availability hours, #{appointment_date_time_in_tz.to_date}: #{adjusted.start_time}-#{adjusted.end_time} (#{adjusted.reason})"
        @logger.debug message
        add_reason_and_return(false, message)
      end
    end

    # Check regular weekly availability
    def check_weekly(appointment_date_time_in_tz)
      day_of_week = appointment_date_time_in_tz.strftime("%A")
      weekly_slots = @schedule.therapist_weekly_availabilities.where(
        day_of_week: day_of_week
      )

      message = "No weekly slots for #{day_of_week}"
      @logger.debug message
      return add_reason_and_return(false, message) if weekly_slots.empty?

      weekly_slots.any? do |slot|
        slot_start = build_time_object(appointment_date_time_in_tz, slot.start_time)
        slot_end = build_time_object(appointment_date_time_in_tz, slot.end_time)

        if time_fits?(appointment_date_time_in_tz, slot_start, slot_end)
          true
        else
          message = "Weekly slot for #{day_of_week} mismatch: #{slot_start}-#{slot_end}"
          @logger.debug message
          add_reason_and_return(false, message)
        end
      end
    end

    # Helper to create time object with date components
    def build_time_object(base_time, time_part)
      base_time.change(
        hour: time_part.hour,
        min: time_part.min,
        sec: time_part.sec
      )
    end

    # Verify time fits
    def time_fits?(appointment_date_time_in_tz, slot_start, slot_end)
      fits = appointment_date_time_in_tz.between?(slot_start, slot_end)

      unless fits
        @logger.debug "Time doesn't fit in slot: #{appointment_date_time_in_tz} in #{slot_start}-#{slot_end}"
      end

      fits
    end

    def add_reason_and_return(result, message)
      @reasons << message unless result
      result
    end

    def no_overlapping_appointments_check
      return true unless @schedule # Guard clause if schedule is missing

      duration = @schedule.appointment_duration_in_minutes
      buffer = @schedule.buffer_time_in_minutes

      new_start_server = @appointment_date_time_server_time
      new_end_plus_buffer_server = new_start_server + (duration + buffer).minutes

      # Check for overlapping appointments, excluding cancelled ones
      conflicting_appointments = @therapist.appointments
        .where.not(status: "cancelled") # Adjust statuses as needed
        .where("appointment_date_time < ?", new_end_plus_buffer_server)
        .where("appointment_date_time + (? * INTERVAL '1 minute') > ?", duration + buffer, new_start_server)

      if conflicting_appointments.exists?
        conflicting_times = conflicting_appointments.pluck(:appointment_date_time).map { |t| t.strftime("%H:%M") }.join(", ")
        message = "Therapist is not available because they have another appointment at: #{conflicting_times}, conflicting with the requested time."
        @logger.debug message
        add_reason_and_return(false, message)
      else
        true
      end
    end

    # Extract address, latitude, longitude from appointment's location
    def extract_location_details(appointment)
      return nil unless appointment&.location

      # Get the first address associated with the location
      address = appointment.location.addresses.first
      return nil unless address

      {
        address: address.address,
        latitude: address.latitude,
        longitude: address.longitude,
        coordinates: address.coordinates
      }
    end

    # Fetch addresses of the closest previous/next appointments
    def fetch_adjacent_appointment_addresses
      return unless @schedule

      # Eager load location and addresses to avoid N+1 queries
      appointments_scope = @therapist.appointments
        .where.not(status: "cancelled")
        .includes(location: :addresses)

      # Find the previous appointment (last one before the new appointment)
      previous_appointment = appointments_scope
        .where("appointment_date_time < ?", @appointment_date_time_server_time)
        .order(appointment_date_time: :desc)
        .first

      # Find the next appointment (first one after the new appointment)
      next_appointment = appointments_scope
        .where("appointment_date_time > ?", @appointment_date_time_server_time)
        .order(appointment_date_time: :asc)
        .first

      # Extract location details
      @previous_appointment_location = extract_location_details(previous_appointment)
      @next_appointment_location = extract_location_details(next_appointment)
    end

    def log_and_return(result, message)
      @logger.debug "Availability check failed for therapist #{@therapist.name}: #{message}"
      result
    end
  end
end
