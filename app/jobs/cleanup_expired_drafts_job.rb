class CleanupExpiredDraftsJob < ApplicationJob
  queue_as :low_priority

  def perform
    Rails.logger.info "Starting cleanup of expired appointment drafts..."

    expired_drafts = AppointmentDraft.cleanup_eligible

    deleted_count = expired_drafts.count

    if deleted_count > 0
      expired_drafts.delete_all
      Rails.logger.info "Cleaned up #{deleted_count} expired appointment drafts"
    else
      Rails.logger.info "No expired appointment drafts to clean up"
    end

    {deleted_count: deleted_count}
  end
end
