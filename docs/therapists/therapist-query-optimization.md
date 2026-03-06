# Therapist Query Performance Optimization Guide

## Overview
Optimized the therapist availability search to handle 10k+ therapists efficiently by reducing database queries, implementing caching, and adding batch processing.

## Key Optimizations Applied

### 1. SQL-Level Location Rule Filtering
- Moved location rule filtering from Ruby to PostgreSQL JSONB queries
- Reduced initial therapist dataset before Ruby processing
- Special handling for Jakarta Pusat business rule kept in Ruby

### 2. Eliminated N+1 Queries
- Preload all appointments for filtered therapists in a single query
- Pass preloaded appointments to availability service to avoid individual queries
- Optimized `fetch_adjacent_appointment_addresses` to use preloaded data

### 3. Added Database Indexes
- Composite index on `therapists(employment_status, employment_type)`
- GIN index on `therapist_appointment_schedules.availability_rules` for JSONB queries
- Index on `appointments(therapist_id, appointment_date_time, status)`
- Additional indexes for common query patterns

### 4. Implemented Availability Caching
- Cache availability calculations for 15 minutes
- Cache invalidation when appointments change
- Reduces redundant availability checks for same therapist/time

### 5. Added Batch Processing (NEW)
- Process therapists in configurable batches (default: 100)
- Reduces memory usage for large datasets
- Automatic batching for datasets > 500 therapists
- Progress logging for monitoring large operations

### 6. Removed Redundant Operations
- Eliminated `uniq { |t| t.id }` after `distinct`
- Only return available therapists when date/time specified
- Optimized memory usage with early filtering

## Performance Results
- **Before**: 51.47s API, 39.56s docs (576 therapists)
- **After optimization**: 40.11s API, 24.54s docs
- **With caching**: 28.05s API, 23.98s docs
- **Expected with batching**: Further improvement for large datasets (>500 therapists)

## Configuration
Located in `/config/initializers/therapist_query_config.rb`:
- `BATCH_THRESHOLD`: Enable batching for datasets larger than this (default: 500)
- `DEFAULT_BATCH_SIZE`: Number of therapists per batch (default: 100)
- `ENABLE_CACHING`: Toggle availability caching (default: true)
- `CACHE_DURATION`: Cache duration in minutes (default: 15)
- `ENABLE_PROGRESS_LOGGING`: Log progress for large datasets (default: true)

## Usage
Batching is automatically enabled for datasets larger than the threshold. You can also control it manually:

```ruby
# Force enable batching
params[:use_batching] = true
params[:batch_size] = 50  # Custom batch size

# Force disable batching
params[:use_batching] = false
```

## Migration Required
Run the new migration to add performance indexes:
```bash
rails db:migrate
```

## Cache Configuration
Ensure Redis or file cache is properly configured for production:
```ruby
# config/environments/production.rb
config.cache_store = :redis_cache_store, { url: ENV['REDIS_URL'] }
```

## Monitoring
Monitor cache hit rates and query performance:
- Cache keys: `therapist_availability:*`
- Slow queries: Check logs for remaining N+1 queries
- Memory usage: Watch cache size growth
- Batch processing: Look for "Using batch processing" logs
