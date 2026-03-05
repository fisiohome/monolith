# Appointment Management

The appointment system manages home healthcare visits between therapists and patients, supporting multi-visit packages with sophisticated scheduling and status tracking.

**Key Topics:**
- **[Query Architecture](./appointment-query-architecture.md)** - Registration number-based queries and performance optimization
- **[Visit Number Reordering](./rescheduling/visit-number-reordering-fix.md)** - True chronological ordering and anomaly handling
- **[Appointment Rescheduling](./rescheduling/appointment-rescheduling.md)** - Complete rescheduling workflow and documentation

## Appointment Structure

### Initial Visit vs Series Appointments

Appointments are organized into series based on packages:

- **Initial Visit**: The first appointment in a package (reference appointment)
  - Identified by `appointment_reference_id: nil`
  - Acts as the parent for subsequent visits
  - Contains package and service information

- **Series Appointments**: Subsequent visits linked to the initial visit
  - Have `appointment_reference_id` pointing to the initial visit
  - Track progress via `visit_number` and `total_package_visits`
  - Inherit patient and package from the initial visit

### Multi-Visit Packages

Packages can include multiple visits (e.g., 5 sessions). The system:

1. Automatically creates series appointments when an initial visit is created
2. Tracks visit sequence with `visit_number` (1-based index)
3. Stores `total_package_visits` from the package
4. Maintains series integrity across all operations

## Status Workflow

### Status Definitions

| Status | Database Value | Description |
|--------|----------------|-------------|
| **Unscheduled** | `UNSCHEDULED` | Appointment has not been scheduled yet |
| **On Hold** | `ON HOLD` | Appointment is temporarily paused - clears date and therapist assignment |
| **Pending Therapist Assignment** | `PENDING THERAPIST ASSIGNMENT` | Waiting for therapist to be assigned |
| **Pending Patient Approval** | `PENDING PATIENT APPROVAL` | Waiting for patient confirmation |
| **Pending Payment** | `PENDING PAYMENT` | Waiting for payment processing |
| **Paid** | `PAID` | Appointment confirmed and paid |
| **Completed** | `COMPLETED` | Appointment has been completed |
| **Cancelled** | `CANCELLED` | Appointment has been cancelled |

### Status Transition Rules

The system enforces status transitions to maintain data integrity:

1. **Basic Rules**:
   - Unscheduled → Pending Therapist Assignment (when therapist assigned)
   - Pending Therapist Assignment → Pending Patient Approval (when date/time set)
   - Pending Patient Approval → Pending Payment (when patient confirms)
   - Pending Payment → Paid (when payment processed)
   - Paid → Completed (when service delivered)

2. **Special Cases**:
   - Any status → Cancelled (with proper permissions)
   - Paid → On Hold (for temporary pauses)
   - On Hold → Paid/Unscheduled/Pending Therapist Assignment/Pending Patient Approval (when resuming)
   - On Hold appointments automatically clear appointment_date_time and therapist_id

3. **Role-Based Overrides**:
   - SUPER ADMIN and ADMIN SUPERVISOR can bypass certain restrictions
   - Regular admins follow strict transition rules

4. **Series Constraints**:
   - Series appointments cannot have a status ahead of their initial visit
   - Cancelling an initial visit cascades to all series appointments
   - Putting initial visit on hold cascades to all series appointments (except completed ones)

## ON_HOLD Status Details

### Purpose and Behavior

The **ON_HOLD** status is used to temporarily pause appointments when:

- Patient requests postponement
- Therapist availability changes
- Payment or insurance issues need resolution
- Administrative review is required
- Service location or logistics need confirmation

### Automatic Data Clearing

When an appointment changes to ON_HOLD status, the system automatically:

```ruby
def clear_details_if_on_hold
  self.appointment_date_time = nil    # Removes scheduled date/time
  self.therapist_id = nil             # Removes therapist assignment
end
```

This ensures:
- Appointment cannot be accidentally completed while on hold
- Therapist schedule is freed up for other appointments
- Date/time slot becomes available for other patients

### Cascade Effects

For initial visits (reference appointments):
- All series appointments with same registration number also go ON_HOLD
- Except appointments already completed or already ON_HOLD
- Prevents partial series execution while initial visit is paused

### Valid Transitions FROM On Hold

