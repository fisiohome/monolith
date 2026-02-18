class MasterDataSyncJob < ApplicationJob
  queue_as :default

  def perform(sync_type, user_id = nil, options = {})
    @current_user = User.find_by(id: user_id) if user_id
    employment_type_filter = options[:employment_type_filter] || "KARPIS"

    # Create initial sync log
    @sync_log = SyncMonolithLogs.create!(
      user_id: user_id,
      sync_type: sync_type.to_s,
      status: :running,
      ui_message: "Sync started...",
      logger_message: "Starting #{sync_type} sync (#{employment_type_filter})",
      started_at: Time.current
    )

    service = AdminPortal::MasterDataSyncService.new(@current_user)

    result = case sync_type.to_sym
    when :therapists_and_schedules
      service.therapists_and_schedules(employment_type_filter:)
    when :locations
      service.locations
    when :admins_data
      service.admins_data
    when :brands_and_packages
      service.brands_and_packages
    else
      {success: false, error: "Unknown sync type: #{sync_type}"}
    end

    # Update sync log with results
    @sync_log.update!(
      status: result[:success] ? :completed : :failed,
      ui_message: result[:message] || result[:error],
      logger_message: result[:log_message] || result[:error],
      details: result[:error] || result[:details],
      completed_at: Time.current
    )

    # Store the result for later retrieval (backward compatibility)
    store_sync_result(sync_type, result)

    result
  rescue => e
    error_result = {success: false, error: "Sync failed: #{e.message}"}

    # Update sync log with error
    @sync_log.update!(
      status: :failed,
      ui_message: "Sync failed",
      logger_message: "MasterDataSyncJob failed: #{e.class} - #{e.message}",
      details: e.full_message,
      completed_at: Time.current
    )

    store_sync_result(sync_type, error_result)
    Rails.logger.error "MasterDataSyncJob failed: #{e.class} - #{e.message}"
    raise e
  end

  private

  def store_sync_result(sync_type, result)
    # Use Rails.cache to store the result for 24 hours
    cache_key = "master_sync_result_#{sync_type}_#{Time.current.to_i}"
    Rails.cache.write(cache_key, result, expires_in: 24.hours)

    # Also store the latest result key for this sync type
    Rails.cache.write("latest_master_sync_#{sync_type}", cache_key, expires_in: 24.hours)
  end
end
