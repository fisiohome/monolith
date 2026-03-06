# Appointment Rescheduling

The reschedule feature allows administrators to change appointment date/time and therapist assignments while maintaining data integrity across multi-visit series.

## Overview

Rescheduling is a complex operation that involves:
- Validating time conflicts
- Maintaining series integrity
- Updating visit sequences
- Preserving appointment status
- Notifying relevant parties

## Rescheduling Process

### 1. Preparation Phase

**Service**: `PreparationRescheduleAppointmentService`

Before showing the reschedule form, the system prepares:

```ruby
class PreparationRescheduleAppointmentService
  def initialize(appointment:, admin:)
    @appointment = appointment
    @admin = admin
  end

  def call
    {
      available_therapists: available_therapists,
      disabled_visits: disabled_visits,
      min_date: min_date
    }
  end
end
```

**Data Prepared**:
- **Available Therapists**: Filtered by location, service, and availability
- **Date Constraints**: Minimum date based on previous visits in the series
- **Disabled Visits**: List of dates/times where other series visits are scheduled

### 2. Validation Phase

Multiple validations run before applying changes:

#### Time Collision Detection

```ruby
def validate_no_overlapping_visits(initial)
  # Check same series visits
  other_visits.each do |other|
    if my_start < other_end && my_end > other_start
      errors.add(:appointment_date_time, "overlaps with visit #{other.visit_number}")
    end
  end
end

def no_overlapping_appointments
  # Check patient's other appointments
  Appointment.where(patient: patient)
    .where.not(id: id)
    .find_each do |existing|
    # Overlap logic here
  end
end
```

#### Therapist Availability

```ruby
# Check therapist schedule
schedule = therapist.therapist_appointment_schedule
available = GetTherapistAvailableService.new(
  therapist: therapist,
  date: proposed_date,
  service: service
).call
```

#### Status Validation

```ruby
# Paid appointments require therapist
def validate_paid_requires_therapist
  if status == "paid" && therapist_id.blank?
    errors.add(:therapist_id, "must be selected for paid appointments")
  end
end
```

### 3. Dynamic Visit Reordering

When an appointment is rescheduled to a different date/time, the system automatically reorders visit numbers based on chronological order:

**Example Scenario**:
```
Before:
- Visit 1: Dec 20, 2024
- Visit 2: Dec 23, 2024  ← Move to Dec 30
- Visit 3: Dec 27, 2024
- Visit 4: Dec 28, 2024
- Visit 5: Dec 29, 2024

After moving Visit 2 to Dec 30:
- Visit 1: Dec 20, 2024 (stays Visit 1)
- Visit 2: Dec 27, 2024 (was Visit 3)
- Visit 3: Dec 28, 2024 (was Visit 4)
- Visit 4: Dec 29, 2024 (was Visit 5)
- Visit 5: Dec 30, 2024 (was Visit 2)
```

**Implementation**:
```ruby
def reorder_series_visits
  return unless series? && appointment_date_time_changed?

  # Get all visits including initial
  initial_visit = Appointment.find_by(registration_number: registration_number, appointment_reference_id: nil)
  all_visits = [initial_visit] + initial_visit.series_appointments
  
  # Sort by date and update visit numbers
  all_visits.sort_by(&:appointment_date_time).each_with_index do |visit, index|
    visit.update_column(:visit_number, index + 1)
  end
end
```

### 4. Take-Out Visit Handling

**Special Case**: When an appointment's schedule is removed (appointment_date_time set to nil), the system uses different logic to avoid unnecessary reordering:

**Example Scenario**:
```
Before: Visit 2 (Mar 6), Visit 3 (Mar 9), Visit 4 (Mar 12), Visit 5 (unscheduled)
Take out: Visit 3 (set appointment_date_time = nil)
After:  Visit 2 (Mar 6), Visit 4 (Mar 12) becomes Visit 3, Visit 3 (unscheduled) becomes Visit 4, Visit 5 (unscheduled) becomes Visit 5
```

**Key Differences from Regular Rescheduling**:
- **Regular reschedule**: Full chronological reordering of ALL visits
- **Take-out**: Only scheduled visits are reordered, taken-out visit goes after them

**Implementation Details**:
```ruby
def handle_visit_number_changes
  # Detect take-out scenario (value to nil)
  if original_datetime.present? && new_datetime.nil?
    move_taken_visit_to_end
  else
    reorder_series_visit_numbers  # Regular rescheduling
  end
end

def move_taken_visit_to_end
  # Uses transaction with temporary numbers to avoid constraint violations
  # 1. Move all visits to temporary negative numbers
  # 2. Reorder scheduled visits chronologically (1, 2, 3...)
  # 3. Place taken-out visit after scheduled visits
  # 4. Shift unscheduled visits to make room
end
```

