# Appointment Overlap Validation

This document explains the appointment overlap validation system that prevents scheduling conflicts in the FisioHome platform.

## Overview

The appointment system includes multiple layers of validation to prevent overlapping appointments, ensuring no double bookings occur for patients or therapists. These validations consider appointment duration, buffer time, and different appointment statuses.

## Validation Layers

### 1. Patient Overlap Prevention (`no_overlapping_appointments`)

**Location**: `app/models/appointment.rb` (line 726-755)

Prevents a patient from having overlapping appointments, even if they have different start times.

```ruby
def no_overlapping_appointments
  return if appointment_date_time.blank? || patient.blank? || status_cancelled?

  current_start = appointment_date_time
  current_end = current_start + (total_duration_minutes || 0).minutes

  Appointment.where(patient: patient)
    .where.not(id: id)
    .where.not(therapist_id: nil)
    .find_each do |existing|
    # Skip if therapist doesn't have schedule
    next unless existing.therapist&.therapist_appointment_schedule

    # Check time overlap
    overlapping = current_start < existing_end && current_end > existing_start
    if overlapping
      errors.add(:appointment_date_time, "overlaps with (#{existing.registration_number})")
      break
    end
  end
end
```

**Key Points**:
- Only skips validation if appointment status is `CANCELLED`
- Requires therapist to be assigned (ignores appointments without therapists)
- Uses total duration including buffer time from therapist's schedule

### 2. Series Visit Overlap Prevention (`validate_no_overlapping_visits`)

**Location**: `app/models/appointment.rb` (line 858-888)

Prevents overlapping appointments within the same package series.

```ruby
def validate_no_overlapping_visits(initial)
  # Get all other visits in the series with scheduled times
  other_visits = ([initial] + initial.series_appointments.to_a)
    .reject { |appt| appt.id == id }
    .select { |appt| appt.appointment_date_time.present? }

  # Check for overlapping times
  other_visits.each do |other|
    if my_start < other_end && my_end > other_start
      errors.add(:appointment_date_time, 
        "overlaps with visit #{other.visit_number}/#{total_package_visits}")
      return true
    end
  end
end
```

**Key Points**:
- No status filtering - all appointments with times are checked
- Applies to all visits in a package series
- Shows specific visit number in error message

### 3. Therapist Daily Limit (`therapist_daily_limit`)

**Location**: `app/models/appointment.rb` (line 980-1005)

Prevents scheduling more appointments than a therapist's daily limit.

```ruby
def therapist_daily_limit
  return if appointment_date_time.blank? || therapist_id.blank? || status_cancelled?

  # Count non-cancelled appointments for this therapist on the same day
  appointments_count = Appointment.where(
    therapist_id: therapist_id,
    appointment_date_time: appt_date.all_day
  ).where.not(status: "CANCELLED")
    .where.not(id: id)
    .count

  if appointments_count > max_appts
    errors.add(:base, "#{therapist_name} is already assigned #{max_appts} appointments")
  end
end
```

**Key Points**:
- Only skips if status is `CANCELLED`
- Counts all non-cancelled appointments for the day
- Includes current appointment in count if creating new

## Status-Based Validation Rules

### Statuses That ARE Validated for Overlap

| Status | Description | Validated |
|--------|-------------|-----------|
| `PENDING THERAPIST ASSIGNMENT` | Waiting for therapist | ✅ Yes |
| `PENDING PATIENT APPROVAL` | Waiting for patient confirmation | ✅ Yes |
| `PENDING PAYMENT` | Waiting for payment | ✅ Yes |
| `PAID` | Confirmed and paid | ✅ Yes |
| `COMPLETED` | Appointment completed | ✅ Yes |
| `ON HOLD` | Temporarily paused | ✅ Yes |
| `SCHEDULED` | Scheduled appointment | ✅ Yes |

### Statuses That ARE NOT Validated for Overlap

| Status | Description | Validated |
|--------|-------------|-----------|
| `CANCELLED` | Appointment cancelled | ❌ No |
| `UNSCHEDULED` | No date/time set | ❌ No |

## Overlap Calculation Logic

The system uses the standard overlap formula:
```ruby
overlapping = start_a < end_b && end_a > start_b
```

**Duration Calculation**:
```ruby
total_duration_minutes = therapist.therapist_appointment_schedule.appointment_duration_in_minutes +
                        therapist.therapist_appointment_schedule.buffer_time_in_minutes
```

