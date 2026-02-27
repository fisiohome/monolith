require "test_helper"

class AvailabilityServiceTest < ActiveSupport::TestCase
  # ---------------------------------------------------------------------------
  # Test Setup
  # ---------------------------------------------------------------------------

  def setup
    # Create base test data that will be used across multiple tests
    @therapist = therapists(:therapist_one)
    @schedule = therapist_appointment_schedules(:schedule_for_therapist_one)
    @appointment_date_time = 1.day.from_now

    # Ensure correct weekly availabilities for Monday
    @schedule.therapist_weekly_availabilities.destroy_all
    [
      {start: [9, 0], end: [12, 0]},
      {start: [13, 0], end: [16, 0]},
      {start: [17, 0], end: [18, 0]}
    ].each do |slot|
      @schedule.therapist_weekly_availabilities.create!(
        day_of_week: "Monday",
        start_time: Time.zone.local(2000, 1, 1, *slot[:start]),
        end_time: Time.zone.local(2000, 1, 1, *slot[:end])
      )
    end

    # Remove all adjusted availabilities for the schedule
    @schedule.therapist_adjusted_availabilities.destroy_all

    # Reload the schedule to ensure the weekly availabilities are loaded
    @schedule.reload

    # Initialize the service with default parameters
    @service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: @appointment_date_time
    )
  end

  # ---------------------------------------------------------------------------
  # Basic Availability Tests
  # These tests verify fundamental availability logic
  # ---------------------------------------------------------------------------

  # Test: Therapist is available when all conditions are met (Monday, 10 AM)
  # This is the happy path - all constraints are satisfied
  test "should be available when all conditions are met" do
    appointment_time = next_monday_at(10, 0)
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_time
    )
    assert service.available?
    assert_empty service.reasons
  end

  # Test: Therapist with no schedule should not be available
  # Edge case: therapist exists but has no appointment schedule configured
  test "should not be available when therapist has no schedule" do
    therapist_without_schedule = therapists(:therapist_two)
    therapist_without_schedule.therapist_appointment_schedule&.destroy

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: therapist_without_schedule,
      appointment_date_time_server_time: @appointment_date_time
    )
    refute service.available?
    # Note: No reasons are added in this case, just logs
  end

  # Test: Therapist is not available for past dates
  # Business rule: Cannot book appointments in the past
  test "should not be available for past dates" do
    past_time = 1.hour.ago
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: past_time
    )
    refute service.available?
    assert_includes service.reasons, "Not available for past dates"
  end

  # Test: Not available when appointment exceeds max advance booking days
  # Business rule: Cannot book too far in advance (prevents overbooking)
  test "should not be available when exceeds max advance booking" do
    # Create a time that's beyond the allowed advance booking period
    future_time = (@schedule.max_advance_booking_in_days + 1).days.from_now
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: future_time
    )

    refute service.available?
    assert_includes service.reasons, "Exceeds max advance booking (#{@schedule.max_advance_booking_in_days} days)"
  end

  # ---------------------------------------------------------------------------
  # Window Constraints Tests
  # These tests verify date window restrictions (start/end date windows)
  # ---------------------------------------------------------------------------

  # Test: Not available if appointment is before start date window
  # Business rule: Therapists can set a future start date for accepting bookings
  test "should not be available before start date window" do
    window_schedule = therapist_appointment_schedules(:window_schedule)
    # Set window to start 5 days from now
    window_schedule.update(start_date_window: Date.current + 5.days, end_date_window: Date.current + 30.days)
    window_schedule.reload

    # Try to book 2 days from now (before the window starts)
    appointment_time = Date.current + 2.days
    fail "Test setup error: appointment_time >= start_date_window" if window_schedule.start_date_window && appointment_time >= window_schedule.start_date_window

    therapist = window_schedule.therapist
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: therapist,
      appointment_date_time_server_time: appointment_time.to_time.change(hour: 10, min: 0)
    )
    refute service.available?
    assert service.reasons.any? { |reason| reason.include?("Before start date window") }
  end

  # Test: Not available if appointment is after end date window
  # Business rule: Therapists can set an end date after which they stop accepting bookings
  test "should not be available after end date window" do
    window_schedule = therapist_appointment_schedules(:window_schedule)
    # Set window to end 3 days from now
    window_schedule.update(start_date_window: Date.current, end_date_window: Date.current + 3.days, max_advance_booking_in_days: 30)
    window_schedule.reload

    # Try to book 10 days from now (after the window ends)
    appointment_time = Date.current + 10.days
    fail "Test setup error: appointment_time <= end_date_window" if window_schedule.end_date_window && appointment_time <= window_schedule.end_date_window

    therapist = window_schedule.therapist
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: therapist,
      appointment_date_time_server_time: appointment_time.to_time.change(hour: 10, min: 0)
    )
    refute service.available?
    assert service.reasons.any? { |reason| reason.include?("After end date window") }
  end

  # ---------------------------------------------------------------------------
  # Weekly Slot Logic Tests
  # These tests verify weekly availability patterns (day of week + time slots)
  # ---------------------------------------------------------------------------

  # Test: Not available when no weekly slots exist for the requested day
  # Business rule: Each day of the week can have different availability patterns
  test "should not be available when no weekly slots exist" do
    # Test on a day that doesn't have weekly availability (e.g., Tuesday)
    appointment_time = next_tuesday_at(10, 0)
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_time
    )
    refute service.available?
    assert service.reasons.any? { |r| r.include?("No weekly slots for #{appointment_time.strftime("%A")}") }
  end

  # Test: Not available when time is outside weekly slot
  # Business rule: Even on available days, specific time windows apply
  test "should not be available when time is outside weekly slot" do
    # Test Monday at 8 AM (outside 9 AM - 12 PM slot)
    appointment_time = next_monday_at(8, 0)
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_time
    )
    refute service.available?
    assert service.reasons.any? { |reason| reason.include?("Outside weekly availability for Monday") }

    # Test Monday at 12:30 PM (between 12:00 and 13:00 slots)
    appointment_time_between = next_monday_at(12, 30)
    service_between = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_time_between
    )
    refute service_between.available?
    assert service_between.reasons.any? { |reason| reason.include?("Outside weekly availability for Monday") }
  end

  # Test: Should be available when time fits within weekly slot
  # Happy path: Requested time falls within configured weekly availability
  test "should be available when time fits within weekly slot" do
    # Test Monday at 10 AM (within 9 AM - 12 PM slot)
    appointment_time = next_monday_at(10, 0)
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_time
    )
    assert service.available?
  end

  # Test: Should handle time zone conversion correctly
  # Edge case: Therapist and server may be in different time zones
  test "should handle time zone conversion correctly" do
    @schedule.update(time_zone: "America/New_York")
    @schedule.reload
    @therapist.reload
    @schedule = @therapist.therapist_appointment_schedule

    # Recreate weekly availabilities for the new time zone
    @schedule.therapist_weekly_availabilities.destroy_all
    [
      {start: [9, 0], end: [12, 0]},
      {start: [13, 0], end: [16, 0]},
      {start: [17, 0], end: [18, 0]}
    ].each do |slot|
      @schedule.therapist_weekly_availabilities.create!(
        day_of_week: "Monday",
        start_time: Time.zone.local(2000, 1, 1, *slot[:start]),
        end_time: Time.zone.local(2000, 1, 1, *slot[:end])
      )
    end

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: next_monday_at(10, 0)
    )

    # Should still work correctly with time zone conversion
    assert service.available?
  end

  # Test: Should handle multiple weekly slots on the same day
  # Business rule: A single day can have multiple time slots (e.g., morning and afternoon)
  test "should handle multiple weekly slots" do
    # Use existing Monday slots from fixtures (morning and afternoon)

    # Test appointment in first slot (9 AM - 12 PM)
    service_1 = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: next_monday_at(10, 0)
    )
    assert service_1.available?

    # Test appointment in second slot (1 PM - 4 PM)
    appointment_time_14 = next_monday_at(14, 0)
    service_2 = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_time_14
    )
    assert service_2.available?

    # Test appointment between slots (12:30 PM) - should be unavailable
    service_3 = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: next_monday_at(12, 30)
    )
    available = service_3.available?
    refute available
    assert service_3.reasons.any? { |reason| reason.include?("Outside weekly availability for Monday") }
  end

  # ---------------------------------------------------------------------------
  # Adjusted Availability Tests
  # These tests verify one-time availability overrides (holidays, sick days, etc.)
  # ---------------------------------------------------------------------------

  # Test: Not available when adjusted availability is set to unavailable
  # Business rule: Therapists can mark specific dates as completely unavailable
  test "should not be available when adjusted availability is set to unavailable" do
    # Create adjusted availability directly for the test date
    adjusted_date = next_monday_at(10, 0).to_date
    @schedule.therapist_adjusted_availabilities.create!(
      specific_date: adjusted_date,
      start_time: nil,
      end_time: nil,
      reason: "Holiday"
    )

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: next_monday_at(10, 0)
    )

    refute service.available?
    # Check for any message containing "Unavailable on" and the date
    assert service.reasons.any? { |reason| reason.include?("Unavailable on #{adjusted_date}") }
  end

  # Test: Should be available when adjusted availability has valid times
  # Business rule: Therapists can modify hours for specific dates (e.g., half-day)
  test "should be available when adjusted availability has valid times" do
    # Create adjusted availability directly for the test date
    adjusted_date = next_monday_at(10, 0).to_date
    therapist_tz = @schedule.time_zone || Time.zone.name
    start_time = Time.use_zone(therapist_tz) { Time.zone.local(2000, 1, 1, 9, 0) }
    end_time = Time.use_zone(therapist_tz) { Time.zone.local(2000, 1, 1, 12, 0) }
    @schedule.therapist_adjusted_availabilities.create!(
      specific_date: adjusted_date,
      start_time: start_time,
      end_time: end_time,
      reason: "Half day"
    )

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: next_monday_at(10, 0) # 10 AM
    )

    assert service.available?
  end

  # Test: Not available when time is outside adjusted availability
  # Business rule: Even on adjusted dates, time constraints still apply
  test "should not be available when time is outside adjusted availability" do
    # Create adjusted availability directly for the test date
    adjusted_date = next_monday_at(10, 0).to_date
    @schedule.therapist_adjusted_availabilities.create!(
      specific_date: adjusted_date,
      start_time: Time.zone.parse("09:00"),
      end_time: Time.zone.parse("12:00"),
      reason: "Half day"
    )

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: next_monday_at(8, 0) # 8 AM
    )

    refute service.available?
    # Check for any message containing "Outside the availability hours"
    assert service.reasons.any? { |reason| reason.include?("Outside the adjusted availability hours") }
  end

  # ---------------------------------------------------------------------------
  # Max Daily Appointments Tests
  # These tests verify daily appointment limits
  # ---------------------------------------------------------------------------

  # Test: Should be available for all-of-day when therapist has weekly availability
  # Business rule: "All of day" bookings bypass time slot restrictions
  test "should be available for all-of-day when therapist has weekly availability" do
    appointment_time = next_monday_at(9, 0)
    @schedule.update!(appointment_duration_in_minutes: 60, buffer_time_in_minutes: 0, max_daily_appointments: 10)

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_time,
      is_all_of_day: true
    )

    assert service.available?, "Therapist should be available for all-of-day on Monday"
  end

  # Test: Not available for all-of-day on past dates
  # Business rule: Even "all of day" bookings cannot be in the past
  test "should not be available for all-of-day on past dates" do
    past_time = 1.day.ago

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: past_time,
      is_all_of_day: true
    )

    refute service.available?, "Therapist should not be available for past dates"
    assert_includes service.reasons, "Not available for past dates"
  end

  # Test: Not available when therapist has reached max daily appointments
  # Business rule: Prevent overbooking by enforcing daily appointment limits
  test "should not be available when therapist has reached max daily appointments" do
    schedule = @therapist.therapist_appointment_schedule
    appointment_date = next_monday_at(10, 0).to_date

    # Set max daily appointments to 4 for this test
    schedule.update!(max_daily_appointments: 4)

    # Create exactly the maximum allowed appointments (4 appointments)
    create_max_daily_appointments(@therapist, schedule, appointment_date)

    @therapist.reload

    # After creating max allowed appointments, try to book a new appointment
    # Use a time within the weekly availability windows (9:00-12:00, 13:00-16:00, 17:00-18:00)
    # Ensure the time is in the future in therapist's time zone
    future_time = next_monday_at(9, 0)
    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: future_time
    )
    available = service.available?
    refute available, "Therapist should not be available after reaching max daily appointments"
    assert service.reasons.any? { |reason| reason.include?("has reached max daily appointments") }
  end

  # ---------------------------------------------------------------------------
  # Time Slot Generation Tests
  # These tests verify the available_time_slots_for_date method
  # ---------------------------------------------------------------------------

  # Test: Should generate correct time slots for a full day without appointments
  # Business rule: Generate 30-minute intervals within availability windows
  test "should generate correct time slots for full day without appointments" do
    appointment_date = next_monday_at(9, 0).to_date

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_date.to_time.change(hour: 9, min: 0)
    )

    slots = service.available_time_slots_for_date

    # Should include slots from all three availability windows:
    # 09:00-12:00, 13:00-16:00, 17:00-18:00
    # With 90-minute appointments, last possible start times are:
    # 09:00-12:00: 10:30 (10:30+90min=12:00)
    # 13:00-16:00: 14:30 (14:30+90min=16:00)
    # 17:00-18:00: 17:00 (17:00+90min=18:30, but window ends at 18:00, so only 17:00)
    expected_slots = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", # 09:00-12:00
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", # 13:00-16:00
      "17:00", "17:30", "18:00" # 17:00-18:00
    ]

    assert_equal expected_slots, slots
  end

  # Test: Should respect appointment duration and buffer when calculating overlaps
  # Business rule: New appointments must not overlap with existing appointments including buffer
  test "should respect appointment duration and buffer when calculating overlaps" do
    appointment_date = next_monday_at(9, 0).to_date

    # Create appointment with 60 min duration + 30 min buffer = 90 min total
    # Appointment at 13:00 should block until 14:30
    create_appointment(
      therapist: @therapist,
      appointment_date_time: appointment_date.to_time.change(hour: 13, min: 0),
      duration: 60,
      buffer: 30,
      seq: 4
    )

    service = AdminPortal::Therapists::AvailabilityService.new(
      therapist: @therapist,
      appointment_date_time_server_time: appointment_date.to_time.change(hour: 9, min: 0)
    )

    slots = service.available_time_slots_for_date

    # 14:00 is available, 14:30 is available
    assert_includes slots, "14:00"
    assert_includes slots, "14:30"
  end

  # ---------------------------------------------------------------------------
  # Helper Methods
  # These methods support the test cases above
  # ---------------------------------------------------------------------------

  # Helper: Create an appointment with specific duration and buffer
  # @param therapist [Therapist] The therapist for the appointment
  # @param appointment_date_time [DateTime] The appointment time
  # @param duration [Integer] Duration in minutes
  # @param buffer [Integer] Buffer time in minutes
  # @param seq [Integer] Sequence number for uniqueness
  # @return [Appointment] The created appointment
  def create_appointment(therapist:, appointment_date_time:, duration:, buffer:, seq: nil)
    # Update the therapist's schedule to match the test requirements
    schedule = therapist.therapist_appointment_schedule
    schedule.update!(
      appointment_duration_in_minutes: duration,
      buffer_time_in_minutes: buffer
    )

    # Use a sequence for uniqueness if provided
    uniq = seq || SecureRandom.hex(4)

    Appointment.create!(
      therapist: therapist,
      patient: Patient.create!(
        name: "Test Patient #{uniq}",
        date_of_birth: "2000-01-01",
        gender: "MALE",
        patient_contact: PatientContact.create!(
          contact_name: "Test Patient #{uniq}",
          contact_phone: "6289172123#{uniq}",
          email: "testpatient#{uniq}@yopmail.com"
        )
      ),
      service: Service.first,
      package: Package.first,
      location: Location.first,
      appointment_date_time: appointment_date_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: {
        complaint_description: "Test complaint",
        illness_onset_date: "2024-01-01",
        condition: "NORMAL",
        medical_history: "None"
      },
      status: "pending_patient_approval"
    )
  end

  # Returns the next Monday at the given hour/minute in the future
  # Ensures the returned time is in the future to avoid past date issues
  def next_monday_at(hour, minute)
    today = Date.current
    # Find the next Monday (including today if today is Monday)
    date = today
    date += 1.day until date.monday?
    therapist_tz = @schedule&.time_zone || Time.zone.name
    # Create the target time for this Monday in therapist's time zone
    time_in_tz = Time.use_zone(therapist_tz) { Time.zone.local(date.year, date.month, date.day, hour, minute) }
    # If the target time is in the past, go to next Monday
    if time_in_tz <= Time.current.in_time_zone(therapist_tz)
      date += 7.days
      time_in_tz = Time.use_zone(therapist_tz) { Time.zone.local(date.year, date.month, date.day, hour, minute) }
    end
    time_in_tz
  end

  # Returns the next Tuesday at the given hour/minute in the future
  # Ensures the returned time is in the future to avoid past date issues
  def next_tuesday_at(hour, minute)
    today = Date.current
    # Find the next Tuesday
    date = today
    date += 1.day until date.tuesday?
    therapist_tz = @schedule&.time_zone || Time.zone.name
    # Create the target time for this Tuesday in therapist's time zone
    time_in_tz = Time.use_zone(therapist_tz) { Time.zone.local(date.year, date.month, date.day, hour, minute) }
    # If the target time is in the past, go to next Tuesday
    if time_in_tz <= Time.current.in_time_zone(therapist_tz)
      date += 7.days
      time_in_tz = Time.use_zone(therapist_tz) { Time.zone.local(date.year, date.month, date.day, hour, minute) }
    end
    time_in_tz
  end

  # Helper: Create max allowed appointments for a given day, spaced to avoid overlap
  # Creates the maximum number of appointments allowed per day for testing daily limits
  def create_max_daily_appointments(therapist, schedule, appointment_date)
    max_appts = schedule.max_daily_appointments
    max_appts.times do |i|
      # Calculate appointment times with 70-minute spacing (60 min appointment + 10 min buffer)
      appointment_hour = 16 + (i * 70 / 60)
      appointment_minute = (i * 70) % 60

      Appointment.create!(
        therapist: therapist,
        patient: Patient.create!(
          name: "Patient#{i}",
          date_of_birth: "2000-01-01",
          gender: "MALE",
          patient_contact: PatientContact.create!(
            contact_name: "Patient#{i}",
            contact_phone: "6289172123#{i}",
            email: "patient#{i}@yopmail.com"
          )
        ),
        service: Service.first,
        package: Package.first,
        location: Location.first,
        appointment_date_time: Time.use_zone(schedule.time_zone) {
          Time.zone.local(appointment_date.year, appointment_date.month, appointment_date.day, appointment_hour, appointment_minute)
        },
        preferred_therapist_gender: "NO PREFERENCE",
        patient_medical_record_attributes: {
          complaint_description: "Test complaint",
          illness_onset_date: "2024-01-01",
          condition: "NORMAL",
          medical_history: "None"
        },
        status: "pending_patient_approval"
      )
    end
  end
end
