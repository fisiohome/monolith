module AdminPortal
  # Service to check therapist availability for a specific datetime
  # Handles complex logic including time zones, adjusted schedules, and booking constraints
  #
  # This service performs comprehensive availability checks including:
  # - Time zone conversions for accurate scheduling
  # - Weekly schedule vs adjusted availability (one-time overrides)
  # - Overlapping appointment detection with buffer times
  # - Daily appointment limits and advance booking windows
  # - Location-based scheduling considerations
  class GetTherapistAvailableService
    attr_reader :reasons, :previous_appointment_location, :next_appointment_location

    # Initialize the service with therapist and appointment details
    # @param therapist [Therapist] The therapist to check availability for
    # @param appointment_date_time_server_time [DateTime] The requested appointment time in server timezone
    # @param current_appointment_id [Integer, nil] ID of existing appointment being updated (excluded from conflicts)
    # @param is_all_of_day [Boolean] Whether this is an "all day" booking request (affects validation logic)
    def initialize(therapist:, appointment_date_time_server_time:, current_appointment_id: nil, is_all_of_day: false)
      @therapist = therapist
      @appointment_date_time_server_time = appointment_date_time_server_time
      @current_appointment_id = current_appointment_id
      @is_all_of_day = ActiveModel::Type::Boolean.new.cast(is_all_of_day)
      @schedule = therapist.therapist_appointment_schedule
      @reasons = [] # Collection of reasons why therapist is unavailable
      @previous_appointment_location = nil # Location of previous appointment on same day
      @next_appointment_location = nil # Location of next appointment on same day
      @logger = Rails.logger
    end

    # Main method to check if therapist is available for the requested time
    # Performs all availability checks in sequence and returns overall availability status
    # @return [Boolean] true if available, false otherwise
    def available?
      return log_and_return(false, "No appointment schedule found") if @schedule.blank?

      # Convert dates to therapist's time zone for accurate comparison
      # This ensures we're comparing times in the same timezone context
      therapist_time_zone = @schedule.time_zone.presence || Time.zone.name
      appointment_date_time_in_tz = @appointment_date_time_server_time.in_time_zone(therapist_time_zone)
      current_date_time_in_tz = Time.current.in_time_zone(therapist_time_zone)

      # Reset reasons for each check to ensure clean state
      @reasons.clear

      # Always fetch adjacent appointment addresses to ensure consistent state
      # This helps with location-based scheduling decisions and travel time considerations
      fetch_adjacent_appointment_addresses
      perform_checks(appointment_date_time_in_tz, current_date_time_in_tz)
    end

    # Returns all available time slots for a specific date, considering therapist's schedule, existing appointments, and business rules.
    #
    # This method performs the following steps:
    #   1. Retrieves the therapist's availability ranges for the given date (including adjusted and weekly schedules).
    #   2. Gathers all existing appointments for that date, excluding cancelled/unscheduled and the current appointment (if updating).
    #   3. Checks if the therapist has already reached their daily appointment limit; if so, returns an empty array.
    #   4. Iterates through each available slot in 30-minute increments, checking:
    #      - If the slot is in the past (for today, unless in test env), it is skipped.
    #      - If the slot overlaps with any existing appointment (including buffer), it is skipped.
    #      - Otherwise, the slot is added to the list of available times.
    #   5. Returns an array of available slot start times in 'HH:MM' format.
    #
    # @return [Array<String>] Array of available time slot start times in 'HH:MM' format
    def available_time_slots_for_date
      # 1. Determine the date and therapist's time zone
      date = @appointment_date_time_server_time.to_date
      therapist_time_zone = @schedule.time_zone.presence || Time.zone.name
      slots = get_availability_ranges_for_date
      return [] if slots.empty? # No available ranges for this date

      # 2. Fetch all existing appointments for the date (excluding cancelled/unscheduled/current)
      appointments = @therapist.appointments
        .where(appointment_date_time: date.all_day)
        .where.not(status: ["CANCELLED", "UNSCHEDULED"])
        .where.not(id: @current_appointment_id)
        .to_a

      # 3. Enforce daily appointment limit
      return [] if appointments.size >= @schedule.max_daily_appointments

      duration = @schedule.appointment_duration_in_minutes
      buffer = @schedule.buffer_time_in_minutes
      available_slots = []

      # 4. Determine if we should filter out past slots (for today, unless in test env)
      current_date = Time.current.to_date
      filter_past_slots = (date == current_date) && !Rails.env.test?

      # 5. Iterate through each availability slot for the day
      slots.each do |slot|
        slot_start = slot[:start]
        slot_end = slot[:end]

        # Step through the slot in 30-minute increments
        time = slot_start
        while time <= slot_end
          # 5a. Skip times in the past for today (unless in test env)
          if filter_past_slots && time < Time.current.in_time_zone(therapist_time_zone)
            time += 30.minutes
            next
          end

          # 5b. Calculate the full window for this potential appointment (including buffer)
          appointment_start = time
          appointment_end = appointment_start + duration.minutes
          appointment_end_with_buffer = appointment_end + buffer.minutes
          appointment_range = appointment_start...appointment_end_with_buffer

          # 5c. Check for conflicts with any existing appointment (including their buffer)
          conflict = appointments.any? do |appt|
            appt_start = appt.appointment_date_time
            appt_end = appt_start + appt.total_duration_minutes.minutes
            appt_range = appt_start...appt_end

            # Overlap if the new slot starts before an existing ends, and ends after an existing starts
            appointment_range.begin < appt_range.end && appt_range.begin < appointment_range.end
          end

          # 5d. Add to available slots if no conflict found
          unless conflict
            available_slots << time.strftime("%H:%M")
          end

          time += 30.minutes
        end
      end

      # 6. Return all available slot start times
      available_slots
    end

    private

    # Check if appointment exceeds maximum advance booking window
    # Prevents booking too far in advance to avoid overbooking and schedule changes
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @param current_date_time_in_tz [DateTime] Current time in therapist's timezone
    # @return [Array] [is_valid, error_message]
    def check_advance_booking(appointment_date_time_in_tz, current_date_time_in_tz)
      max_advance_date = current_date_time_in_tz + @schedule.max_advance_booking_in_days.days
      return [false, "Exceeds max advance booking (#{@schedule.max_advance_booking_in_days} days)"] if appointment_date_time_in_tz > max_advance_date

      [true, nil]
    end

    # Check if appointment falls within the configured date window
    # Allows therapists to set specific start/end dates for accepting bookings
    # Useful for temporary availability periods or seasonal scheduling
    # @param date [Date] The appointment date to check
    # @return [Array] [is_valid, error_message]
    def check_date_window(date)
      return [false, "Before start date window (#{@schedule.start_date_window})"] if @schedule.start_date_window && date < @schedule.start_date_window

      return [false, "After end date window (#{@schedule.end_date_window})"] if @schedule.end_date_window && date > @schedule.end_date_window

      [true, nil]
    end

    # Get availability ranges for a specific date
    # Handles both adjusted availability (one-time overrides) and weekly schedules
    #
    # Priority order:
    # 1. Adjusted availability (one-time overrides like holidays, sick days)
    # 2. Weekly schedule (recurring weekly patterns)
    #
    # @param date [Date] The date to get availability for
    # @return [Array<Hash>] Array of availability ranges with start/end times
    def get_availability_ranges_for_date
      date = @appointment_date_time_server_time.to_date
      therapist_time_zone = @schedule.time_zone.presence || Time.zone.name

      # Check for adjusted availability first (one-time overrides)
      # These take precedence over weekly schedules
      adjustments = @schedule.therapist_adjusted_availabilities.select { |adj| adj.specific_date == date }

      if adjustments.any?
        # If any adjustment marks the day as fully unavailable, return no ranges
        return [] if adjustments.any?(&:unavailable?)

        # Otherwise, return ranges from partial adjustments (e.g., half-day)
        return adjustments.map do |adj|
          # Create time objects in therapist's timezone for the specific date
          start_time = Time.use_zone(therapist_time_zone) do
            Time.zone.local(date.year, date.month, date.day, adj.start_time.hour, adj.start_time.min)
          end
          end_time = Time.use_zone(therapist_time_zone) do
            Time.zone.local(date.year, date.month, date.day, adj.end_time.hour, adj.end_time.min)
          end
          {start: start_time, end: end_time}
        end
      end

      # Fallback to weekly schedule if no adjustments for the date
      day_of_week = date.strftime("%A")
      weekly_slots = @schedule.therapist_weekly_availabilities.where(day_of_week: day_of_week)

      weekly_slots.map do |slot|
        # Create new time objects with the target date but the slot's time components
        # Use the therapist's time zone directly to avoid double conversion
        start_time = Time.use_zone(therapist_time_zone) do
          Time.zone.local(date.year, date.month, date.day, slot.start_time.hour, slot.start_time.min, slot.start_time.sec)
        end
        end_time = Time.use_zone(therapist_time_zone) do
          Time.zone.local(date.year, date.month, date.day, slot.end_time.hour, slot.end_time.min, slot.end_time.sec)
        end

        {start: start_time, end: end_time}
      end
    end

    # Execute all availability checks in sequence with early returns
    # Each check must pass for the therapist to be considered available
    #
    # Check order is important for performance and user experience:
    # 1. Basic time checks (fast, common failures)
    # 2. Advance booking (business rule)
    # 3. Date window (business rule)
    # 4. Availability schedule (complex, but necessary)
    # 5. Overlapping appointments (database query)
    # 6. Daily limits (final validation)
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @param current_date_time_in_tz [DateTime] Current time in therapist's timezone
    # @return [Boolean] true if all checks pass, false otherwise
    def perform_checks(appointment_date_time_in_tz, current_date_time_in_tz)
      checks = [
        -> { basic_time_checks(appointment_date_time_in_tz, current_date_time_in_tz) },
        -> { advance_booking_check(appointment_date_time_in_tz, current_date_time_in_tz) },
        -> { date_window_check(appointment_date_time_in_tz.to_date) },
        -> { availability_check(appointment_date_time_in_tz) },
        -> { no_overlapping_appointments_check },
        -> { max_daily_appointments_check(appointment_date_time_in_tz) }
      ]

      checks.each do |check|
        result = check.call
        return false if result == false
      end

      true
    end

    # Check basic time constraints:
    # 1. Appointment date time must be in the future
    # 2. Must meet minimum booking advance requirement (currently disabled)
    #
    # These are the fastest checks and catch common user errors early
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @param current_date_time_in_tz [DateTime] Current time in therapist's timezone
    # @return [Boolean] true if basic time checks pass
    def basic_time_checks(appointment_date_time_in_tz, current_date_time_in_tz)
      is_appointment_today = ->(date_time) { date_time.to_date == Date.current }

      # skip this for checking all of day therapist avaiability and if the appointment date is today date
      return true if is_appointment_today.call(appointment_date_time_in_tz) && @is_all_of_day

      if appointment_date_time_in_tz <= current_date_time_in_tz
        message = "Not available for past dates"
        @logger.debug message
        return add_reason_and_return(false, message)
      end

      # Minimum booking advance feature is currently disabled
      # This was handled manually instead of through the system
      # This formula applies if the appointment date is less than the appt date + min_booking_before_in_hours.
      # TODO: Consider re-enabling this feature if business requirements change
      # min_booking_time = current_date_time_in_tz + @schedule.min_booking_before_in_hours.hours
      # if appointment_date_time_in_tz < min_booking_time
      #   message = "Requires booking at least #{@schedule.min_booking_before_in_hours} hours in advance"
      #   @logger.debug message
      #   add_reason_and_return(false, message)
      # else
      #   true
      # end

      true
    end

    # Check maximum advance booking window
    # Prevents booking too far in advance to avoid overbooking and schedule changes
    # This helps maintain schedule flexibility for therapists
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @param current_date_time_in_tz [DateTime] Current time in therapist's timezone
    # @return [Boolean] true if within advance booking window
    def advance_booking_check(appointment_date_time_in_tz, current_date_time_in_tz)
      max_advance_date = current_date_time_in_tz + @schedule.max_advance_booking_in_days.days
      if appointment_date_time_in_tz > max_advance_date
        message = "Exceeds max advance booking (#{@schedule.max_advance_booking_in_days} days)"
        add_reason_and_return(false, message)
      else
        true
      end
    end

    # Check custom date window constraints
    # Allows therapists to set specific start/end dates for accepting bookings
    # Useful for temporary availability periods, vacations, or seasonal scheduling
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @return [Boolean] true if within date window
    def date_window_check(appointment_date_time_in_tz)
      date = appointment_date_time_in_tz.to_date

      if @schedule.start_date_window && date < @schedule.start_date_window
        message = "Before start date window (#{@schedule.start_date_window})"
        return add_reason_and_return(false, message)
      end

      if @schedule.end_date_window && date > @schedule.end_date_window
        message = "After end date window (#{@schedule.end_date_window})"
        return add_reason_and_return(false, message)
      end

      true
    end

    # Main availability check router
    # Determines whether to check adjusted availability or weekly schedule
    #
    # For all-day bookings, only checks if the day is available (not specific times)
    # For regular bookings, checks if the specific time fits within available slots
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @return [Boolean] true if available according to schedule
    def availability_check(appointment_date_time_in_tz)
      adjusted = @schedule.therapist_adjusted_availabilities.find_by(
        specific_date: appointment_date_time_in_tz.to_date
      )

      if @is_all_of_day
        return check_all_day_adjusted(appointment_date_time_in_tz.to_date, adjusted) if adjusted
        return check_all_day_weekly(appointment_date_time_in_tz.to_date)
      end

      adjusted ? check_adjusted(appointment_date_time_in_tz, adjusted) : check_weekly(appointment_date_time_in_tz)
    end

    # Check all-day availability for adjusted schedule
    # For all-day bookings, we only care if the day is marked as available
    # This is used when therapists want to block out entire days
    # @param date [Date] The date to check
    # @param adjusted [TherapistAdjustedAvailability] The adjusted availability record
    # @return [Boolean] true if day is available for all-day booking
    def check_all_day_adjusted(date, adjusted)
      if adjusted.start_time.blank? || adjusted.end_time.blank?
        message = "Unavailable on #{date} (#{adjusted.reason})"
        return add_reason_and_return(false, message)
      end

      true
    end

    # Check all-day availability for weekly schedule
    # For all-day bookings, we only care if the day has any weekly slots
    # This ensures the day has some availability even if not specific times
    # @param date [Date] The date to check
    # @return [Boolean] true if day has weekly availability
    def check_all_day_weekly(date)
      day_of_week = date.strftime("%A")
      weekly_slots = @schedule.therapist_weekly_availabilities.where(day_of_week: day_of_week)

      if weekly_slots.empty?
        message = "No availability found on #{day_of_week}"
        return add_reason_and_return(false, message)
      end

      true
    end

    # Check adjusted availability for specific dates
    # Handles one-time overrides like holidays, sick days, or modified hours
    # These take precedence over weekly schedules for the specific date
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @param adjusted [TherapistAdjustedAvailability] The adjusted availability record
    # @return [Boolean] true if time fits within adjusted availability
    def check_adjusted(appointment_date_time_in_tz, adjusted)
      if adjusted.start_time.blank? || adjusted.end_time.blank?
        message = "Unavailable on #{appointment_date_time_in_tz.to_date} (#{adjusted.reason})"
        return add_reason_and_return(false, message)
      end

      slot_start = build_time_object(appointment_date_time_in_tz, adjusted.start_time)
      slot_end = build_time_object(appointment_date_time_in_tz, adjusted.end_time)

      if time_fits?(appointment_date_time_in_tz, slot_start, slot_end)
        true
      else
        message = "Outside the adjusted availability hours for #{appointment_date_time_in_tz.to_date}: #{adjusted.start_time}-#{adjusted.end_time}"
        add_reason_and_return(false, message)
      end
    end

    # Check regular weekly availability
    # Handles recurring weekly schedule patterns
    # This is the default availability check when no adjusted schedule exists
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @return [Boolean] true if time fits within weekly availability
    def check_weekly(appointment_date_time_in_tz)
      day_of_week = appointment_date_time_in_tz.strftime("%A")
      weekly_slots = @schedule.therapist_weekly_availabilities.where(
        day_of_week: day_of_week
      )

      if weekly_slots.empty?
        message = "No weekly slots for #{day_of_week}"
        return add_reason_and_return(false, message)
      end

      # Check if the requested time fits within any of the weekly slots
      is_available = weekly_slots.any? do |slot|
        slot_start = build_time_object(appointment_date_time_in_tz, slot.start_time)
        slot_end = build_time_object(appointment_date_time_in_tz, slot.end_time)

        fits = time_fits?(appointment_date_time_in_tz, slot_start, slot_end)
        fits
      end

      if is_available
        true
      else
        available_slots_str = weekly_slots.map { |s| "#{s.start_time.strftime("%H:%M")}-#{s.end_time.strftime("%H:%M")}" }.join(", ")
        message = "Outside weekly availability for #{day_of_week}: #{available_slots_str}"
        add_reason_and_return(false, message)
      end
    end

    # Helper to create time object with date components
    # Combines the appointment date with the time slot's time components
    # This ensures proper timezone handling when creating slot boundaries
    # @param base_time [DateTime] The base appointment time
    # @param time_part [Time] The time component (hour, minute, second)
    # @return [DateTime] Combined date and time
    def build_time_object(base_time, time_part)
      therapist_time_zone = @schedule.time_zone.presence || Time.zone.name
      Time.use_zone(therapist_time_zone) do
        Time.zone.local(base_time.year, base_time.month, base_time.day, time_part.hour, time_part.min, time_part.sec)
      end
    end

    # Verify time fits within a slot
    # Checks if the appointment time falls within the specified slot boundaries
    # Uses inclusive range check (appointment can start at slot start/end)
    # @param appointment_date_time_in_tz [DateTime] The appointment time
    # @param slot_start [DateTime] The slot start time
    # @param slot_end [DateTime] The slot end time
    # @return [Boolean] true if appointment time is within the slot
    def time_fits?(appointment_date_time_in_tz, slot_start, slot_end)
      appointment_date_time_in_tz.between?(slot_start, slot_end)
    end

    # Add a reason for unavailability and return the result
    # Collects failure reasons for better user feedback and debugging
    # Only adds message when result is false (failure case)
    # @param result [Boolean] The availability result
    # @param message [String] The reason message
    # @return [Boolean] The original result
    def add_reason_and_return(result, message)
      @reasons << message unless result
      result
    end

    # Check if therapist has reached maximum daily appointments
    # Prevents overbooking by enforcing daily appointment limits
    # Counts only active appointments (excludes cancelled/unscheduled)
    # @param appointment_date_time_in_tz [DateTime] Appointment time in therapist's timezone
    # @return [Boolean] true if under daily appointment limit
    def max_daily_appointments_check(appointment_date_time_in_tz)
      date = appointment_date_time_in_tz.to_date
      count = @therapist.appointments
        .where(appointment_date_time: date.all_day)
        .where.not(status: ["CANCELLED", "UNSCHEDULED"])
        .count

      if count + 1 > @schedule.max_daily_appointments
        message = "Therapist has reached max daily appointments (#{@schedule.max_daily_appointments})"
        return add_reason_and_return(false, message)
      end
      true
    end

    # Check for overlapping appointments
    # Ensures no double-booking by checking for time conflicts
    #
    # Overlap logic:
    # - New appointment starts before existing ends (including buffer)
    # - New appointment ends after existing starts (including buffer)
    #
    # Uses database-level overlap detection for performance
    # @return [Boolean] true if no overlapping appointments found
    def no_overlapping_appointments_check
      return true unless @schedule

      duration = @schedule.appointment_duration_in_minutes
      buffer = @schedule.buffer_time_in_minutes

      new_start = @appointment_date_time_server_time
      new_end = new_start + duration.minutes
      new_end_with_buffer = new_end + buffer.minutes

      # Find appointments that overlap with the new appointment
      # An appointment overlaps if it starts before the new one ends and ends after the new one starts
      # Uses SQL interval arithmetic for efficient overlap detection
      conflicting_appointments = @therapist.appointments
        .where.not(id: @current_appointment_id)
        .where.not(status: ["CANCELLED", "UNSCHEDULED"])
        .where(
          "(appointment_date_time < ?) AND ((appointment_date_time + (? * interval '1 minute')) > ?)",
          new_end_with_buffer,
          duration + buffer,
          new_start
        )

      if conflicting_appointments.exists?
        times = conflicting_appointments.map { |a| a.appointment_date_time.strftime("%H:%M") }.join(", ")
        message = "Therapist is not available: conflicting appointment(s) at #{times}"
        return add_reason_and_return(false, message)
      end

      true
    end

    # Extract address, latitude, longitude from appointment's location
    # Used for location-based scheduling decisions and travel time considerations
    # Returns nil if appointment has no location information
    # @param appointment [Appointment] The appointment to extract location from
    # @return [Hash, nil] Location details or nil if no location
    def extract_location_details(appointment)
      return nil unless appointment&.address_history&.address_line

      # Get the first address associated with the location
      visit_address = appointment&.address_history
      {
        id: appointment.id,
        registration_number: appointment.registration_number,
        address: visit_address.address_line,
        latitude: visit_address.latitude,
        longitude: visit_address.longitude,
        coordinates: visit_address.coordinates
      }
    end

    # Fetch addresses of the closest previous/next appointments
    # Used for location-based scheduling and travel time considerations
    #
    # This information can be used to:
    # - Optimize appointment ordering for travel efficiency
    # - Calculate travel time between appointments
    # - Provide location context for scheduling decisions
    def fetch_adjacent_appointment_addresses
      return unless @schedule

      # Figure out the date window for "today"
      date = @appointment_date_time_server_time.to_date
      day_range = date.all_day

      # Base scope: same therapist, not cancelled/unscheduled, not the current appt,
      # and only appointments _on the same date_
      appointments_scope = @therapist.appointments
        .where.not(id: @current_appointment_id)
        .where.not(status: ["CANCELLED", "UNSCHEDULED"])
        .where(appointment_date_time: day_range)
        .includes(location: :addresses)

      # Find the closest previous appointment before the current time (last one before the new appointment), on that same day
      previous_appointment = appointments_scope
        .where.not(id: @current_appointment_id)
        .where("appointment_date_time < ?", @appointment_date_time_server_time)
        .order(appointment_date_time: :desc)
        .first

      # Find the closest next appointment after the current time (first one after the new appointment), on that same day
      next_appointment = appointments_scope
        .where("appointment_date_time > ?", @appointment_date_time_server_time)
        .order(appointment_date_time: :asc)
        .first

      # Extract location details for potential use in scheduling decisions
      @previous_appointment_location = extract_location_details(previous_appointment)
      @next_appointment_location = extract_location_details(next_appointment)
    end

    # Log availability check failure and return result
    # Provides debugging information for availability failures
    # Logs at debug level to avoid cluttering production logs
    # @param result [Boolean] The availability result
    # @param message [String] The failure message
    # @return [Boolean] The original result
    def log_and_return(result, message)
      @logger.debug "Availability check failed for therapist #{@therapist.name}: #{message}"
      result
    end
  end
end
