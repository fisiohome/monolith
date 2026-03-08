# Test for Bypass Toggle with All of Day Time Slots

## Test Scenario
When the bypass toggle is enabled and "All of Day" is selected, therapists should show their suggested time slots even if they are marked as unavailable.

## Steps to Test

1. Navigate to the appointment creation/rescheduling page
2. Fill in required fields (patient, service, location)
3. Set appointment date to today
4. Toggle "All of Day" to ON
5. Click "Find Therapists" - note which therapists appear
6. Enable "Bypass distance & duration rules" toggle
7. Click "Find Therapists" again
8. Verify that:
   - More therapists appear (including those previously marked as unavailable)
   - Each therapist shows "Suggested Time Slots" button when clicked
   - Time slots are displayed for all therapists, not just the available ones

## Expected Behavior
- Without bypass: Only therapists with `available: true` are shown
- With bypass: All therapists are shown, and those with time slots display them
- Time slots should be visible for all therapists when "All of Day" is enabled, regardless of their availability status

## Code Changes Made
1. Modified `mappingTherapists` in use-appointment-utils.tsx to include all therapists when bypassConstraints is true
2. Updated `handleBypassConstraintsMode` to properly handle both available and unavailable therapists
3. Ensured therapist selection component displays time slots based on `availabilityDetails?.availableSlots` regardless of availability status

## Files Modified
- `/workspaces/monolith/app/frontend/hooks/admin-portal/appointment/use-appointment-utils.tsx`