- **On Hold → Unscheduled**: Return to unscheduled state
- **On Hold → Pending Therapist Assignment**: Ready to assign therapist
- **On Hold → Pending Patient Approval**: Skip therapist assignment, go directly to patient confirmation
- **On Hold → Paid**: Resume directly to paid status (admin override)

### Validation Rules

Appointments with ON_HOLD status:
- **Do NOT require** appointment_date_time (automatically cleared)
- **Do NOT require** therapist_id (automatically cleared)
- **Can still maintain** patient, service, and package relationships
- **Preserve** visit number and series integrity

### Query Examples

```ruby
# Find all on-hold appointments
Appointment.on_hold

# Find on-hold appointments for specific patient
Appointment.where(patient: patient).on_hold

# Check if appointment can be resumed
appointment.status_on_hold? #=> true/false
```

## Patient Information Requirements

When creating appointments, the system collects patient contact information with specific validation rules:

### Contact Information Fields

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| **Contact Name** | ✅ Yes | Min 3 characters | Must be provided |
| **Contact Phone** | ✅ Yes | Valid phone format | International format supported (E.164) |
| **Email** | ❌ Optional | Valid email format | Can be blank or omitted |
| **MiiTel Link** | ❌ Optional | Valid URL format | Optional call recording link |

### Email Validation Rules

The email field is **optional** to support scenarios where:
- Patient doesn't have an email address
- Contact person prefers phone-only communication
- Quick appointment creation without complete information

**Backend Validation** (`PatientContact` model):
```ruby
validates :email, 
  allow_blank: true,           # Email can be blank
  uniqueness: true,             # Must be unique if provided
  format: {                     # Valid email format required if provided
    with: URI::MailTo::EMAIL_REGEXP, 
    message: "must be a valid email address"
  }
```

**Frontend Validation** (Zod schema):
```typescript
email: z.string().email("Invalid email").or(z.literal("")).optional()
```
- Accepts valid email addresses
- Accepts empty strings
- Accepts undefined/null values
- Shows validation error only if email is provided with invalid format

### Contact Lookup Logic

When creating appointments, the system searches for existing patient contacts in priority order:

1. **Email-based lookup** (if email provided):
   ```ruby
   email = contact_params[:email].to_s.downcase.presence
   PatientContact.find_by(email: email) if email
   ```

2. **Phone-based lookup** (if email not provided or not found):
   ```ruby
   phone = contact_params[:contact_phone].to_s.gsub(/\D/, "").presence
   PatientContact.find_by(contact_phone: phone) if phone
   ```

3. **Create new contact** (if neither found):
   ```ruby
   PatientContact.create!(contact_params)
   ```

This ensures:
- Existing contacts are reused when possible
- Phone number alone is sufficient for contact identification
- Email uniqueness is maintained when provided
- Duplicate contacts are prevented

### Form Behavior

**UI Presentation**:
- Email field is shown but not marked as required
- No asterisk (*) indicator on email label
- Form can be submitted without email

**Data Flow**:
```
User Input → Frontend Validation → Backend Service → Model Validation
    ↓              ↓                      ↓                   ↓
Optional     Accept empty         Use .presence()      allow_blank: true
             or valid email       for safe checks
```

### Related Files

| File | Purpose |
|------|---------|
| `app/models/patient_contact.rb` | Model validation rules |
| `app/services/admin_portal/create_appointment_service_external_api.rb` | Contact lookup logic |
| `app/frontend/lib/appointments/form.ts` | Frontend Zod schema validation |
| `app/frontend/components/admin-portal/appointment/form/patient-contact.tsx` | Contact form UI |

## Key Validations

### 1. Time Collision Prevention

```ruby
validate :no_overlapping_appointments
validate :no_duplicate_appointment_time
```

Prevents overlapping appointments for:
- Same patient (even with different therapists)
- Same therapist (via daily limit validation)
- Same series (visit overlap prevention)

### 2. Visit Sequence Validation

```ruby
validate :validate_visit_sequence
```

Ensures:
- `visit_number` does not exceed `total_package_visits`
- Visit numbers are sequential within series
- No gaps in visit numbering

### 3. Therapist Daily Limit

```ruby
validate :therapist_daily_limit
```

Enforces maximum daily appointments per therapist based on their schedule configuration.

### 4. Series Integrity

```ruby
validate :validate_appointment_sequence
```

