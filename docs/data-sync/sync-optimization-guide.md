# Master Data Sync Optimization Guide

This guide provides strategies to optimize the MasterDataSyncService for handling large datasets without overwhelming server resources.

## Understanding Batching in Sync Operations

### How Batching Works

The sync system uses **automatic batching** to process large datasets efficiently. This is important to understand:

1. **Single Sync Operation**: When you click sync, it runs ONE complete sync job
2. **Internal Batching**: The system automatically splits data into batches internally
3. **Transparent Processing**: Users see only one sync operation, regardless of data size

### Example Flow

For 2,000 records with `BATCH_SIZE = 100`:

```
User clicks sync → Single sync job starts
├── Batch 1: Processes records 1-100
│   ├── Database transaction commits
│   ├── Memory check (GC if needed)
│   └── 0.1s delay
├── Batch 2: Processes records 101-200
│   └── ... (same pattern)
├── ... (continues for all batches)
└── Batch 20: Processes records 1,901-2,000
    └── Returns final aggregated result
```

### Key Benefits

- **Memory Efficiency**: Never loads more than BATCH_SIZE records in memory
- **Transaction Safety**: Each batch is atomic - failures don't affect other batches
- **Progress Tracking**: Can monitor progress through large datasets
- **Server Stability**: Small delays prevent CPU/memory spikes

### Common Misconceptions

❌ **Wrong**: "I need to sync multiple times for large datasets"
✅ **Right**: "One sync operation handles all data automatically"

❌ **Wrong**: "Batch size means how many syncs I need to run"
✅ **Right**: "Batch size is an internal performance optimization"

## Current Optimizations Implemented

### 1. Batch Processing
- Records are processed in configurable batch sizes (default: 100)
- Each batch runs in a separate transaction
- Prevents memory buildup from large transactions

### 2. Memory Monitoring
- Automatic memory usage tracking during sync
- Triggers garbage collection when memory threshold is exceeded (default: 500MB)
- Logs memory usage before and after GC

### 3. Progress Logging
- Logs progress every N batches (default: 10)
- Shows percentage completion
- Helps monitor long-running sync operations

### 4. Batch Delays
- Small delay between batches (default: 0.1 seconds)
- Prevents CPU spikes and allows other processes to run
- Configurable based on server capacity

## Configuration Options

Set these environment variables in `.env` or server configuration:

```bash
# Batch size for processing records
SYNC_BATCH_SIZE=100

# Memory threshold in MB to trigger garbage collection
SYNC_MEMORY_THRESHOLD_MB=500

# Enable/disable memory monitoring
ENABLE_SYNC_MEMORY_MONITORING=true

# Delay between batches in seconds
SYNC_BATCH_DELAY=0.1

# Enable/disable progress logging
ENABLE_SYNC_PROGRESS_LOGGING=true

# Progress log interval (every N batches)
SYNC_PROGRESS_LOG_INTERVAL=10
```

### Batch Size Guidelines

| Dataset Size | Recommended Batch Size | Reason |
|--------------|----------------------|--------|
| < 1,000 records | 100-200 | Standard setting, good balance |
| 1,000-10,000 records | 100 | Default, works well for most cases |
| 10,000-50,000 records | 50-100 | Smaller batches prevent memory issues |
| > 50,000 records | 25-50 | Conservative for very large datasets |

### Impact of Batch Size

| Batch Size | Pros | Cons |
|------------|------|------|
| 25 | Low memory usage, quick transactions | More database roundtrips, slower overall |
| 50 | Good balance, moderate memory | Slightly more DB load |
| 100 | Optimal for most cases (default) | Higher memory per batch |
| 200 | Faster for small datasets | Risk of memory spikes |

## Additional Optimization Strategies

### 1. Database Indexes
Ensure proper indexes on frequently queried fields:
```sql
-- Add indexes if not exists
CREATE INDEX CONCURRENTLY index_therapists_on_name_gender ON therapists(name, gender);
CREATE INDEX CONCURRENTLY index_therapists_on_employment_type ON therapists(employment_type);
CREATE INDEX CONCURRENTLY index_users_on_email ON users(email);
```

### 2. Connection Pooling
Configure database connection pool in `database.yml`:
```yaml
production:
  pool: 20  # Increase for concurrent operations
  timeout: 5000
```

### 3. Background Processing
For very large datasets (>10,000 records):
- Consider running sync during off-peak hours
- Use Sidekiq or Solid Queue with lower priority
- Implement checkpoint/resume functionality

