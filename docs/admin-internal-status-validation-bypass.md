# Admin Internal Status Validation Bypass

## Overview

Untuk kebutuhan admin internal, semua strict validation untuk update status appointment telah di-bypass menggunakan konstanta dan flag khusus.

## Implementation

### 1. Konstanta Kontrol
```ruby
# Di app/models/appointment.rb
ENABLE_STRICT_STATUS_VALIDATION = false  # Disabled untuk admin internal
```

### 2. Flag Skip Validation
```ruby
attr_accessor :skip_status_validation  # Flag untuk bypass semua validasi status
```

### 3. Validasi yang Di-bypass
Semua validasi strict berikut hanya dijalankan jika `ENABLE_STRICT_STATUS_VALIDATION = true`:
- `appointment_date_time_in_the_future`
- `validate_paid_requires_therapist`
- `validate_visit_sequence`
- `unscheduled_appointment_requirements`
- `validate_appointment_sequence`
- `no_duplicate_appointment_time`
- `no_overlapping_appointments`
- `therapist_daily_limit`

### 4. Automatic Bypass di Service
`AppointmentStatusUpdaterService` secara otomatis mengatur `skip_status_validation = true` saat update status.

## Usage

### Manual Control
```ruby
appointment.assign_attributes(skip_status_validation: true)
appointment.update(status: 'completed')
```

### Via Service (Recommended)
```ruby
service = AdminPortal::AppointmentStatusUpdaterService.new(appointment, current_user)
service.call(new_status: 'paid', reason: 'Payment received')
```

## Benefits

1. **No More Strict Validation Errors** - Admin internal bisa update status tanpa terhalang validation rules
2. **Flexible Control** - Bisa di-enable kembali jika needed dengan ubah konstanta
3. **Automatic Bypass** - Service otomatis bypass validation untuk admin use
4. **Preserved Core Validations** - Basic validations (presence, associations) tetap berjalan

## Testing

### Model Tests (AppointmentTest)
- ✅ `test_should_bypass_strict_validations_when_skip_status_validation_is_true`
- ✅ `test_should_enforce_strict_validations_when_skip_status_validation_is_false`
- ✅ `test_should_bypass_visit_sequence_validation_for_series_appointments`
- ✅ `test_skip_status_validation?_helper_method_works_correctly`
- ✅ `test_should_respect_ENABLE_STRICT_STATUS_VALIDATION_constant`

### Service Tests (AppointmentStatusUpdaterServiceTest)
- ✅ `test_should_automatically_set_skip_status_validation_flag_when_updating_status`
- ✅ `test_should_bypass_validation_when_updating_to_completed_status`
- ✅ `test_should_bypass_validation_when_updating_to_paid_status`
- ✅ `test_should_handle_invalid_status_gracefully`
- ✅ `test_should_work_with_problematic_appointment_data`
- ✅ `test_should_preserve_skip_status_validation_flag_after_service_call`
- ✅ `test_should_handle_all_valid_status_transitions`
- ✅ `test_should_handle_nil_reason_gracefully`
- ✅ `test_should_handle_empty_reason_gracefully`

### Fixed Strict Validation Tests
✅ **All existing strict validation tests have been fixed** to work with the new bypass system:
- `test_does_not_allow_appointments_in_the_past` - Uses `with_strict_validation_enabled` helper
- `test_prevents_duplicate_appointment_time` - Uses `with_strict_validation_enabled` helper
- `test_prevents_overlapping_appointments` - Uses `with_strict_validation_enabled` helper
- `test_blocks_a_5th_appointment_for_a_therapist` - Uses `with_strict_validation_enabled` helper
- `test_requires_a_therapist_when_marking_an_appointment_paid` - Uses `with_strict_validation_enabled` helper
- `test_visit_number_cannot_exceed_package's_total_visits` - Uses `with_strict_validation_enabled` helper
- `test_initial_visit_cannot_be_moved_to_a_date_later_than_any_series_visit` - Uses `with_strict_validation_enabled` helper
- `test_unscheduled_appointment_must_not_have_therapist_or_appointment_date_time` - Uses `with_strict_validation_enabled` helper

### Test Coverage
- **Bypass Functionality**: Verifies strict validations are skipped when flag is set
- **Edge Cases**: Handles problematic appointment data gracefully
- **Service Integration**: Ensures AppointmentStatusUpdaterService works correctly
- **Status Transitions**: Tests all valid status transitions work with bypass
- **Error Handling**: Validates proper error handling for invalid scenarios
- **Constant Control**: Confirms ENABLE_STRICT_STATUS_VALIDATION constant works
- **Legacy Tests**: All existing strict validation tests preserved and working
- **Clean Output**: No Ruby warnings during test execution

## Future Considerations

Jika suatu saat perlu strict validation untuk admin internal:
1. Ubah `ENABLE_STRICT_STATUS_VALIDATION = true`
2. Atau gunakan `skip_status_validation: false` secara manual

## Summary

Implementation ini telah berhasil:
- ✅ **Bypass Strict Validations** - Admin internal bisa update status tanpa validation errors
- ✅ **Comprehensive Testing** - 14 test cases mencakup semua skenario
- ✅ **Service Integration** - AppointmentStatusUpdaterService otomatis bypass validation
- ✅ **Flexible Control** - Bisa di-enable/disable melalui konstanta
- ✅ **Error Handling** - Edge cases dan problematic data handled gracefully
