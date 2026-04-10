# Draft Status Reason Feature

## Overview
Successfully implemented status reason management for appointment drafts, allowing admin users to set and update specific reasons for draft statuses through a dropdown interface.

## Implementation Details

### 1. Database Changes
- **Migration**: Added `status_reason` field to `appointment_drafts` table
- **Model**: Updated `AppointmentDraft` model with status reason constants and validation

### 2. Backend Components

#### Model Updates (`app/models/appointment_draft.rb`)
- **Status Reason Constants**: Predefined reasons with structured format:
  ```ruby
  STATUS_REASONS = [
    {
      labelEn: "Schedule approved",
      labelId: "Sudah menyetujui jadwal",
      value: "SCHEDULE_APPROVED"
    },
    {
      labelEn: "Waiting for patient confirmation",
      labelId: "Menunggu konfirmasi pasien",
      value: "WAITING_FOR_PATIENT_CONFIRMATION"
    },
    # ... more reasons
  ]
  ```
- **Helper Methods**: Methods for value-to-label mapping and options generation
- **Data Structure**: Three-part structure (labelEn, labelId, value) for internationalization support

#### Service Layer (`app/services/appointment_drafts_service.rb`)
- **New Method**: `update_status_reason(draft_id, status_reason)`
- **Authorization**: Only draft creator, PIC, or super admin can update
- **Error Handling**: Comprehensive error messages and logging

#### API Controller (`app/controllers/api/v1/appointments_controller.rb`)
- **Update Endpoint**: `PUT /api/v1/appointments/drafts/:id/status_reason`
- **Parameters**: `status_reason` (UPPER_CASE_WITH_UNDERSCORE value) in request body
- **Response**: Updated draft object with new status reason value
- **Controller Method**: `draft_update_status_reason` for consistency with draft naming pattern

#### Helper Updates (`app/helpers/appointment_drafts_helper.rb`)
- **Serialization**: Added `status_reason` to `serialize_draft` method
- **Consistency**: Status reason included in all API responses

### 3. Frontend Components

#### Type Definitions (`app/frontend/types/admin-portal/appointment-draft.ts`)
- **Interface Update**: Added optional `statusReason?: string` field

#### Type Definitions (`app/frontend/pages/AdminPortal/Appointment/Drafts.tsx`)
- **StatusReason Interface**: Structured type with labelEn, labelId, and value fields
- **Type Safety**: Comprehensive TypeScript interfaces for all status reason data
- **Helper Function**: `findLabelIdByValue` for mapping database values to display labels

#### UI Components (`app/frontend/pages/AdminPortal/Appointment/Drafts.tsx`)
- **New Column**: "Status Reason" column in the main table
- **Dropdown Action**: "Update Status Reason" menu item in actions dropdown
- **Dialog Component**: Modal dialog with categorized dropdown selection
- **Detail View**: Status reason displayed in expanded draft details
- **Buttons**: Update Status Reason buttons in both table and detail view

### 4. User Interface Features

#### Table Integration
- **Status Reason Column**: Shows current status reason or "N/A"
- **Actions Menu**: Dropdown with "Update Status Reason" option
- **Real-time Updates**: Table refreshes after successful update

#### Dialog Interface
- **Flat List Options**: Status reasons displayed as flat list with Indonesian labels
- **Value Mapping**: Select uses UPPER_CASE values, displays Indonesian labels
- **Validation**: Requires selection before submission
- **Error Handling**: Toast notifications for success/error states
- **Data Source**: Status reasons fetched from controller props, not separate API call

#### Detail View Enhancement
- **Info Block**: Status reason displayed in draft information section
- **Action Button**: Direct update button in detail view footer

### 5. API Endpoint

#### Request
```http
PUT /api/v1/appointments/drafts/:id/status_reason
Content-Type: application/json
X-CSRF-Token: [token]

{
  "status_reason": "WAITING_FOR_PATIENT_CONFIRMATION"
}
```

#### Response
```json
{
  "success": true,
  "draft": {
    "id": "123",
    "status_reason": "WAITING_FOR_PATIENT_CONFIRMATION",
    "...": "other draft fields"
  }
}
```

### 6. Authorization Rules

#### Who Can Update Status Reason
- **Draft Creator**: Admin who created the draft
- **Assigned PIC**: Admin assigned as primary or secondary PIC
- **Super Admin**: Users with super admin privileges

#### Access Control
- **Service Layer**: `can_manage_draft?` method enforces permissions
- **API Layer**: 403 response for unauthorized users
- **Frontend**: Menu items only shown to authorized users

