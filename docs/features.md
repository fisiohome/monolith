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

---

## Summary of Role-Based Access in Admin Management

| Feature               | SUPER ADMIN | ADMIN SUPERVISOR | ADMIN   |
| --------------------- | ----------- | ---------------- | ------- |
| Add Admin Account     | ✅           | ❌                | ❌       |
| Edit Admin Profile    | ✅ (All)     | ✅ (Own)          | ✅ (Own) |
| Change Admin Password | ✅ (Not own) | ❌                | ❌       |
| Suspend Admin Account | ✅ (Not own) | ❌                | ❌       |
| Delete Admin Account  | ✅ (Not own) | ❌                | ❌       |

---