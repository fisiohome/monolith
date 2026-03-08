# Test for All of Day Availability Consistency

## Issue Description
Therapists were showing `available: true` but `availableSlots: []` when "All of Day" was enabled, even with bypass toggle on.

## Root Cause
The availability checks and time slot calculation were inconsistent:
1. `available?` method skipped time checks for "All of Day" but still checked daily limits and overlaps
2. `available_time_slots_for_date` always checked daily limits and overlaps
3. This created a mismatch where a therapist could be available but have no time slots

## Solution Implemented
Made the availability checks consistent for "All of Day" appointments:

### 1. Updated `available_time_slots_for_date`:
- Skip daily appointment limit check when `@is_all_of_day` is true
- Skip conflict checking for "All of Day" appointments (set conflict to false)

### 2. Updated `max_daily_appointments_check`:
- Skip daily limit check for "All of Day" appointments

### 3. Updated `no_overlapping_appointments_check`:
- Skip overlapping check for "All of Day" appointments

## Test Scenarios

### Scenario 1: Therapist with existing appointments
1. Create a therapist with 2 appointments on a day (max_daily_appointments = 3)
2. Set "All of Day" to true
3. Expected: `available: true` and `availableSlots` contains time slots

### Scenario 2: Therapist at daily limit
1. Create a therapist with 3 appointments on a day (max_daily_appointments = 3)
2. Set "All of Day" to true
3. Expected: `available: true` and `availableSlots` contains time slots

### Scenario 3: Therapist with overlapping appointments
1. Create a therapist with appointments that would conflict with normal time slots
2. Set "All of Day" to true
3. Expected: `available: true` and `availableSlots` contains time slots

### Scenario 4: With bypass toggle
1. Enable bypass toggle
2. Set "All of Day" to true
3. Expected: All therapists show time slots regardless of distance/duration constraints

## Files Modified
- `/workspaces/monolith/app/services/admin_portal/therapists/availability_service.rb`
  - Modified `available_time_slots_for_date` method
  - Modified `max_daily_appointments_check` method
  - Modified `no_overlapping_appointments_check` method

## Notes
- "All of Day" appointments are meant to be flexible, allowing admin users to schedule without strict time constraints
- The bypass toggle should show all therapists regardless of availability status
- Time slots for "All of Day" appointments are suggested times that can be adjusted
