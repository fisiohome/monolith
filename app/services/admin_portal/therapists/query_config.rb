# frozen_string_literal: true

module AdminPortal
  module Therapists
    # Configuration for therapist query optimization
    module QueryConfig
      # Enable batching for datasets larger than this
      BATCH_THRESHOLD = 500

      # Default batch size
      DEFAULT_BATCH_SIZE = 100

      # Enable caching for availability checks
      ENABLE_CACHING = true

      # Cache duration in minutes
      CACHE_DURATION = 15

      # Enable progress logging for large datasets
      ENABLE_PROGRESS_LOGGING = true

      # Progress log interval (number of therapists)
      PROGRESS_LOG_INTERVAL = 500
    end
  end
end
