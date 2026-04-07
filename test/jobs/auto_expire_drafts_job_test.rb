require "test_helper"

class AutoExpireDraftsJobTest < ActiveJob::TestCase
  setup do
    @admin = admins(:admin)
  end

  test "should expire drafts when expires_at is reached" do
    # Create drafts with different expiration times
    expired_draft = create(:appointment_draft,
      created_at: 15.days.ago,
      status: "active")
    expired_draft.update!(expires_at: 1.day.ago)  # Set past expiration after creation

    another_expired_draft = create(:appointment_draft,
      created_at: 20.days.ago,
      status: "active")
    another_expired_draft.update!(expires_at: 2.days.ago)  # Set past expiration after creation

    # Create drafts that should NOT be expired yet
    recent_draft = create(:appointment_draft,
      created_at: 10.days.ago,
      status: "active")
    recent_draft.update!(expires_at: 4.days.from_now)  # Set future expiration after creation

    very_recent_draft = create(:appointment_draft,
      created_at: 1.day.ago,
      status: "active")
    very_recent_draft.update!(expires_at: 13.days.from_now)  # Set future expiration after creation

    already_expired = create(:appointment_draft,
      created_at: 15.days.ago,
      status: "expired")

    result = AutoExpireDraftsJob.perform_now

    assert_equal 2, result[:expired_count]

    # Check that expired drafts are now expired
    expired_draft.reload
    another_expired_draft.reload
    assert_equal "expired", expired_draft.status
    assert_equal "expired", another_expired_draft.status

    # Check that recent drafts are still active
    recent_draft.reload
    very_recent_draft.reload
    assert_equal "active", recent_draft.status
    assert_equal "active", very_recent_draft.status

    # Already expired draft should remain expired
    already_expired.reload
    assert_equal "expired", already_expired.status
  end

  test "should return zero when no drafts to expire" do
    create(:appointment_draft, status: "active", created_at: 1.day.ago)  # expires_at in future
    create(:appointment_draft, status: "expired", created_at: 15.days.ago)  # already expired

    result = AutoExpireDraftsJob.perform_now

    assert_equal 0, result[:expired_count]
  end

  test "should handle empty drafts table" do
    result = AutoExpireDraftsJob.perform_now

    assert_equal 0, result[:expired_count]
  end

  test "should log expiration process" do
    draft = create(:appointment_draft,
      created_at: 15.days.ago,
      status: "active")
    draft.update!(expires_at: 1.day.ago)  # Set past expiration after creation

    # Capture Rails.logger output
    log_output = StringIO.new
    original_logger = Rails.logger
    Rails.logger = Logger.new(log_output)

    AutoExpireDraftsJob.perform_now

    # Restore original logger
    Rails.logger = original_logger

    log_content = log_output.string
    assert_includes log_content, "Starting auto-expiration of appointment drafts..."
    assert_includes log_content, "Auto-expired 1 appointment drafts"
  end

  test "should log when no drafts to expire" do
    # Capture Rails.logger output
    log_output = StringIO.new
    original_logger = Rails.logger
    Rails.logger = Logger.new(log_output)

    AutoExpireDraftsJob.perform_now

    # Restore original logger
    Rails.logger = original_logger

    log_content = log_output.string
    assert_includes log_content, "Starting auto-expiration of appointment drafts..."
    assert_includes log_content, "No drafts to auto-expire"
  end

  test "should use low priority queue" do
    assert_equal "low_priority", AutoExpireDraftsJob.new.queue_name
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
        # expires_at is set by callback, not here
      )
    end
  end
end
