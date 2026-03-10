# Deadlock Prevention for Appointment Rescheduling

## Overview
This document outlines the implemented solutions to prevent and handle `PG::DeadlockDetected` errors during appointment rescheduling operations.

## Problem
Concurrent appointment rescheduling operations on the same series could cause database deadlocks, leading to failed operations and poor user experience.

## Solutions Implemented

### 1. Enhanced SeriesLocking Module (`app/services/concerns/series_locking.rb`)

#### Deadlock Detection
- Added specific handling for `PG::DeadlockDetected` exceptions
- Created `SeriesLockDeadlockError` custom exception
- Enhanced logging for deadlock scenarios

#### Lock Ordering Optimization
- **Consistent Lock Order**: All appointments locked by `:id` to prevent deadlock cycles
- **NOWAIT Strategy**: First attempt with `NOWAIT` to fail fast, fallback to regular lock
- **Exponential Backoff**: Retry mechanism with jitter to prevent synchronized retries

#### Retry Mechanism
- Handles both `SeriesLockTimeoutError` and `SeriesLockDeadlockError`
- Exponential backoff with random jitter (0.1s) to prevent thundering herd
- Maximum 3 retry attempts with increasing delays

### 2. ApplicationJob Configuration (`app/jobs/application_job.rb`)

#### Automatic Retry for All Jobs
```ruby
retry_on ActiveRecord::Deadlocked, wait: :exponentially_longer, attempts: 3
retry_on PG::DeadlockDetected, wait: :exponentially_longer, attempts: 3
```

### 3. UpdateAppointmentService Error Handling

#### User-Friendly Error Messages
- `LockTimeout`: "System is busy updating appointments. Please try again in a moment."
- `DeadlockError`: "System detected a conflict while updating appointments. Please try again."
- `VisitNumberConflict`: "Conflict detected while updating appointment. Please try again."

## Technical Details

### Lock Acquisition Strategy
1. **Order by ID**: `Appointment.where(registration_number: X).order(:id)`
2. **NOWAIT First**: Fast failure detection
3. **Fallback**: Regular lock with timeout
4. **Consistent Order**: Prevents A→B, B→A deadlock cycles

### Retry Logic
- **Base Delay**: 0.5 seconds
- **Exponential Backoff**: `delay * attempts + Random.rand * 0.1`
- **Max Attempts**: 3 retries
- **Jitter**: Random component to prevent synchronized retries

### Error Hierarchy
```
PG::DeadlockDetected
  ↓
SeriesLockDeadlockError (custom)
  ↓
Handled by with_series_lock_retry
  ↓
User-friendly message returned
```

## Usage Examples

### Direct Service Usage
```ruby
service = AdminPortal::UpdateAppointmentService.new(appointment, params, user)
result = service.call

if result[:success]
  # Success handling
else
  case result[:type]
  when "DeadlockError"
    # Show user-friendly conflict message
  when "LockTimeout"
    # Show busy system message
  end
end
```

### In Background Jobs
```ruby
class AppointmentRescheduleJob < ApplicationJob
  def perform(appointment_id, params, user_id)
    appointment = Appointment.find(appointment_id)
    user = User.find(user_id)
    
    service = AdminPortal::UpdateAppointmentService.new(appointment, params, user)
    service.call
  end
end
```

## Monitoring and Debugging

### Log Messages
- `[SeriesLocking] Deadlock detected for series XXX`
- `[SeriesLocking] DeadlockError - Retry 1/3 for series XXX`
- `[SeriesLocking] Max retries exceeded for series XXX`

### Error Tracking
Monitor these error types in your logging system:
- `SeriesLockDeadlockError`
- `SeriesLockTimeoutError`
- `VisitNumberAssignmentError`

## Performance Considerations

### Reduced Lock Contention
- **Fast Failure**: NOWAIT prevents long waits
- **Consistent Ordering**: Reduces deadlock probability
- **Jitter**: Prevents synchronized retry storms

### Database Impact
- **Minimal Overhead**: Ordering by ID is efficient
- **Reduced Long Transactions**: Fast failure prevents long-held locks
- **Better Concurrency**: Shorter lock hold times

## Testing

### Concurrency Tests
```ruby
test "concurrent rescheduling handles deadlocks gracefully" do
  # Simulate concurrent rescheduling operations
  # Verify deadlock detection and retry logic
  # Ensure user-friendly error messages
end
```

### Load Testing
- Test with multiple concurrent users rescheduling same series
- Monitor deadlock frequency before/after changes
- Verify retry logic effectiveness

## Configuration

### Retry Parameters (configurable)
```ruby
with_series_lock_retry(
  appointment, 
  max_retries: 3,        # Maximum retry attempts
  retry_delay: 0.5       # Base delay in seconds
)
```

### ApplicationJob Settings
- **Attempts**: 3 retries per job
- **Wait Strategy**: Exponentially longer waits
- **Error Types**: Both deadlock types handled

## Future Improvements

### Potential Enhancements
1. **Queue-Based Processing**: Use background jobs for high-contention scenarios
2. **Distributed Locks**: Redis-based locking for multi-server deployments
3. **Circuit Breaker**: Temporarily reject operations during high contention
4. **Optimistic Locking**: Version-based conflict detection

### Monitoring Dashboards
- Deadlock frequency tracking
- Retry attempt statistics
- Lock wait time distributions

## Troubleshooting

### Common Issues
1. **Persistent Deadlocks**: Check for inconsistent lock ordering in other code
2. **High Retry Rates**: Consider reducing concurrent operations or increasing delays
3. **User Complaints**: Verify error messages are clear and actionable

### Debugging Steps
1. Check logs for deadlock patterns
2. Verify lock ordering consistency
3. Monitor database lock statistics
4. Review concurrent operation patterns

This implementation provides comprehensive deadlock prevention and handling for appointment rescheduling operations.
