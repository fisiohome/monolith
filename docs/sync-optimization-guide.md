# Master Data Sync Optimization Guide

This guide provides strategies to optimize the MasterDataSyncService for handling large datasets without overwhelming server resources.

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
1. Reduce batch size to 50
2. Increase batch delay to 0.5 seconds
3. Lower memory threshold to 300MB
4. Run during off-peak hours

### For High-Concurrency Environments:
1. Increase database pool size
2. Reduce batch size to prevent long-running transactions
3. Consider read replicas for SELECT queries

### For Memory-Constrained Servers:
1. Set SYNC_BATCH_SIZE to 25-50
2. Set SYNC_MEMORY_THRESHOLD_MB to 200-300
3. Enable memory monitoring
4. Consider vertical scaling

## Troubleshooting

### Out of Memory Errors
- Reduce SYNC_BATCH_SIZE
- Lower SYNC_MEMORY_THRESHOLD_MB
- Ensure ENABLE_SYNC_MEMORY_MONITORING is true

### Database Timeouts
- Check for long-running transactions
- Reduce batch size
- Optimize database queries
- Check connection pool settings

### Slow Performance
- Monitor memory usage patterns
- Check GC frequency in logs
- Consider adding more indexes
- Profile the sync operation

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
