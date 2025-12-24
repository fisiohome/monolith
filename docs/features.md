# Feature Overview

## HERE Maps Isoline Implementation

Our HERE Maps isoline implementation provides intelligent routing and coverage area calculations specifically designed for therapist availability and home healthcare service mapping. This system addresses the unique challenges of home healthcare logistics by using constraint-specific optimizations to deliver accurate, practical results.

### Why We Use Two Constraints

In home healthcare, particularly for therapist services, we need to consider both **time** and **distance** constraints because they serve different but complementary purposes:

**Time Constraints** focus on practical travel time, accounting for real-world factors like traffic, road conditions, and route efficiency. This is crucial for appointment scheduling and ensuring therapists can arrive on time. A 25km journey might take 30 minutes on a highway but 60 minutes through city streets.

**Distance Constraints** define the maximum service coverage area, regardless of travel time. This helps determine the geographic boundaries of service availability and ensures we don't exclude therapists who might be slightly further but can still provide timely service through efficient routes.

By using both constraints simultaneously, we create a more nuanced understanding of service availability that reflects real-world conditions rather than just straight-line distances.

### Why Each Constraint Has Different Query Parameters

Our constraint-specific parameter optimization is based on the fundamental differences between time and distance calculations:

**Time-based isolines** require high precision and real-time data because they directly impact appointment scheduling and patient satisfaction. We use quality-focused parameters with fine granularity to capture the subtle variations in travel time caused by traffic patterns, road conditions, and route choices.

**Distance-based isolines** prioritize performance and coverage area accuracy. Since distance calculations don't need real-time traffic data, we can optimize for speed while maintaining sufficient precision for service area mapping. This allows us to process larger coverage areas efficiently.

### Why Query Parameters Can Be Optimized for Each Constraint

The HERE Maps API provides extensive customization options that allow us to tailor each isoline calculation to its specific purpose:

**Routing Mode Optimization**: Time calculations use "short" routing to find the most direct paths, while distance calculations use "fast" routing to optimize for speed and efficiency.

**Traffic Data Strategy**: Real-time traffic is essential for accurate time calculations but unnecessary for distance mapping. By enabling traffic only when needed, we reduce API costs and improve performance.

**Shape Parameter Tuning**: Time isolines use higher point counts and finer resolution to capture precise boundaries, while distance isolines use optimized parameters for better performance on larger areas.

**Avoid Feature Selection**: Different avoid features are prioritized based on the constraint type. Time calculations avoid features that cause delays (toll booths, ferries, tunnels), while distance calculations avoid features that limit accessibility (highways, restricted areas).

### Real-World Benefits

This constraint-specific approach delivers tangible benefits for home healthcare operations:

**More Accurate Scheduling**: Time-based isolines with real-time traffic data provide reliable travel time estimates, reducing late arrivals and improving patient satisfaction.

**Better Resource Allocation**: Distance-based isolines help identify optimal therapist placement and service area boundaries, improving operational efficiency.

**Cost Optimization**: By using appropriate parameters for each constraint type, we minimize API usage while maximizing accuracy and performance.

**Improved User Experience**: The combination of both constraints provides a more realistic and practical view of service availability, helping patients and administrators make better decisions.

### Performance and Scalability

Our implementation is designed to handle the demands of a growing home healthcare network:

**Efficient Processing**: Constraint-specific optimizations reduce calculation time and API costs while maintaining accuracy.

**Scalable Architecture**: The system can handle multiple concurrent isoline calculations for different service areas and time periods.

**Intelligent Caching**: Results are cached appropriately to avoid redundant calculations for similar parameters.

**Error Resilience**: Comprehensive error handling ensures the system continues to function even when individual calculations fail.

### Integration with Therapist Availability

The isoline system integrates seamlessly with our therapist availability management:

**Dynamic Constraints**: Isoline parameters are automatically adjusted based on therapist availability rules and service requirements.

**Feasibility Checking**: The system can determine which therapists are within reach of specific patients, considering both time and distance constraints.

**Real-Time Updates**: As therapist availability changes, isoline calculations can be updated to reflect current service capacity.

**Multi-Service Support**: The system can handle different types of home healthcare services with varying time and distance requirements.

