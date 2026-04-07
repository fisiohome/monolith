require "test_helper"

class AppointmentDraftTest < ActiveSupport::TestCase
  setup do
    @admin = admins(:admin)
  end

  # Scope tests
  test "cleanup_eligible scope should return expired drafts older than 3 days" do
    old_expired = create(:appointment_draft, created_at: 8.days.ago, status: "expired")
    old_expired.update!(expires_at: 4.days.ago)  # More than 3 days ago

    recent_expired = create(:appointment_draft, created_at: 3.days.ago, status: "expired")
    recent_expired.update!(expires_at: 2.days.ago)  # Less than 3 days ago

    very_recent_expired = create(:appointment_draft, created_at: 1.hour.ago, status: "expired")
    very_recent_expired.update!(expires_at: 1.hour.ago)  # Less than 3 days ago

    active_draft = create(:appointment_draft, created_at: 8.days.ago, status: "active")

    eligible = AppointmentDraft.cleanup_eligible

    assert_includes eligible, old_expired
    assert_not_includes eligible, recent_expired
    assert_not_includes eligible, very_recent_expired
    assert_not_includes eligible, active_draft
  end

  test "active_drafts scope should return only active drafts" do
    active = create(:appointment_draft, status: "active")
    expired = create(:appointment_draft, status: "expired")

    result = AppointmentDraft.active_drafts

    assert_includes result, active
    assert_not_includes result, expired
  end

  test "expired_drafts scope should return only expired drafts" do
    active = create(:appointment_draft, status: "active")
    expired = create(:appointment_draft, status: "expired")

    result = AppointmentDraft.expired_drafts

    assert_includes result, expired
    assert_not_includes result, active
  end

  # Callback tests
  test "should set expires_at to 14 days from now on create" do
    draft = create(:appointment_draft)

    expected_expires_at = 14.days.from_now.to_date
    actual_expires_at = draft.expires_at.to_date

    assert_equal expected_expires_at, actual_expires_at
  end

  # Instance method tests
  test "expire_with_appointment! should update status and appointment" do
    # Skip this test for now as it requires complex appointment setup
    # This would need proper package, patient, and therapist setup
    skip "Requires complex appointment setup"
  end

  test "step_index should return correct index for current step" do
    draft = create(:appointment_draft, current_step: "appointment_scheduling")

    assert_equal 1, draft.step_index
  end

  test "step_index should return 0 for invalid step" do
    draft = create(:appointment_draft, current_step: "invalid_step")

    assert_equal 0, draft.step_index
  end

  test "next_step should return next step in sequence" do
    draft = create(:appointment_draft, current_step: "patient_details")

    assert_equal "appointment_scheduling", draft.next_step
  end

  test "next_step should return nil for last step" do
    draft = create(:appointment_draft, current_step: "review")

    assert_nil draft.next_step
  end

  test "completed? should return true for last step" do
    draft = create(:appointment_draft, current_step: "review")

    assert draft.completed?
  end

  test "completed? should return false for non-last steps" do
    draft = create(:appointment_draft, current_step: "patient_details")

    assert_not draft.completed?
  end

  # Validation tests
  test "should validate presence of current_step" do
    draft = AppointmentDraft.new(form_data: {}, created_by_admin: @admin)

    assert_not draft.valid?
    assert_includes draft.errors[:current_step], "can't be blank"
  end

  test "should validate presence of form_data" do
    draft = AppointmentDraft.new(current_step: "patient_details", created_by_admin: @admin)

    assert_not draft.valid?
    assert_includes draft.errors[:form_data], "can't be blank"
  end

  test "should be valid with all required attributes" do
    draft = build(:appointment_draft)

    assert draft.valid?
  end

  private

  def create(factory_name, **attributes)
    case factory_name
    when :appointment_draft
      AppointmentDraft.create!(
        current_step: attributes[:current_step] || "patient_details",
        form_data: attributes[:form_data] || {patient: {}},
        status: attributes[:status] || "active",
        created_by_admin: attributes[:created_by_admin] || @admin,
        admin_pic: attributes[:admin_pic] || @admin,
        created_at: attributes[:created_at] || Time.current
      )
    when :appointment
      # Create minimal appointment for testing
      Appointment.create!(
        registration_number: "REG-#{Time.current.to_i}",
        appointment_date_time: 1.day.from_now,
        status: "unscheduled"
      )
    end
  end

  def build(factory_name, **attributes)
    case factory_name
    when :appointment_draft
      AppointmentDraft.new(
        current_step: attributes[:current_step] || "patient_details",
        form_data: attributes[:form_data] || {patient: {}},
        status: attributes[:status] || :active,
        created_by_admin: attributes[:created_by_admin] || @admin,
        admin_pic: attributes[:admin_pic] || @admin
      )
    end
  end
end