Maintains:
- Series appointments match the reference appointment's patient
- Package consistency across the series
- Proper chronological ordering

## Historical Data Tracking

The system maintains immutable historical snapshots for audit and reference:

### Address History

```ruby
has_one :address_history, dependent: :destroy
```

- Captures patient address at time of appointment creation
- Preserves original location even if patient moves later
- Used for distance calculations and therapist assignments

### Package History

```ruby
has_one :package_history, dependent: :destroy
```

- Stores package details at time of creation
- Protects against package price/feature changes
- Maintains billing consistency

### Status History

```ruby
has_many :status_histories, dependent: :destroy
```

Tracks all status changes:
- Previous and new status
- Timestamp of change
- User who made the change
- Reason for status change

## Appointment Lifecycle

### Creation Process

1. **Initial Visit Creation**:
   ```ruby
   # Creates initial visit
   appointment = Appointment.new(
     patient: patient,
     service: service,
     package: package,
     visit_number: 1,
     total_package_visits: package.total_visits
   )
   ```

2. **Series Generation**:
   ```ruby
   # Automatically creates remaining visits
   if appointment.save && package.total_visits > 1
     (2..package.total_visits).each do |visit_num|
       Appointment.create(
         # ... copy from initial
         visit_number: visit_num,
         appointment_reference_id: appointment.id
       )
     end
   end
   ```

### Status Updates

```ruby
# Mark as paid
appointment.mark_paid!(status_reason: "Payment received", updater: current_user)

# Mark as completed
appointment.mark_completed!(status_reason: "Service delivered", updater: current_user)

# Cancel with cascade
appointment.cascade_cancellation(updater: current_user, reason: "Patient request")
```

## Data Model

### Core Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `registration_number` | String | Unique appointment identifier |
| `appointment_date_time` | DateTime | Scheduled appointment time |
| `status` | Enum | Current appointment status |
| `status_reason` | String | Reason for current status |
| `visit_number` | Integer | Position in package series |
| `total_package_visits` | Integer | Total visits in package |
| `appointment_reference_id` | Integer | Links to initial visit |

### Associations

```ruby
belongs_to :patient
belongs_to :therapist, optional: true
belongs_to :service
belongs_to :package
belongs_to :location
belongs_to :updater, class_name: "Admin", optional: true

has_one :address_history, dependent: :destroy
has_one :package_history, dependent: :destroy
has_many :status_histories, dependent: :destroy

has_many :series_appointments, 
  class_name: "Appointment", 
  foreign_key: "appointment_reference_id"
```

## Scopes and Queries

### Common Scopes

```ruby
# Active appointments
scope :active, -> { where.not(status: ["CANCELLED", "COMPLETED"]) }

# Today and future
scope :today_and_future, -> { where("appointment_date_time >= ?", Time.current) }

# By status
scope :pending_payment, -> { where(status: "PENDING PAYMENT") }
scope :paid, -> { where(status: "PAID") }
scope :completed, -> { where(status: "COMPLETED") }
scope :on_hold, -> { where(status: "ON HOLD") }

# Initial visits only
scope :initial_visits, -> { where(appointment_reference_id: nil) }
```

### Complex Queries

```ruby
# Find overdue appointments
Appointment.where(
  "appointment_date_time < ? AND status NOT IN (?)",
  Time.current,
  ["COMPLETED", "CANCELLED"]
)

# Count by therapist for date range
Appointment.where(
  therapist_id: therapist_id,
  appointment_date_time: date_range
).group(:status).count
```

## Business Logic

### Payment Processing

```ruby
def paid?
  status_paid? || 
    Appointment.find_by(registration_number: registration_number)&.status_paid? || 
    Appointment.find_by(registration_number: registration_number)&.status_completed?
end
```

- Series appointments inherit paid status from initial visit via registration number lookup
- Payment can be made for entire package or individual visits
- Status cascades from initial visit to series

### Completion Rules

```ruby
def can_be_completed?
  status_paid? && 
  appointment_date_time.past? && 
  therapist.present?
end
```

- Only paid appointments can be completed
- Must be scheduled in the past
- Requires assigned therapist

### Cancellation Logic

```ruby
def cascade_cancellation(updater: nil, reason: nil)
  # Cancel all series appointments
  Appointment.where(registration_number: registration_number)
    .where.not(id: id)
    .where.not(status: :cancelled)
    .find_each do |appt|
      appt.update(
        status: :cancelled,
        status_reason: reason,
        updater: updater
      )
    end
end
```

