module AdminPortal
  module SyncConfig
    # Batch size for processing records
    # Adjust based on server memory and performance
    BATCH_SIZE = ENV.fetch("SYNC_BATCH_SIZE", 100).to_i

    # Memory threshold in MB to trigger garbage collection
    MEMORY_THRESHOLD_MB = ENV.fetch("SYNC_MEMORY_THRESHOLD_MB", 500).to_i

    # Enable/disable memory monitoring
    ENABLE_MEMORY_MONITORING = ENV.fetch("ENABLE_SYNC_MEMORY_MONITORING", "true") == "true"

    # Maximum number of retries for failed records
    MAX_RETRIES = 3

    # Delay between batches in seconds (to prevent overwhelming the server)
    BATCH_DELAY = ENV.fetch("SYNC_BATCH_DELAY", 0.1).to_f

    # Enable/disable progress logging
    ENABLE_PROGRESS_LOGGING = ENV.fetch("ENABLE_SYNC_PROGRESS_LOGGING", "true") == "true"

    # Progress log interval (every N batches)
    PROGRESS_LOG_INTERVAL = ENV.fetch("SYNC_PROGRESS_LOG_INTERVAL", 10).to_i
  end
end