This sophisticated approach to isoline calculation ensures that our home healthcare platform provides accurate, practical, and efficient service area mapping that reflects real-world conditions and operational needs.

---

## Authentication and Authorization

Authentication and authorization are implemented using **Role-Based Access Control (RBAC)**, where each user is assigned a single role that determines their permissions within the system.

### Roles and Permissions

Each role is predefined to ensure proper segregation of duties. Below is the list of available roles and their hierarchy:

1. **SUPER ADMIN**  
   - The highest level of access in the system.
   - Full control over admin accounts and system configurations.
   
2. **ADMIN SUPERVISOR**  
   - Higher-level admin with access to specific management features.
   
3. **ADMIN**  
   - Entry-level admin with minimal privileges.
   
---

## Admin Management

The **Admin Management** section is accessible to all admin users. However, the features available depend on the role of the user. Below is a detailed breakdown of the features and their role-based permissions:

### Features

#### 1. Add Admin Account  
   - **Accessible to:** SUPER ADMIN only.  
   - **Description:**  
     Allows the creation of new admin accounts. SUPER ADMIN can assign roles during account creation.  

#### 2. Edit Admin Profile  
   - **Accessible to:**  
     - **SUPER ADMIN:** Can edit profiles of all admin accounts, including their roles, contact details, and permissions.  
     - **Other Admins:** Can only edit their own profile information, such as their contact details.  

   - **Description:**  
     Enables admins to update relevant profile information. SUPER ADMIN can use this feature to manage the system's overall user integrity.

#### 3. Change Admin Password  
   - **Accessible to:** SUPER ADMIN only.  
   - **Description:**  
     Allows SUPER ADMIN to reset passwords for any admin account. This is especially useful if an admin is locked out or has forgotten their password.  

#### 4. Suspend Admin Account  
   - **Accessible to:** SUPER ADMIN only.  
   - **Description:**  
     Enables SUPER ADMIN to suspend an admin account, effectively disabling their access to the system until reactivated.  

#### 5. Delete Admin Account  
   - **Accessible to:** SUPER ADMIN only.  
   - **Description:**  
     Allows SUPER ADMIN to permanently remove an admin account from the system.  
     - **Important Limitation:** SUPER ADMIN cannot delete their own account to ensure continuity of the role.

Upcoming list:

- Filter by admin type
- Filter Status
- Selectable item (all/per item) & actions (suspend, delete, or can be mass change password)
- Suspend by date

## Summary of Role-Based Access in Admin Management

| Feature               | SUPER ADMIN | ADMIN SUPERVISOR | ADMIN   |
| --------------------- | ----------- | ---------------- | ------- |
| Add Admin Account     | ✅           | ❌                | ❌       |
| Edit Admin Profile    | ✅ (All)     | ✅ (Own)          | ✅ (Own) |
| Change Admin Password | ✅ (Not own) | ❌                | ❌       |
| Suspend Admin Account | ✅ (Not own) | ❌                | ❌       |
| Delete Admin Account  | ✅ (Not own) | ❌                | ❌       |

---

## Appointment Management

The appointment system manages home healthcare visits between therapists and patients, supporting multi-visit packages with sophisticated scheduling and status tracking.

### Appointment Structure

**Initial Visit vs Series Appointments**: Appointments are organized into series based on packages. The first appointment is the **initial visit** (reference appointment), and subsequent visits are **series appointments** linked to the initial visit via `appointment_reference_id`.

**Multi-Visit Packages**: Packages can include multiple visits (e.g., 5 sessions). The system automatically creates series appointments when an initial visit is created, tracking progress via `visit_number` and `total_package_visits`.

### Status Workflow

Appointments follow a defined status lifecycle:

| Status | Description |
|--------|-------------|
| **Unscheduled** | Appointment has not been scheduled yet |
| **On Hold** | Appointment is temporarily paused |
| **Pending Therapist Assignment** | Waiting for therapist to be assigned |
| **Pending Patient Approval** | Waiting for patient confirmation |
| **Pending Payment** | Waiting for payment processing |
| **Paid** | Appointment confirmed and paid |
| **Completed** | Appointment has been completed |
| **Cancelled** | Appointment has been cancelled |

