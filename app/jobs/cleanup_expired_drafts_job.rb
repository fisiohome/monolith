# CleanupExpiredDraftsJob - Deletes expired appointment drafts older than 3 days
#
# This job runs daily (scheduled at 1am) to permanently remove expired drafts
# that have been in expired status for more than 3 days.
#
# Purpose:
# - Clean up expired drafts after a 3-day grace period
# - Free up database storage from old expired drafts
# - Ensure data privacy by removing old draft data
#
# Flow:
# 1. Find all expired drafts that are older than 3 days (using cleanup_eligible scope)
# 2. Delete them permanently from database
# 3. Log cleanup summary
#
# Schedule: Daily at 1am (configured in config/recurring.yml)
# Queue: low_priority (to avoid blocking critical operations)
class CleanupExpiredDraftsJob < ApplicationJob
  queue_as :low_priority

  def perform
    Rails.logger.info "Starting cleanup of expired appointment drafts..."

    # Find expired drafts that are older than 3 days using the cleanup_eligible scope
    expired_drafts = AppointmentDraft.cleanup_eligible

    deleted_count = expired_drafts.count

    if deleted_count > 0
      expired_drafts.destroy_all
      Rails.logger.info "Cleaned up #{deleted_count} expired appointment drafts (older than 3 days)"
    else
      Rails.logger.info "No expired appointment drafts to clean up"
    end

    {deleted_count: deleted_count}
  end
end
