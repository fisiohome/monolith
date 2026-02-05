class SyncStatusService
  def self.get_latest_sync_status(sync_type)
    cache_key = Rails.cache.read("latest_master_sync_#{sync_type}")
    return nil unless cache_key

    result = Rails.cache.read(cache_key)
    return nil unless result

    # Try to extract timestamp from cache key
    timestamp = cache_key.match(/master_sync_result_#{sync_type}_(\d+)$/)&.[](1)

    {
      result: result,
      completed_at: timestamp ? Time.zone.at(timestamp.to_i) : nil,
      status: result[:success] ? :completed : :failed
    }
  end

  def self.clear_sync_status(sync_type)
    cache_key = Rails.cache.read("latest_master_sync_#{sync_type}")
    Rails.cache.delete(cache_key) if cache_key
    Rails.cache.delete("latest_master_sync_#{sync_type}")
  end
end