**Status Transition Rules**:
- Status transitions are validated to prevent invalid state changes
- Series appointments cannot have a status ahead of their initial visit
- SUPER ADMIN and ADMIN SUPERVISOR can bypass certain status restrictions
- Cancelling an initial visit cascades cancellation to all series appointments

### Key Validations

- **Time Collision Prevention**: Prevents overlapping appointments for the same patient or therapist
- **Visit Sequence**: Ensures visit numbers don't exceed package limits
- **Therapist Daily Limit**: Enforces maximum daily appointments per therapist schedule
- **Series Integrity**: Series appointments must match the reference appointment's patient and package

### Historical Data Tracking

The system maintains historical snapshots for audit and reference:
- **Address History**: Patient address at time of appointment creation
- **Package History**: Package details at time of creation
- **Status History**: Track of all status changes with timestamps and updater information

---

## Appointment Rescheduling

The reschedule feature allows administrators to change appointment date/time and therapist assignments while maintaining data integrity across multi-visit series.

### Dynamic Visit Reordering

When an appointment is rescheduled to a different date/time, the system automatically reorders visit numbers based on chronological order:

**Example**:
- Before: Visit 3 (Dec 23) moved to Dec 30 (after Visit 5)
- After: Visit 4 & 5 become Visit 3 & 4, original Visit 3 becomes Visit 5

This ensures visit numbers always reflect the actual chronological order of appointments.

### Time Collision Detection

Before applying any reschedule, the system validates:
- **Same-Series Collision**: Prevents scheduling at times that overlap with other visits in the same series
- **Patient Overlap**: Prevents the same patient from having overlapping appointments
- **Therapist Availability**: Checks if the selected therapist is available at the proposed time

**Overlap Calculation**: Two time slots overlap if `Start_A < End_B AND End_A > Start_B`, accounting for appointment duration plus buffer time.

### Reschedule Preparation

The `PreparationRescheduleAppointmentService` provides:
- **Available Therapists**: Filtered by location, service, and availability
- **Date Constraints**: Minimum date based on previous visits in the series
- **Disabled Visits**: List of dates/times where other series visits are scheduled (to prevent UI selection)

### Status Handling During Reschedule

- **Paid Appointments**: Status remains as "paid" when rescheduled
- **Unpaid Appointments**: Status is automatically determined based on therapist assignment:
  - With therapist → Pending Patient Approval
  - Without therapist (date only) → Pending Therapist Assignment
  - No date/time → Unscheduled

### Reschedule Constraints

- Appointment date/time must be in the future
- Paid appointments require a therapist to be selected
- Series appointments respect their relationship to the initial visit

---

## Feature Flags Management

Feature Flags let Admin teams turn specific product behaviors on or off instantly, without waiting for a new deployment. This makes it safer to launch changes gradually, test in non‑production environments, and quickly roll back a problematic release.

### What you can do with Feature Flags

- **Roll out new functionality safely** by enabling it in DEV or STAGING first.
- **Turn off a feature quickly** if it causes unexpected issues.
- **Keep environments independent**, so testing changes doesn’t affect production users.

### Access Control

| Feature | SUPER ADMIN | ADMIN SUPERVISOR | ADMIN | THERAPIST |
|---------|-------------|------------------|-------|-----------|
| View Feature Flags | ✅ | ✅ | ✅ | ❌ |
| Create Feature Flag | ✅ | ✅ | ✅ | ❌ |
| Toggle Feature Flag | ✅ | ✅ | ✅ | ❌ |
| Edit Feature Flag | ✅ | ✅ | ✅ | ❌ |
| Delete Feature Flag | ✅ | ✅ | ✅ | ❌ |

> **Note**: Feature Flags Management is only accessible to users with Admin roles. Therapist accounts do not have access to this feature.

### Navigation

The Feature Flags Management is located under the **Apps** submenu in the Admin Portal sidebar:

```
Admin Portal
└── Apps
    └── Feature Flags
```

### Environments

Feature flags are environment-specific. The same flag key can be enabled in one environment and disabled in another.