### 7. Status Reason Options

#### Available Status Reasons
| Value (Database) | LabelId (UI Display) | LabelEn (English) |
|------------------|----------------------|------------------|
| `SCHEDULE_APPROVED` | `Sudah menyetujui jadwal` | `Schedule approved` |
| `WAITING_FOR_PATIENT_CONFIRMATION` | `Menunggu konfirmasi pasien` | `Waiting for patient confirmation` |
| `WAITING_FOR_KARPIS_CONFIRMATION` | `Menunggu konfirmasi karpis` | `Waiting for karpis confirmation` |
| `WAITING_FOR_PARTNER_CONFIRMATION` | `Menunggu konfirmasi mitra` | `Waiting for partner confirmation` |
| `STILL_LOOKING_FOR_THERAPIST` | `Masih dicarikan terapis` | `Still looking for therapist` |
| `WAITING_FOR_PATIENT_SCHEDULE` | `Menunggu jadwal pasien` | `Waiting for patient schedule` |

#### Data Structure
- **value**: UPPER_CASE_WITH_UNDERSCORE format for database storage
- **labelId**: Indonesian text for UI display
- **labelEn**: English text for reference and internationalization

### 8. Error Handling

#### Backend Errors
- **Draft Not Found**: 404 with descriptive message
- **Unauthorized**: 403 for permission violations
- **Validation Errors**: 422 with field-specific messages
- **Server Errors**: 500 with generic error message

#### Frontend Errors
- **Toast Notifications**: Success/error messages displayed to user
- **Dialog State**: Proper cleanup on error/cancel
- **Loading States**: Disabled buttons during API calls

### 9. Testing Considerations

#### Model Tests
- Status reason validation
- Constant definitions
- Association updates

#### Service Tests
- Authorization scenarios
- Success/error flows
- Edge cases (empty/null values)

#### Integration Tests
- API endpoint functionality
- Permission enforcement
- Response format validation

#### Frontend Tests
- Component rendering
- User interactions
- Error handling
- Accessibility compliance

### 10. Performance Considerations

#### Database Impact
- **Minimal Overhead**: Single string field addition
- **Index Strategy**: No additional indexes needed for draft queries
- **Query Performance**: No impact on existing draft listing queries

#### Frontend Performance
- **Component Optimization**: Efficient re-rendering with React hooks
- **Bundle Size**: Minimal increase due to shared components
- **Network**: Single API call for status reason updates
- **Data Loading**: Status reasons loaded with initial page load (no separate API call)
- **Inertia Pattern**: Server-side data preparation for better performance

### 11. Future Enhancements

#### Potential Improvements
- **Custom Reasons**: Allow custom status reason entries
- **Reason History**: Track status reason changes over time
- **Bulk Updates**: Update status reason for multiple drafts
- **Automation**: Automatic status reason suggestions based on draft state
- **Reporting**: Analytics on status reason patterns
- **Multi-language Support**: Extend labelId system for multiple languages
- **Status Reason Workflows**: Trigger actions based on specific status reasons

#### Integration Opportunities
- **Appointment Status**: Sync with final appointment status reasons
- **Notification System**: Alerts for specific status reason changes
- **Workflow Integration**: Trigger actions based on status reason selection

### 12. Troubleshooting

#### Common Issues
- **Permission Denied**: Verify user is draft creator or assigned PIC
- **Missing Options**: Check constants are properly loaded
- **Update Failure**: Verify CSRF token and API connectivity
- **Display Issues**: Check serialization includes status_reason field

#### Debug Steps
1. Check browser console for JavaScript errors
2. Verify network requests in developer tools
3. Check Rails logs for backend errors
4. Verify database migration has been applied
5. Test with different user permission levels

## Summary

The Draft Status Reason feature successfully provides:
- **Comprehensive Status Tracking**: Detailed reasons for draft states
- **User-Friendly Interface**: Intuitive dropdown selection with Indonesian labels
- **Robust Authorization**: Proper permission enforcement
- **Seamless Integration**: Consistent with existing draft management UI
- **Scalable Design**: Easy to extend with new status reasons
- **Internationalization Ready**: Structured data format supports multiple languages
- **Performance Optimized**: No additional API calls for status reason data
- **Type Safety**: Comprehensive TypeScript interfaces throughout the stack

This implementation enhances the appointment draft management system by providing better visibility into draft states and reasons for delays or issues, improving overall operational efficiency.
