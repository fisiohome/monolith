# Draft Expiration Test Script

## Overview
This script tests the appointment draft expiration functionality without requiring UI interaction.

## Usage

### Run All Tests
```bash
rails runner scripts/test_draft_expiration.rb
```

### What It Tests

1. **Draft Creation** - Verifies drafts can be created successfully
2. **Manual Expiration** - Tests direct draft expiration with appointment
3. **Service-Based Expiration** - Tests expiration through CreateAppointmentServiceExternalApi
4. **Error Handling** - Tests edge cases and error scenarios

### Key Features Tested

- ✅ Draft creation with proper admin assignment
- ✅ Manual draft expiration with appointment linking
- ✅ Service-based draft expiration using CreateAppointmentServiceExternalApi
- ✅ Error handling for non-existent drafts
- ✅ Error handling for nil appointments

### Test Data

The script uses existing data from your database:
- First admin user (Tech Admin)
- First patient record
- First service, package, and location records

### CreateAppointmentServiceExternalApi Integration

The test properly initializes and uses the `CreateAppointmentServiceExternalApi` with:
- Correct `ActionController::Parameters` format
- All required nested parameters (patient, patient_contact, patient_address, appointment)
- **draftId included in payload** (both root level and within appointment object)
- **Clean separation**: `draft_id` handled separately from appointment parameters
- **Simplified logic**: Only targeted draft expiration (no auto-expiration)
- Proper draft_id handling for targeted expiration

### Draft ID Transmission

The `draftId` is sent through the request payload in two ways:
1. **Root level**: `{ draftId: "123", appointment: {...} }`
2. **Within appointment**: `{ appointment: { draftId: "123", ... } }`

The service extracts it using: `params[:draft_id] || params.dig(:appointment, :draft_id)` and stores it in `@draft_id` for targeted draft expiration only.

### Simplified Draft Expiration Logic

The service now only supports:
- **Targeted expiration**: When `draft_id` is provided, expire that specific draft
- **No auto-expiration**: Removed auto-expiration of all admin drafts when no `draft_id` provided

### Cleanup

All test data is automatically cleaned up after each test to avoid database pollution.

## Troubleshooting

If tests fail, check:
1. Sufficient test data exists (admin, patient, service, package, location)
2. Database connection is working
3. Required fields are properly configured

## Integration with Service

The script tests the exact same expiration logic used in:
- `AdminPortal::CreateAppointmentServiceExternalApi` - Service-based expiration
- `AppointmentDraft.expire_with_appointment!` - Direct model expiration