**Example Scenario**:
- Appointment 1: 09:00 - 10:00 (60 min duration + 15 min buffer)
- Appointment 2: 10:00 - 11:00
- Result: No overlap (Appointment 1 ends at 10:15, Appointment 2 starts at 10:00)
- Status: OVERLAP! Because 10:00 < 10:15

## Validation Triggers

### When Validations Run

1. **Creating New Appointment**
   - All validations run unless status is `CANCELLED`

2. **Updating Appointment**
   - `appointment_date_time` changed → All validations run
   - `therapist_id` changed → All validations run
   - Status changed → Some validations may skip

3. **Rescheduling**
   - All validations run with new date/time
   - Additional checks for series integrity

### Validation Order

1. `appointment_date_time_in_the_future` - Must be future date
2. `no_duplicate_appointment_time` - Exact time match check
3. `no_overlapping_appointments` - Patient overlap check
4. `validate_no_overlapping_visits` - Series overlap check
5. `therapist_daily_limit` - Daily count check

## Error Messages

### Patient Overlap
```
Appointment date time overlaps with (REG001) on March 3, 2026 09:00 AM — 10:15 AM
```

### Series Overlap
```
Appointment date time overlaps with visit 2/5 (REG002) on March 3, 2026 09:00 AM — 10:15 AM
```

### Therapist Daily Limit
```
Dr. John Doe is already assigned 8 appointments on Tuesday, March 3, 2026
```

## Special Cases

### Jakarta Region Exception
For location-based filtering, therapists in any DKI Jakarta location can serve patients in Jakarta Pusat, and vice versa. This does NOT affect overlap validation.

### Buffer Time Consideration
Buffer time is included in overlap calculations. If an appointment ends at 10:00 but has 15 minutes buffer, the slot is considered occupied until 10:15.

### Series Appointments
Series appointments respect their relationship to the initial visit but are still validated for overlaps with each other.

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `app/models/appointment.rb` | All validation logic |
| `app/services/admin_portal/preparation_index_appointment_service.rb` | Reschedule preparation |
| `app/frontend/components/admin-portal/appointment/feature-form.tsx` | Frontend validation display |

### Database Considerations

- Validations run at model level before database operations
- No database constraints for overlap (handled by application logic)
- Indexes on `patient_id`, `therapist_id`, and `appointment_date_time` for efficient queries

## Testing Scenarios

### Test Case 1: Simple Overlap
```
Appointment A: March 3, 09:00 - 10:00 (Patient 1, Therapist A)
Appointment B: March 3, 09:30 - 10:30 (Patient 1, Therapist B)
Result: BLOCKED (Patient overlap)
```

### Test Case 2: Buffer Time Overlap
```
Appointment A: March 3, 09:00 - 10:00 (60 min + 15 min buffer)
Appointment B: March 3, 10:05 - 11:00 (Same patient)
Result: BLOCKED (Buffer overlap: 10:05 < 10:15)
```

### Test Case 3: Different Patients
```
Appointment A: March 3, 09:00 - 10:00 (Patient 1, Therapist A)
Appointment B: March 3, 09:30 - 10:30 (Patient 2, Therapist A)
Result: BLOCKED (Therapist overlap via daily limit)
```

### Test Case 4: Cancelled Appointment
```
Appointment A: March 3, 09:00 - 10:00 (CANCELLED status)
Appointment B: March 3, 09:30 - 10:30 (Same patient)
Result: ALLOWED (Cancelled appointments ignored)
```

## Troubleshooting

### Common Issues

1. **Unexpected Overlap Error**
   - Check if buffer time is causing the overlap
   - Verify therapist schedule settings
   - Confirm appointment status isn't cancelled

2. **Daily Limit Error**
   - Check therapist's `max_daily_appointments` setting
   - Verify all appointments on that date
   - Ensure cancelled appointments are properly marked

3. **Series Overlap Error**
   - Check all visits in the package
   - Verify visit numbers are correct
   - Ensure rescheduling maintains chronological order

### Debugging Tips

1. Use Rails console to test overlap scenarios
2. Check `therapist_appointment_schedule` for duration settings
3. Verify appointment statuses in database
4. Test with different time zones if needed

## Future Enhancements

Potential improvements to consider:

1. **Configurable Validation Rules**: Allow admin to configure overlap rules per service type
2. **Advanced Scheduling**: Implement optimization algorithms for better therapist utilization
3. **Real-time Updates**: Use WebSockets for live availability updates
4. **Conflict Resolution**: Suggest alternative times when conflicts occur
