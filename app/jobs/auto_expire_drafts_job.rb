# AutoExpireDraftsJob - Automatically expires appointment drafts based on their expires_at timestamp
#
# This job runs daily (scheduled at 1am) to find all active drafts whose expires_at
# timestamp has passed and changes their status from 'active' to 'expired'.
#
# Purpose:
# - Automatically transition drafts to expired status based on their expiration date
# - Ensure drafts don't remain active indefinitely beyond their intended lifetime
# - Prepare expired drafts for cleanup by CleanupExpiredDraftsJob (runs at 1am)
#
# Flow:
# 1. Find all active drafts where expires_at <= current time
# 2. Update each draft's status to 'expired'
# 3. Log each expired draft with details (ID, expiration date, creation date)
# 4. Return summary of how many drafts were expired
#
# Schedule: Daily at 1am (configured in config/recurring.yml)
# Queue: low_priority (to avoid blocking critical operations)
class AutoExpireDraftsJob < ApplicationJob
  queue_as :low_priority

  def perform
    # Log job start for monitoring and debugging
    Rails.logger.info "Starting auto-expiration of appointment drafts..."

    # Find drafts that should be expired:
    # - Must be 'active' status (not already expired)
    # - expires_at timestamp must be in the past or current time
    drafts_to_expire = AppointmentDraft.active_drafts.where("expires_at <= ?", Time.current)

    expired_count = 0

    # Process drafts in batches to avoid memory issues with large datasets
    drafts_to_expire.find_each do |draft|
      # Update draft status to expired
      draft.update!(status: :expired)
      expired_count += 1

      # Log individual draft expiration for audit trail
      Rails.logger.info "Expired draft ##{draft.id} (expired at: #{draft.expires_at.strftime("%Y-%m-%d %H:%M")}, created: #{draft.created_at.strftime("%Y-%m-%d")})"
    end

    # Log final summary
    if expired_count > 0
      Rails.logger.info "Auto-expired #{expired_count} appointment drafts"
    else
      Rails.logger.info "No drafts to auto-expire"
    end

    # Return count for monitoring and potential downstream processing
    {expired_count: expired_count}
  end
end