## Status Handling During Reschedule

### Paid Appointments

- **Status Remains**: "paid" status is preserved
- **Therapist Required**: Must select a therapist
- **No Status Regression**: Won't revert to pending states

### Unpaid Appointments

Status is automatically determined based on what's changed:

| Changed Fields | New Status |
|----------------|------------|
| Date + Therapist | `PENDING PATIENT APPROVAL` |
| Date Only | `PENDING THERAPIST ASSIGNMENT` |
| No Date/Time | `UNSCHEDULED` |

```ruby
def determine_status_after_reschedule
  if appointment_date_time.blank?
    "UNSCHEDULED"
  elsif therapist_id.blank?
    "PENDING THERAPIST ASSIGNMENT"
  else
    "PENDING PATIENT APPROVAL"
  end
end
```

## Rescheduling Constraints

### Date/Time Constraints

1. **Future Only**: Appointment must be scheduled in the future
   ```ruby
   validate :appointment_date_time_in_the_future
   ```
   **Note**: This validation is **disabled for admin internal** users via `ENABLE_STRICT_STATUS_VALIDATION = false`

2. **Same-Day Support**: ✅ **Fully Supported**
   - Admin internal users can reschedule to same-day without restrictions
   - No minimum advance booking requirements
   - Only collision with same-series visits is checked

3. **Series Order**: Cannot schedule before previous visits
   ```ruby
   def min_date
     initial_visit = Appointment.find_by(registration_number: registration_number, appointment_reference_id: nil)
     previous_visit = initial_visit.series_appointments
       .where("visit_number < ?", visit_number)
       .order(:visit_number)
       .last
     previous_visit&.appointment_date_time || Date.current
   end
   ```

4. **Business Hours**: Must be within therapist's working hours
   ```ruby
   # Checked in GetTherapistAvailableService
   ```

### Therapist Constraints

1. **Service Compatibility**: Therapist must provide the required service
2. **Location Rules**: Must respect therapist's availability rules
3. **Daily Limit**: Cannot exceed maximum daily appointments

## Frontend Implementation

### Reschedule Form Component

**Location**: `app/frontend/components/admin-portal/appointment/feature-form.tsx`

Key features:
- Date picker with disabled dates
- Time slot selection
- Therapist selection with availability
- Real-time validation feedback

### State Management

```typescript
interface RescheduleForm {
  appointmentDate: Date;
  appointmentTime: string;
  therapistId?: number;
  reason: string;
}

const [form, setForm] = useState<RescheduleForm>({
  appointmentDate: initialDate,
  appointmentTime: initialTime,
  therapistId: initialTherapist,
  reason: ""
});
```

### Validation Feedback

```typescript
// Real-time validation
const validateReschedule = async () => {
  const errors = await api.post('/appointments/validate-reschedule', {
    appointmentId,
    newDateTime: form.appointmentDate,
    therapistId: form.therapistId
  });
  
  if (errors.data.overlap) {
    setError("This time conflicts with another appointment");
  }
};
```

## API Endpoints

### Preparation Endpoint

```ruby
# GET /admin-portal/appointments/:id/reschedule/prepare
def prepare_reschedule
  service = PreparationRescheduleAppointmentService.new(
    appointment: @appointment,
    admin: current_admin
  )
  
  render json: service.call
end
```

**Response**:
```json
{
  "available_therapists": [
    {
      "id": 1,
      "name": "Dr. John Doe",
      "available": true,
      "availabilityDetails": {
        "isAvailable": true,
        "reasons": []
      }
    }
  ],
  "disabled_visits": [
    "2024-03-03T09:00:00Z",
    "2024-03-03T14:00:00Z"
  ],
  "min_date": "2024-03-01"
}
```

### Reschedule Endpoint

```ruby
# PATCH /admin-portal/appointments/:id/reschedule
def reschedule
  if @appointment.update(reschedule_params)
    # Handle success
    render json: { 
      success: true,
      appointment: @appointment.as_json(include: :therapist)
    }
  else
    # Handle errors
    render json: { 
      success: false,
      errors: @appointment.errors.full_messages
    }, status: :unprocessable_entity
  end
end
```

## Notification System

### Automatic Notifications

After successful reschedule:

1. **Patient Notification**:
   - Email/SMS with new appointment details
   - Calendar invitation update
   - Rescheduling reason included

2. **Therapist Notification**:
   - Schedule update
   - New appointment details
   - Travel time calculation

