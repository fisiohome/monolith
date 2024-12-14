# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

* ...

# Feature Overview

## Authentication and Authorization

Authentication and authorization are implemented using **Role-Based Access Control (RBAC)**, where each user is assigned a single role that determines their permissions within the system.

### Roles and Permissions

Each role is predefined to ensure proper segregation of duties. Below is the list of available roles and their hierarchy:

1. **SUPER ADMIN**  
   - The highest level of access in the system.
   - Full control over admin accounts and system configurations.
   
2. **ADMIN L1**  
   - Higher-level admin with access to specific management features.
   
3. **ADMIN L2**  
   - Mid-level admin with restricted access compared to ADMIN L1.
   
4. **ADMIN L3**  
   - Entry-level admin with minimal privileges.
   
5. **ADMIN BACKLOG**  
   - Role dedicated to handling backlog tasks, with limited access to the system.

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

| Feature               | SUPER ADMIN | ADMIN L1 | ADMIN L2 | ADMIN L3 | ADMIN BACKLOG |
| --------------------- | ----------- | -------- | -------- | -------- | ------------- |
| Add Admin Account     | ✅           | ❌        | ❌        | ❌        | ❌             |
| Edit Admin Profile    | ✅ (All)     | ✅ (Own)  | ✅ (Own)  | ✅ (Own)  | ✅ (Own)       |
| Change Admin Password | ✅ (Not own) | ❌        | ❌        | ❌        | ❌             |
| Suspend Admin Account | ✅ (Not own) | ❌        | ❌        | ❌        | ❌             |
| Delete Admin Account  | ✅ (Not own) | ❌        | ❌        | ❌        | ❌             |

---

This document outlines the features and permissions for the admin management system with clarity and detail. If additional features or permissions need to be documented, feel free to share!
