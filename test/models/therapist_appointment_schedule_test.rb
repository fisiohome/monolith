require "test_helper"

class TherapistAppointmentScheduleTest < ActiveSupport::TestCase
  def setup
    @schedule_one = therapist_appointment_schedules(:schedule_for_therapist_one)
    @schedule_two = therapist_appointment_schedules(:schedule_for_therapist_two)
  end

  test "can create schedule if therapist is ACTIVE" do
    assert @schedule_one.valid?
  end

  test "cannot create schedule if therapist is on HOLD" do
    @schedule_one.therapist.employment_status = "HOLD"
    refute @schedule_one.valid?
    assert_includes @schedule_one.errors[:base],
      "Cannot create or update a schedule for a non-active therapist"
  end

  test "if available_now is true, start_date_window and end_date_window must be nil" do
    @schedule_one.start_date_window = Date.current
    refute @schedule_one.valid?
    # By default, Rails sets the error: "must be blank" for `absence: true`
    assert_includes @schedule_one.errors[:start_date_window], "must be blank"
  end

  test "if available_now is false, start_date_window and end_date_window must be present" do
    @schedule_two.start_date_window = nil
    refute @schedule_two.valid?
    # For presence: true, the default error is: "can't be blank"
    assert_includes @schedule_two.errors[:start_date_window], "can't be blank"
  end

  test "end_date_window must be strictly after start_date_window if available_now is false" do
    @schedule_two.end_date_window = @schedule_two.start_date_window
    refute @schedule_two.valid?
    # Your custom message: "must be after the start date"
    assert_includes @schedule_two.errors[:end_date_window], "must be after the start date"
  end

  test "model must have either available_now or a start_date_window" do
    @schedule_one.available_now = false
    @schedule_one.start_date_window = nil
    refute @schedule_one.valid?
    # "You must set 'available now' or provide a 'start date'"
    assert_includes @schedule_one.errors[:base],
      "You must set 'available now' or provide a 'start date'"
  end

  test "appointment_duration_in_minutes must be > 0" do
    @schedule_one.appointment_duration_in_minutes = 0
    refute @schedule_one.valid?
    assert_includes @schedule_one.errors[:appointment_duration_in_minutes],
      "must be greater than 0"
  end

  # You can similarly test the numeric fields: max_advance_booking_in_days, etc.
  test "min_booking_before_in_hours must be >= 0" do
    @schedule_one.min_booking_before_in_hours = -1
    refute @schedule_one.valid?
    assert_includes @schedule_one.errors[:min_booking_before_in_hours],
      "must be greater than or equal to 0"
  end
end