- Cancelling initial visit cancels entire series
- Individual series appointments can be cancelled independently
- Refund logic handled separately

## API Endpoints

### Admin Portal Controllers

```ruby
# Main appointment management
class AdminPortal::AppointmentsController < ApplicationController
  # GET /admin-portal/appointments
  def index
    # List appointments with filters
  end
  
  # GET /admin-portal/appointments/:id
  def show
    # Show appointment details
  end
  
  # PATCH /admin-portal/appointments/:id
  def update
    # Update appointment details
  end
end

# Specific to therapist management
class AdminPortal::TherapistManagement::AppointmentsController < ApplicationController
  # Therapist-specific views and actions
end
```

### Response Format

```json
{
  "appointment": {
    "id": 123,
    "registration_number": "REG-2024-001",
    "status": "PAID",
    "status_human_readable": {
      "name": "Confirmed",
      "description": "Appointment confirmed and paid"
    },
    "patient": { ... },
    "therapist": { ... },
    "service": { ... },
    "package": { ... },
    "appointment_date_time": "2024-03-03T09:00:00Z",
    "visit_number": 1,
    "total_package_visits": 5
  }
}
```

## Frontend Integration

### React Components

- `AppointmentList`: Main listing with filters and pagination
- `AppointmentCard`: Individual appointment display
- `AppointmentForm`: Creation and editing form
- `StatusBadge`: Visual status indicator
- `AppointmentTimeline`: Series visualization

### State Management

```typescript
interface Appointment {
  id: number;
  registrationNumber: string;
  status: AppointmentStatus;
  patient: Patient;
  therapist?: Therapist;
  service: Service;
  package?: Package;
  appointmentDateTime: string;
  visitNumber: number;
  totalPackageVisits: number;
}
```

## Performance Considerations

### Database Indexes

```ruby
# Essential indexes for performance
add_index :appointments, :patient_id
add_index :appointments, :therapist_id
add_index :appointments, :appointment_date_time
add_index :appointments, :status
add_index :appointments, :registration_number
add_index :appointments, :appointment_reference_id
```

### Query Optimization

- Use `includes` to avoid N+1 queries
- Paginate large result sets
- Cache frequently accessed data
- Use database-specific functions for date calculations

## Security and Permissions

### Access Control

| Action | SUPER ADMIN | ADMIN SUPERVISOR | ADMIN | THERAPIST |
|--------|-------------|------------------|-------|-----------|
| View All Appointments | ✅ | ✅ | ✅ (own) | ❌ |
| Create Appointment | ✅ | ✅ | ✅ | ❌ |
| Edit Appointment | ✅ | ✅ | ✅ (own) | ❌ |
| Cancel Appointment | ✅ | ✅ | ✅ (own) | ❌ |
| Change Status | ✅ | ✅ | ✅ | ❌ |

### Audit Trail

All appointment changes are tracked:
- Created/updated timestamps
- User who made changes
- Status history with reasons
- IP address and user agent

## Troubleshooting

### Common Issues

1. **Series Appointment Mismatch**
   - Check `appointment_reference_id` consistency
   - Verify visit numbers are sequential
   - Ensure package matches initial visit

2. **Status Transition Errors**
   - Verify user permissions
   - Check current status
   - Review transition rules

3. **Overlap Validation Failures**
   - Check appointment durations
   - Verify buffer times
   - Review therapist schedules

### Debugging Tools

```ruby
# Check appointment integrity
appointment.series_integrity_valid?
#=> true/false

# Validate visit sequence
appointment.validate_visit_sequence
#=> [error messages]

# Check status transitions
appointment.valid_status_transition?(:paid)
#=> true/false
```

## Future Enhancements

Planned improvements:

1. **Recurring Appointments**: Support for recurring visit patterns
2. **Waitlist System**: Automatic filling of cancelled slots
3. **Smart Scheduling**: AI-powered appointment optimization
4. **Patient Preferences**: Remember patient scheduling preferences
5. **Telehealth Integration**: Mixed in-person/remote appointments

---

## Query Architecture

The appointment system uses **registration number-based queries** instead of `reference_appointment` delegations for better performance and data consistency.

**For detailed technical documentation**, see: **[Appointment Query Architecture](./appointment-query-architecture.md)**

---
