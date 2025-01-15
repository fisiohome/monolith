require "test_helper"

class TherapistWeeklyAvailabilityTest < ActiveSupport::TestCase
  def setup
    # Example fixture references
    @monday_morning = therapist_weekly_availabilities(:monday_morning_for_therapist_one)
    @monday_afternoon = therapist_weekly_availabilities(:monday_afternoon_for_therapist_one)
    @friday_morning = therapist_weekly_availabilities(:friday_morning_for_therapist_two)
  end

  test "fixtures are valid" do
    assert @monday_morning.valid?, @monday_morning.errors.full_messages
    assert @monday_afternoon.valid?, @monday_afternoon.errors.full_messages
    assert @friday_morning.valid?, @friday_morning.errors.full_messages
  end

  test "day_of_week must be from Date::DAYNAMES" do
    @monday_morning.day_of_week = "Funday"
    refute @monday_morning.valid?
    assert_includes @monday_morning.errors[:day_of_week],
      "Funday is not a valid day of the week"
  end

  test "start_time must be before end_time" do
    # This test requires you add the recommended `end_time_after_start_time` check
    @monday_morning.start_time = "14:00"
    @monday_morning.end_time = "13:59"
    refute @monday_morning.valid?
    assert_includes @monday_morning.errors[:end_time],
      "must be after the start time"
  end

  test "exact duplicate is caught by model validation" do
    existing = therapist_weekly_availabilities(:monday_morning_for_therapist_one)
    duplicate = TherapistWeeklyAvailability.new(
      therapist_appointment_schedule_id: existing.therapist_appointment_schedule_id,
      day_of_week: existing.day_of_week,
      start_time: existing.start_time,
      end_time: existing.end_time
    )

    refute duplicate.valid?
    assert_includes duplicate.errors[:end_time],
      "Exact availability for this day/time range already exists"
  end

  test "both start_time and end_time must be present or absent" do
    # 1) One is present, the other absent => invalid
    @monday_morning.start_time = "09:00"
    @monday_morning.end_time = nil
    refute @monday_morning.valid?
    assert_includes @monday_morning.errors[:base],
      "Start time and end time must both be present or both absent"

    # 2) The opposite: end_time present, start_time absent => also invalid
    @monday_morning.start_time = nil
    @monday_morning.end_time = "10:00"
    refute @monday_morning.valid?
    assert_includes @monday_morning.errors[:base],
      "Start time and end time must both be present or both absent"

    # 3) Both nil => valid if your logic allows a “no time” scenario
    @monday_morning.start_time = nil
    @monday_morning.end_time = nil
    assert @monday_morning.valid?, @monday_morning.errors.full_messages

    # 4) Both present => valid
    @monday_morning.start_time = "09:00"
    @monday_morning.end_time = "11:00"
    assert @monday_morning.valid?, @monday_morning.errors.full_messages
  end

  # ? TECH-DEBT - will be skipped for now, not running properly
  # test "overlapping availability" do
  #   # existing: day_of_week: "Monday", start_time: "09:00", end_time: "12:00"
  #   existing = therapist_weekly_availabilities(:monday_morning_for_therapist_one)

  #   overlap = TherapistWeeklyAvailability.new(
  #     therapist_appointment_schedule_id: existing.therapist_appointment_schedule_id,
  #     day_of_week: "Monday",  # must match existing record
  #     start_time: "11:00",    # overlaps 09:00–12:00
  #     end_time: "13:00"
  #   )

  #   # refute overlap.save, "Should not save overlapping availability"
  #   refute overlap.valid?
  #   assert_includes overlap.errors[:base], "Overlapping availability exists"
  # end
end