| Environment | Purpose |
|-------------|---------|
| **DEV** | Local development and testing |
| **STAGING** | Pre-production testing and QA |
| **PROD** | Live production environment |

A typical rollout looks like:
- **DEV**: create the flag and confirm it works
- **STAGING**: validate end‑to‑end and QA
- **PROD**: enable when ready (and disable quickly if needed)

### Feature Flag Structure

Each feature flag has:

| Field | Description | Example |
|-------|-------------|---------|
| **Key** | Unique name that represents what is being controlled | `ENABLE_VOUCHER_SYSTEM` |
| **Environment** | Target environment | `PROD` |
| **Is Enabled** | Whether the feature is currently active | `true` |
| **Created At** | When it was created | `2025-12-23T19:40:51.225Z` |
| **Updated At** | When it was last changed | `2025-12-23T19:42:16.398Z` |

### Operations

#### Viewing Feature Flags

The main screen shows the feature flags for the selected environment. From here you can:
- See which flags are **Enabled** or **Disabled**
- Check when a flag was last updated
- Use the **toggle** to switch a flag on or off quickly
- Open the **actions menu** to edit or remove a flag

**Switch environments** using the tabs at the top (DEV / STAGING / PROD).

#### Creating Feature Flags

You can create a flag for a single environment, or create the same key across multiple environments.

1. Click **"Create Feature Flag"** button
2. Fill in the form:
  - **Key**: choose a clear, descriptive name
  - **Environment**: Select target environment
  - **Enabled**: Toggle initial state
3. Click **"Create Feature Flag"** to save

**Naming tip**: Use clear, action-oriented names so anyone can understand what the flag controls.
- ✅ `ENABLE_NEW_BOOKING_FLOW`
- ✅ `SHOW_PROMOTIONAL_BANNER`
- ❌ `enableFeature` (wrong case)
- ❌ `new-feature` (wrong format)

#### Quick Toggle (Enable/Disable)

Each row includes a toggle switch to enable or disable the flag immediately. This is the fastest way to turn a feature on/off during testing or a production incident.

#### Editing a Feature Flag

To edit an existing flag:

1. Click the **Actions menu** (⋮) on the flag row
2. Select **"Edit"**
3. Update the enabled state
4. Click **"Update Feature Flag"** to save

> **Note**: The key and environment fields are locked during editing because they form the unique identifier for the flag. To change these, delete the flag and create a new one.

#### Deleting a Feature Flag

To delete a flag:

1. Click the **Actions menu** (⋮) on the flag row
2. Select **"Remove"**
3. Confirm deletion in the dialog

> **Warning**: Deletion is permanent. Ensure the flag is no longer referenced in application code before removing.

### Best Practices

#### Naming Conventions
- Use descriptive, action-oriented names: `ENABLE_`, `SHOW_`, `USE_`, `ALLOW_`
- Include the feature domain: `BOOKING_ENABLE_WAITLIST`, `PAYMENT_USE_NEW_GATEWAY`
- Keep names concise but meaningful

#### Lifecycle Management
1. **Create** flag in Development first
2. **Test** thoroughly in Development/Staging
3. **Enable** in Production when ready
4. **Clean up** unused flags periodically to avoid technical debt

#### Safety Guidelines
- Always test in lower environments before Production
- Keep internal notes (e.g., ticket link or release note) for what the flag controls
- Have a rollback plan before enabling critical features
- Monitor application behavior after toggling Production flags

### Common Use Cases

| Use Case | Example Flag |
|----------|--------------|
| New feature rollout | `ENABLE_NEW_APPOINTMENT_FLOW` |
| A/B testing | `SHOW_ALTERNATE_CHECKOUT` |
| Maintenance mode | `ENABLE_MAINTENANCE_BANNER` |
| Third-party integration | `USE_NEW_PAYMENT_PROVIDER` |
| Promotional features | `SHOW_HOLIDAY_PROMOTION` |
| Beta features | `ENABLE_BETA_DASHBOARD` |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Flag not appearing | Verify correct environment is selected |
| Toggle not working | Check network connectivity and API status |
| Cannot delete flag | Ensure no active references in codebase |
| Duplicate key error | Keys must be unique per environment |

---