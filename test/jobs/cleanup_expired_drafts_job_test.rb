require "test_helper"

class CleanupExpiredDraftsJobTest < ActiveJob::TestCase
  setup do
    @admin = admins(:admin)
  end

  test "should cleanup expired drafts older than 3 days without status reason" do
    # Create expired drafts of different ages
    old_draft_without_reason = create(:appointment_draft,
      created_at: 8.days.ago,
      status: "expired",
      status_reason: nil)
    old_draft_without_reason.update!(expires_at: 4.days.ago)  # Expires more than 3 days ago

    old_draft_with_reason = create(:appointment_draft,
      created_at: 8.days.ago,
      status: "expired",
      status_reason: "WAITING_FOR_PATIENT_CONFIRMATION")
    old_draft_with_reason.update!(expires_at: 4.days.ago)

    recent_expired = create(:appointment_draft,
      created_at: 3.days.ago,
      status: "expired")
    recent_expired.update!(expires_at: 2.days.ago)  # Expires less than 3 days ago

    very_recent_expired = create(:appointment_draft,
      created_at: 1.hour.ago,
      status: "expired")
    very_recent_expired.update!(expires_at: 1.hour.ago)  # Expires less than 3 days ago

    # Create drafts that should NOT be deleted
    active_draft = create(:appointment_draft,
      created_at: 8.days.ago,
      status: "active")

    result = CleanupExpiredDraftsJob.perform_now

    # Only old draft without status reason should be deleted
    assert_equal 1, result[:deleted_count]
    assert_not AppointmentDraft.exists?(old_draft_without_reason.id)
    assert AppointmentDraft.exists?(old_draft_with_reason.id)
    assert AppointmentDraft.exists?(recent_expired.id)
    assert AppointmentDraft.exists?(very_recent_expired.id)
    assert AppointmentDraft.exists?(active_draft.id)
  end

  test "should return zero when no expired drafts to cleanup" do
    create(:appointment_draft, status: "active")

    result = CleanupExpiredDraftsJob.perform_now

    assert_equal 0, result[:deleted_count]
  end

  test "should handle empty drafts table" do
    result = CleanupExpiredDraftsJob.perform_now

    assert_equal 0, result[:deleted_count]
  end

  test "should log cleanup process" do
    draft = create(:appointment_draft,
      created_at: 8.days.ago,
      status: "expired",
      admin_pic: @admin)
    draft.update!(expires_at: 4.days.ago)  # Make it eligible for cleanup

    # Capture Rails.logger output
    log_output = StringIO.new
    original_logger = Rails.logger
    Rails.logger = Logger.new(log_output)

    CleanupExpiredDraftsJob.perform_now

    # Restore original logger
    Rails.logger = original_logger

    log_content = log_output.string
    assert_includes log_content, "Starting cleanup of expired appointment drafts..."
    assert_includes log_content, "Cleaned up 1 expired appointment drafts (older than 3 days, without status reason)"
  end

  test "should log when no drafts to cleanup" do
    # Capture Rails.logger output
    log_output = StringIO.new
    original_logger = Rails.logger
    Rails.logger = Logger.new(log_output)

    CleanupExpiredDraftsJob.perform_now

    # Restore original logger
    Rails.logger = original_logger

    log_content = log_output.string
    assert_includes log_content, "Starting cleanup of expired appointment drafts..."
    assert_includes log_content, "No expired appointment drafts to clean up"
  end

  test "should use low priority queue" do
    assert_equal "low_priority", CleanupExpiredDraftsJob.new.queue_name
  end

  private

  def create(factory_name, **attributes)
    # Simple factory method for testing
    case factory_name
    when :appointment_draft
      defaults = {
        current_step: "patient_details",
        form_data: {patient: {}},
        status: "active",
        created_by_admin: @admin,
        admin_pic: @admin,
        created_at: Time.current
      }

      AppointmentDraft.create!(defaults.merge(attributes))
    end
  end
end
