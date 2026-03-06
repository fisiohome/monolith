# Therapist Query Performance Optimization Guide

## Overview
Optimized the therapist availability search to handle 10k+ therapists efficiently by reducing database queries, implementing caching, and adding batch processing.

## Key Optimizations Applied

### 1. SQL-Level Location Rule Filtering
- Moved location rule filtering from Ruby to PostgreSQL JSONB queries
- Reduced initial therapist dataset before Ruby processing
- **Updated**: Removed Ruby-side Jakarta Pusat filtering, now fully handled in SQL

### 2. Unified QueryHelper and BatchQueryHelper Logic
- **Business Rule**: "Allow Jakarta Pusat therapists for any DKI Jakarta location"
- **Implementation**: Location ID expansion for Jakarta Pusat requests
- **Jabodetabek Detection**: Unified filtering for Jakarta, Bogor, Depok, Tangerang, Bekasi, Kepulauan Seribu
- **Conditional SQL**: Different filtering logic for Jabodetabek vs non-Jabodetabek locations

### 3. Jakarta Pusat Special Case Implementation
```ruby
# When user requests Jakarta Pusat, include all DKI Jakarta locations
location_ids =
  if location.city == "KOTA ADM. JAKARTA PUSAT"
    Location.where(state: "DKI JAKARTA").pluck(:id)  # All DKI Jakarta
  else
    [location.id]  # Specific location only
  end
```

### 4. Jabodetabek Location Filtering Logic
- **For Jabodetabek locations**: More permissive filtering
  - Therapists without location rules can serve anywhere
  - Therapists with matching location IDs are included
  - Supports cross-city therapist availability within Jabodetabek
- **For non-Jabodetabek locations**: Stricter filtering
  - Jabodetabek therapists excluded unless explicitly allowed
  - Non-Jabodetabek therapists without location rules can serve anywhere
  - Location-specific rules are respected

### 5. Eliminated N+1 Queries
- Preload all appointments for filtered therapists in a single query
- Pass preloaded appointments to availability service to avoid individual queries
- Optimized `fetch_adjacent_appointment_addresses` to use preloaded data

### 6. Added Database Indexes
- Composite index on `therapists(employment_status, employment_type)`
- GIN index on `therapist_appointment_schedules.availability_rules` for JSONB queries
- Index on `appointments(therapist_id, appointment_date_time, status)`
- Additional indexes for common query patterns

### 7. Implemented Availability Caching
- Cache availability calculations for 15 minutes
- Cache invalidation when appointments change
- Reduces redundant availability checks for same therapist/time

### 8. Added Batch Processing
- Process therapists in configurable batches (default: 100)
- Reduces memory usage for large datasets
- Automatic batching for datasets > 500 therapists
- Progress logging for monitoring large operations

### 9. Removed Redundant Operations
- Eliminated `uniq { |t| t.id }` after `distinct`
- Only return available therapists when date/time specified
- Optimized memory usage with early filtering
- **Removed**: Ruby-side Jakarta Pusat special case filtering

## Implementation Files

### QueryHelper (`app/services/admin_portal/therapists/query_helper.rb`)
- Single-load therapist processing
- Unified SQL-based location filtering
- Jakarta Pusat → DKI Jakarta business rule implementation
- Jabodetabek detection and conditional filtering

### BatchQueryHelper (`app/services/admin_portal/therapists/batch_query_helper.rb`)
- Batch processing for large datasets
- Identical filtering logic to QueryHelper
- Memory-efficient processing for 10k+ therapists
- Progress logging and monitoring

## Business Rules Documentation

### Jakarta Pusat Rule
- **Rule**: "Allow Jakarta Pusat therapists for any DKI Jakarta location"
- **Implementation**: Location ID expansion when `location.city == "KOTA ADM. JAKARTA PUSAT"`
- **Result**: Therapists from any DKI Jakarta city can serve Jakarta Pusat appointments

### Jabodetabek Cross-City Availability
- **Rule**: Jabodetabek therapists can serve any Jabodetabek location
- **Implementation**: Permissive SQL filtering for Jabodetabek locations
- **Result**: Jakarta therapists can serve Bogor, Depok, Tangerang, Bekasi, etc.

### Non-Jabodetabek Restrictions
- **Rule**: Jabodetabek therapists should NOT serve non-Jabodetabek locations
- **Implementation**: Exclusionary SQL filtering for non-Jabodetabek locations
- **Result**: Bandung therapists only serve Bandung, not Jakarta

## Performance Results
- **Before**: 51.47s API, 39.56s docs (576 therapists)
- **After optimization**: 40.11s API, 24.54s docs
- **With caching**: 28.05s API, 23.98s docs
- **Expected with batching**: Further improvement for large datasets (>500 therapists)
- **After SQL unification**: Improved consistency and maintainability

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
- Location filtering: Check for Jabodetabek detection logs

## Testing
Test files for location filtering logic:
- `test/runner/test_fetch_therapists_availabiliies.rb`
- Tests for Jakarta Pusat → DKI Jakarta expansion
- Tests for Jabodetabek cross-city availability
- Tests for non-Jabodetabek restriction logic
