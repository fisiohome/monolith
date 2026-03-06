# Admin Advance Booking Bypass Feature

## Overview
This feature allows internal admin users to bypass the standard 60-day advance booking limit when searching for therapist availability. This is useful for special cases, bulk scheduling, or administrative overrides.

## Implementation

### Configuration
Located in `app/services/admin_portal/therapists/availability_service.rb`:

```ruby
class AvailabilityService
  # Configuration constants for different usage contexts
  BYPASS_ADVANCE_BOOKING_FOR_ADMIN = true # Bypass advance booking limit for internal admin usage
```

### How It Works
1. **Standard Behavior**: Users can only book appointments within 60 days from current date
2. **Admin Bypass**: When `BYPASS_ADVANCE_BOOKING_FOR_ADMIN = true`, the advance booking check is skipped
3. **API Impact**: All therapist search endpoints (`/api/v1/therapists/feasible`) respect this setting

### Code Changes
- Added `BYPASS_ADVANCE_BOOKING_FOR_ADMIN` constant
- Modified `advance_booking_check` method to return early when bypass is enabled
- Updated documentation to explain admin usage

## Testing Results

### Before Bypass
- May 5th 2026: ✅ Available (exactly 60 days)
- May 6th 2026: ❌ Not available (61 days - exceeds limit)
- May 7th 2026: ❌ Not available (62 days - exceeds limit)

### After Bypass
- May 5th 2026: ✅ Available 
- May 6th 2026: ✅ Available (bypass works!)
- May 7th 2026: ❌ Not available (no weekly schedule, not advance booking issue)

## Usage

### To Enable Bypass
Set `BYPASS_ADVANCE_BOOKING_FOR_ADMIN = true` in `AvailabilityService`

### To Disable Bypass  
Set `BYPASS_ADVANCE_BOOKING_FOR_ADMIN = false` in `AvailabilityService`

## Security Considerations
- This bypass applies to ALL uses of the AvailabilityService
- Consider implementing user role-based checks if more granular control is needed
- Monitor usage to ensure appropriate admin access

## Future Enhancements
1. **Role-based bypass**: Only apply bypass for specific admin roles
2. **Date-based bypass**: Allow bypass for specific date ranges
3. **Audit logging**: Track when bypass is used for compliance
4. **Configuration via database**: Make this setting configurable without code deployment