3. **Admin Notification**:
   - Confirmation of changes
   - Updated appointment list

### Notification Templates

```ruby
# Patient email template
class AppointmentRescheduledPatientMailer < ApplicationMailer
  def notify(appointment, old_date, reason)
    @appointment = appointment
    @old_date = old_date
    @reason = reason
    
    mail(
      to: appointment.patient.email,
      subject: "Your appointment has been rescheduled"
    )
  end
end
```

## Error Handling

### Common Error Scenarios

1. **Time Conflicts**:
   ```
   Error: "Appointment time overlaps with existing appointment"
   Solution: Show conflicting appointment details
   ```

2. **Therapist Unavailable**:
   ```
   Error: "Therapist is not available at selected time"
   Solution: Suggest alternative times
   ```

3. **Invalid Status**:
   ```
   Error: "Cannot reschedule completed appointment"
   Solution: Check appointment status first
   ```

### Error Recovery

```ruby
class RescheduleAppointmentService
  def call
    Appointment.transaction do
      # Attempt reschedule
      unless appointment.update(params)
        raise ActiveRecord::Rollback
      end
      
      # Send notifications
      send_notifications
      
      # Log activity
      create_activity_log
      
      appointment
    end
  rescue => e
    # Handle rollback and notify admin
    Rails.logger.error "Reschedule failed: #{e.message}"
    nil
  end
end
```

## Performance Considerations

### Database Optimization

1. **Index Usage**:
   ```sql
   -- Critical indexes for rescheduling queries
   CREATE INDEX idx_appointments_reference_date 
     ON appointments(appointment_reference_id, appointment_date_time);
   
   CREATE INDEX idx_appointments_therapist_date 
     ON appointments(therapist_id, appointment_date_time);
   ```

2. **Query Optimization**:
   - Use `includes` to avoid N+1 queries
   - Batch update visit numbers
   - Cache therapist availability

### Frontend Performance

1. **Lazy Loading**:
   - Load therapist availability on demand
   - Debounce validation requests
   - Use virtual scrolling for large lists

2. **Caching**:
   - Cache disabled dates
   - Store therapist availability in memory
   - Use React.memo for expensive renders

## Audit Trail

All rescheduling actions are tracked:

```ruby
# Activity log entry
ActivityLog.create!(
  admin: current_admin,
  appointment: appointment,
  action: "rescheduled",
  details: {
    from: old_appointment_date_time,
    to: new_appointment_date_time,
    from_therapist: old_therapist_id,
    to_therapist: new_therapist_id,
    reason: reschedule_reason
  },
  ip_address: request.remote_ip
)
```

## Testing Strategies

### Unit Tests

```ruby
RSpec.describe Appointment, "#reschedule" do
  it "reorders visits when rescheduled" do
    # Test visit reordering logic
  end
  
  it "validates time conflicts" do
    # Test overlap prevention
  end
  
  it "maintains status correctly" do
    # Test status preservation
  end
  
  it "handles take-out scenario without reordering others" do
    # Create 5-visit series
    visits = create_visit_series(5)
    
    # Take out Visit 3 (set appointment_date_time = nil)
    visits[2].update!(appointment_date_time: nil)
    
    # Reload all visits
    visits.each(&:reload)
    
    # Expect: Visit 3 moves to end, others keep numbers
    expect(visits[0].visit_number).to eq(1) # unchanged
    expect(visits[1].visit_number).to eq(2) # unchanged
    expect(visits[3].visit_number).to eq(3) # was Visit 4
    expect(visits[4].visit_number).to eq(4) # was Visit 5
    expect(visits[2].visit_number).to eq(5) # was Visit 3, now at end
    expect(visits[2].appointment_date_time).to be_nil
  end
end
```

## Best Practices

1. **Always Validate**: Check all constraints before applying changes
2. **Use Transactions**: Wrap all changes in a database transaction
3. **Notify Promptly**: Send notifications immediately after successful reschedule
4. **Log Everything**: Maintain complete audit trail
5. **Handle Gracefully**: Provide clear error messages and recovery options
6. **Consider Time Zones**: Always work in UTC, display in local time
7. **Test Edge Cases**: Series appointments, status transitions, conflicts

## Future Enhancements

Planned improvements:

1. **Bulk Rescheduling**: Reschedule multiple appointments at once
2. **Automatic Suggestions**: AI-powered optimal rescheduling times
3. **Patient Self-Service**: Allow patients to request reschedules
4. **Calendar Integration**: Direct calendar updates
5. **Waitlist Integration**: Automatically fill cancelled slots
