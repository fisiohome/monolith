require "test_helper"

class TherapistAdjustedAvailabilityTest < ActiveSupport::TestCase
  def setup
    # Suppose these fixture records exist in test/fixtures/therapist_adjusted_availabilities.yml
    @unavailable_entire_day = therapist_adjusted_availabilities(:unavailable_entire_day)
    @partial_one = therapist_adjusted_availabilities(:partial_availability_one)
    @partial_two = therapist_adjusted_availabilities(:partial_availability_two)

    # A schedule that is NOT available_now, so it has a date window
    @window_schedule = therapist_appointment_schedules(:window_schedule)
    # A schedule that is available_now
    @instant_schedule = therapist_appointment_schedules(:instant_schedule)
  end

  test "fixtures are valid" do
    assert @unavailable_entire_day.valid?, @unavailable_entire_day.errors.full_messages
    assert @partial_one.valid?, @partial_one.errors.full_messages
    assert @partial_two.valid?, @partial_two.errors.full_messages
  end

  test "must have a specific_date" do
    @partial_one.specific_date = nil
    refute @partial_one.valid?
    assert_includes @partial_one.errors[:specific_date], "can't be blank"
  end

  test "fully unavailable scenario (both times nil) is valid" do
    assert @unavailable_entire_day.unavailable?
    assert @unavailable_entire_day.valid?
  end

  test "end_time must be after start_time if times are present" do
    @partial_one.start_time = "14:00"
    @partial_one.end_time = "13:59"
    refute @partial_one.valid?
    assert_includes @partial_one.errors[:end_time], "must be after the start time"
  end

  test "start_time and end_time must both be present or both absent" do
    # 1) One is present, the other absent => invalid
    @partial_one.start_time = "14:00"
    @partial_one.end_time = nil
    refute @partial_one.valid?
    assert_includes @partial_one.errors[:base], "Start time and end time must both be present or both absent"

    # 2) The opposite: end_time present, start_time absent => also invalid
    @partial_one.start_time = nil
    @partial_one.end_time = "14:00"
    refute @partial_one.valid?
    assert_includes @partial_one.errors[:base], "Start time and end time must both be present or both absent"

    # 3) Both nil => valid if your logic allows a “no time” scenario
    @partial_one.start_time = nil
    @partial_one.end_time = nil
    assert @partial_one.valid?, @partial_one.errors.full_messages

    # 4) Both present => valid
    @partial_one.start_time = "09:00"
    @partial_one.end_time = "11:00"
    assert @partial_one.valid?, @partial_one.errors.full_messages
  end

  test "exact duplicate record is invalid" do
    duplicate = TherapistAdjustedAvailability.new(
      therapist_appointment_schedule_id: @partial_one.therapist_appointment_schedule_id,
      specific_date: @partial_one.specific_date,
      start_time: @partial_one.start_time,
      end_time: @partial_one.end_time
    )

    refute duplicate.valid?
    assert_includes duplicate.errors[:specific_date],
      "Exact duplicate record already exists for this schedule, date, and time."
  end

  test "mixed full/partial availability validations" do
    # Test partial conflict with full unavailable
    partial_conflict = TherapistAdjustedAvailability.new(
      therapist_appointment_schedule: @unavailable_entire_day.therapist_appointment_schedule,
      specific_date: @unavailable_entire_day.specific_date,
      start_time: "09:00",
      end_time: "10:00"
    )
    refute partial_conflict.valid?
    assert_includes partial_conflict.errors[:base], "Cannot create partial availability if date is already fully unavailable"

    # Test full unavailable with existing partial
    new_full = TherapistAdjustedAvailability.new(
      therapist_appointment_schedule: @partial_one.therapist_appointment_schedule,
      specific_date: @partial_one.specific_date,
      start_time: nil,
      end_time: nil
    )
    refute new_full.valid?
    assert_includes new_full.errors[:base], "Cannot mark date fully unavailable if partial availability exists for this date"
  end

  test "adjusted availability must be within schedule window if not available_now" do
    # Our window_schedule might have start_date_window=Date.today, end_date_window=Date.today+30
    outside_date = @window_schedule.end_date_window + 1

    outside_record = TherapistAdjustedAvailability.new(
      therapist_appointment_schedule: @window_schedule,
      specific_date: outside_date,
      start_time: "10:00",
      end_time: "12:00"
    )
    refute outside_record.valid?
    assert_includes outside_record.errors[:specific_date],
      "must be within the schedule date window (#{@window_schedule.start_date_window} - #{@window_schedule.end_date_window})"
  end

  test "if schedule is available_now, no date window restriction" do
    # instant_schedule has available_now = true
    record = TherapistAdjustedAvailability.new(
      therapist_appointment_schedule: @instant_schedule,
      specific_date: Time.zone.today + 365,   # far in the future
      start_time: "10:00",
      end_time: "12:00"
    )
    assert record.valid?, record.errors.full_messages
  end

  test "past date validation" do
    past_record = TherapistAdjustedAvailability.new(
      therapist_appointment_schedule: @instant_schedule,
      specific_date: Date.current - 1.day,
      start_time: "10:00",
      end_time: "12:00"
    )
    refute past_record.valid?
    assert_includes past_record.errors[:specific_date], "cannot be in the past"
  end

  test "overlapping time ranges validation" do
    therapist_adjusted_availabilities(:overlapping_availability_09)
    time_2 = therapist_adjusted_availabilities(:overlapping_availability_11)

    refute time_2.valid?
    assert_includes time_2.errors[:base],
      "Time range overlaps with existing availability for #{time_2.specific_date}"
  end
end