### 4. Resource Limits
Set appropriate limits in your deployment:
```yaml
# Kubernetes example
resources:
  limits:
    memory: "2Gi"
    cpu: "1000m"
  requests:
    memory: "1Gi"
    cpu: "500m"
```

### 5. Monitoring and Alerting
Set up alerts for:
- Memory usage > 80%
- Sync duration > expected threshold
- High failure rates
- Database connection exhaustion

## Performance Tuning

### For Large Datasets (>50,000 records):
1. Reduce batch size to 25-50
2. Increase batch delay to 0.5 seconds
3. Lower memory threshold to 300MB
4. Run during off-peak hours
5. Consider splitting into multiple sync operations by date ranges

### For High-Concurrency Environments:
1. Increase database pool size
2. Reduce batch size to 50 to prevent long-running transactions
3. Set batch delay to 0.2-0.3 seconds
4. Consider read replicas for SELECT queries
5. Monitor database connection usage

### For Memory-Constrained Servers:
1. Set SYNC_BATCH_SIZE to 25-50
2. Set SYNC_MEMORY_THRESHOLD_MB to 200-300
3. Enable memory monitoring (ENABLE_SYNC_MEMORY_MONITORING=true)
4. Increase batch delay to 0.3-0.5 seconds
5. Consider vertical scaling or adding more RAM

### Batch Processing Examples

#### Example 1: Production Server with 100,000+ records
```bash
SYNC_BATCH_SIZE=25
SYNC_MEMORY_THRESHOLD_MB=250
SYNC_BATCH_DELAY=0.5
ENABLE_SYNC_MEMORY_MONITORING=true
SYNC_PROGRESS_LOG_INTERVAL=5
```

#### Example 2: Development Environment
```bash
SYNC_BATCH_SIZE=100
SYNC_MEMORY_THRESHOLD_MB=500
SYNC_BATCH_DELAY=0.1
ENABLE_SYNC_MEMORY_MONITORING=true
SYNC_PROGRESS_LOG_INTERVAL=10
```

#### Example 3: High-Traffic Production
```bash
SYNC_BATCH_SIZE=50
SYNC_MEMORY_THRESHOLD_MB=400
SYNC_BATCH_DELAY=0.3
ENABLE_SYNC_MEMORY_MONITORING=true
SYNC_PROGRESS_LOG_INTERVAL=20
```

## Troubleshooting

### Out of Memory Errors
- Reduce SYNC_BATCH_SIZE (try 25 or 50)
- Lower SYNC_MEMORY_THRESHOLD_MB (try 200-300)
- Ensure ENABLE_SYNC_MEMORY_MONITORING is true
- Check logs for GC frequency

### Database Timeouts
- Check for long-running transactions
- Reduce batch size to 50 or less
- Optimize database queries
- Check connection pool settings
- Increase database timeout if necessary

### Slow Performance
- Monitor memory usage patterns in logs
- Check GC frequency - too many GC calls indicate memory pressure
- Consider adding more indexes
- Profile the sync operation with timing
- Reduce batch size if individual batches are slow

### Batch Monitoring in Logs

Look for these patterns in your logs:

```log
# Progress tracking
Locations sync progress: 500/2000 (25.0%) - Batch 5

# Memory monitoring
Memory usage: 245MB (threshold: 500MB)
Memory usage: 495MB (threshold: 500MB) - Triggering garbage collection
Memory usage after GC: 320MB

# Batch completion
Processed 100 locations in batch 3
```

### Performance Metrics to Track

1. **Average Batch Duration**: Should be consistent across batches
2. **Memory Usage Pattern**: Should not continuously increase
3. **GC Frequency**: More than 1 GC per 10 batches may indicate memory issues
4. **Database Connection Usage**: Should not exceed pool size
5. **Overall Sync Duration**: Helps predict completion time for large datasets

## Best Practices

1. **Test with subsets**: Always test with a small dataset first
2. **Monitor resources**: Keep an eye on CPU, memory, and database metrics
3. **Schedule appropriately**: Run large syncs during low-traffic periods
4. **Keep backups**: Always backup before large sync operations
5. **Document changes**: Track any performance-related configuration changes

## Future Enhancements

1. **Parallel Processing**: Process multiple batches concurrently
2. **Streaming CSV**: Process CSV in chunks instead of loading all into memory
3. **Incremental Sync**: Only sync changed records
4. **Resume Capability**: Resume from last successful batch on failure
5. **Distributed Sync**: Distribute sync across multiple servers
