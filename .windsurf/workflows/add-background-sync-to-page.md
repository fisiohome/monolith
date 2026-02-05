---
description: Add background data sync feature to a new admin page
---

# Add Background Sync to an Admin Page

This guide helps developers add the background data sync feature to new admin pages, following our established user experience patterns.

## User Experience Goals

When implementing background sync, focus on:
- **Immediate feedback** - Users know sync started instantly
- **Non-blocking workflow** - Users can continue working
- **Clear communication** - Status updates at every stage
- **Manual dismissal** - Users control when to close notifications
- **Detailed feedback** - Shows created, updated, failed, and skipped counts
- **Audit trail** - Complete record of who synced what and when

## Implementation Steps

### 1. Add Sync Support to the Job

First, ensure the background job can handle your data type:

```ruby
# app/jobs/master_data_sync_job.rb
def perform(sync_type, user_id = nil)
  # Create initial sync log for audit trail
  sync_log = SyncMonolithLogs.create!(
    user_id: user_id,
    sync_type: sync_type.to_s,
    status: :running,
    ui_message: "Sync started...",
    logger_message: "Starting #{sync_type} sync",
    started_at: Time.current
  )
  
  # ... existing code ...
  
  result = case sync_type.to_sym
           when :your_new_data_type
             service.your_sync_method
           # ... other types ...
           end
  
  # Update sync log with results
  sync_log.update!(
    status: result[:success] ? :completed : :failed,
    ui_message: result[:message] || result[:error],
    logger_message: result[:log_message] || result[:error],
    details: result[:error] || result[:details],
    completed_at: Time.current
  )
  
  # Store result in cache for status checking
  SyncStatusService.set(sync_type, result)
end
```

### 2. Create Controller Actions

The controller should provide JSON responses for the frontend:

```ruby
# app/controllers/admin_portal/your_controller.rb
module AdminPortal
  class YourController < ApplicationController
    # ... existing actions ...

    # PUT /admin-portal/your-resource/sync-data-master
    def sync_data_master
      # Enqueue background job with user attribution
      MasterDataSyncJob.perform_later(:your_sync_type, current_user&.id)
      
      render json: { 
        status: "running",
        message: "Sync started..."
      }
    end

    # GET /admin-portal/your-resource/sync-status
    def sync_status
      # Check cache for sync status
      status = SyncStatusService.get(:your_sync_type)
      
      # Check for running jobs
      running_jobs = SolidQueue::ClaimedExecution.joins(:job)
        .where(solid_queue_jobs: {class_name: "MasterDataSyncJob"})
        .where("solid_queue_jobs.arguments LIKE ?", "%your_sync_type%")
        .count
      
      if status.present?
        render json: status
      elsif running_jobs > 0
        render json: { 
          status: "running",
          message: "Sync in progress..."
        }
      else
        render json: { 
          status: "not_found",
          message: ""
        }
      end
    end
  end
end
```

### 3. Add Routes

Configure the endpoints:

```ruby
# config/routes.rb
namespace :admin_portal, path: "admin-portal" do
  resources :your_resource, path: "your-resource-path", only: [:index] do
    collection do
      put "sync-data-master"
      get "sync-status"
    end
  end
end
```

### 4. Implement the Frontend Experience

Use our standard sync hook for consistent UX:

```tsx
// app/frontend/pages/AdminPortal/YourResource/Index.tsx
import { X } from "lucide-react";
import { useCallback } from "react";
import { useMasterDataSync } from "@/hooks/admin-portal/use-master-data-sync";

export default function Index() {
  const { props: globalProps } = usePage<YourPageProps>();
  
  // Set up sync with user-friendly configuration
  const {
    isLoading: isSyncLoading,
    syncStatus,
    triggerSync,
    clearStatus,
  } = useMasterDataSync({
    syncEndpoint: `${globalProps.adminPortal.router.adminPortal.yourResource.index}/sync-data-master`,
    statusEndpoint: `${globalProps.adminPortal.router.adminPortal.yourResource.index}/sync-status`,
    onSyncComplete: () => {
      // Refresh data so users see updates immediately
      router.reload({ only: ["yourResource"] });
    },
    onSyncFailed: () => {
      // Optional: Handle sync failures
      console.error("Sync failed");
    },
    autoCheckOnMount: false, // Set to true to auto-check on page load
  });

  return (
    <PageContainer>
      {/* Sync Status Notification with Close Button */}
      {syncStatus.message && (
        <div className="p-4 rounded-md border relative">
          <button
            onClick={clearStatus}
            type="button"
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/10 transition-colors"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 pr-8">
            {syncStatus.type === "info" && (
              <LoaderIcon className="animate-spin h-4 w-4" />
            )}
            {syncStatus.type === "success" && (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{syncStatus.message}</span>
          </div>
        </div>
      )}

      {/* Sync button - only show to admins */}
      {globalProps?.auth?.currentUser?.["isSuperAdmin?"] && (
        <Button
          variant="primary-outline"
          disabled={isSyncLoading}
          onClick={(event) => {
            event.preventDefault();
            triggerSync();
          }}
        >
          {isSyncLoading ? (
            <>
              <LoaderIcon className="animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <RefreshCcw />
              <span>Sync Data</span>
            </>
          )}
        </Button>
      )}

      {/* Your page content */}
    </PageContainer>
  );
}
```

### 5. Implement Sync Method in MasterDataSyncService

Add your sync method with comprehensive tracking:

```ruby
# app/services/admin_portal/master_data_sync_service.rb
module AdminPortal
  class MasterDataSyncService
    # Add your GID constant at the top
    YOUR_RESOURCE_GID = "1234567890"

    def your_sync_method
      csv = fetch_and_parse_csv(gid: YOUR_RESOURCE_GID)
      required_headers = ["Column1", "Column2", "Column3"]
      
      # Validate headers
      validate_headers(csv, required_headers)

      # Track results
      results = {created: [], updated: [], skipped: [], failed: []}

      csv.each do |row|
        # Process each row
        begin
          # Your logic here
          results[:created] << {id: item.id, name: item.name}
        rescue => e
          results[:failed] << {name: row["Name"], error: e.message}
        end
      end

      # Build messages
      created_count = results[:created].count
      updated_count = results[:updated].count
      failed_count = results[:failed].count
      skipped_count = results[:skipped].count

      # Log message with full details for audit trail
      log_message = "Processed #{csv.count} items: #{created_count} created, #{updated_count} updated"
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:name]} (#{f[:error]})" }.join(", ")
        log_message += ", #{failed_count} failed: #{failure_reasons}"
      end
      if skipped_count > 0
        log_message += ", #{skipped_count} skipped"
      end
      log_message += "."

      # UI message - clean summary for users
      message = "Processed #{csv.count} items: #{created_count} created, #{updated_count} updated"
      message += ", #{failed_count} failed" if failed_count > 0
      message += ", #{skipped_count} skipped" if skipped_count > 0
      message += "."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing your resource: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results: {}}
    end
  end
end
```

## User Experience Checklist

When implementing background sync, ensure:

- ✅ **Immediate feedback** - Button shows loading state instantly
- ✅ **Clear messaging** - Shows created/updated/failed/skipped counts
- ✅ **Manual dismissal** - Users can close notifications anytime
- ✅ **Permission control** - Only authorized users can sync
- ✅ **Error handling** - Graceful failures with helpful messages
- ✅ **Progress persistence** - Status survives page refreshes
- ✅ **Auto-refresh** - Data updates automatically on completion
- ✅ **Detailed logging** - Full error details in logs for debugging
- ✅ **Audit trail** - Every sync is logged with user attribution
- ✅ **Duration tracking** - Performance metrics captured

## Common User Scenarios

### Scenario 1: Successful Sync
1. Admin clicks "Sync Data"
2. Button immediately shows "Syncing..."
3. Blue notification: "Sync started..."
4. After completion: Green notification "Processed 100 items: 10 created, 90 updated"
5. Data refreshes automatically
6. User can dismiss notification with X button
7. **NEW**: Sync is logged in database with full audit trail

### Scenario 2: Sync with Issues
1. Sync encounters some errors
2. Green notification appears: "Processed 100 items: 10 created, 85 updated, 5 failed"
3. Full error details available in logs and database
4. User knows exactly what failed
5. **NEW**: Failed items with specific reasons stored for audit

### Scenario 3: Page Refresh During Sync
1. Admin refreshes page while sync runs
2. Page loads and detects running sync
3. Blue notification appears: "Sync in progress..."
4. Continues tracking until completion

### Scenario 4: Audit Review
1. Manager wants to know who synced data and when
2. **NEW**: Check SyncMonolithLogs table for complete history
3. See user, timestamp, duration, and detailed results
4. Export reports for compliance if needed

## Writing User-Friendly Messages

### Good Examples:
- ✅ "Processed 1550 therapists: 0 created, 0 updated, 37 skipped"
- ✅ "Brands: 5 created, 10 updated, 2 failed. Packages: 20 created, 30 updated, 3 skipped"
- ✅ "Therapists: 10 created, 30 updated, 2 failed, 5 skipped, 3 FLAT skipped. Schedules: 5 created, 20 updated"

### Avoid:
- ❌ "Job enqueued"
- ❌ "Sync successful"
- ❌ Technical error messages in UI

## Testing the User Experience

1. **Happy Path**: Verify complete sync flow works smoothly
2. **Error Handling**: Test with network issues, permission errors
3. **Page Refresh**: Ensure status persists across refreshes
4. **Permission Check**: Verify non-admins can't see sync button
5. **Large Datasets**: Test with realistic data volumes
6. **Notification Dismissal**: Test close button functionality
7. **Audit Trail**: Verify sync logs are created correctly
8. **User Attribution**: Confirm correct user is logged

## Performance Considerations

- **Debounce rapid clicks** - Hook handles this automatically
- **Optimize polling** - 2-second intervals balance responsiveness
- **Cache results** - Status cached for 24 hours
- **Handle timeouts** - Reasonable limits on polling
- **Log efficiently** - Database indexes ensure fast queries

## Support Handoff

When handing off to support, document:
- What data types can be synced
- Common error scenarios and solutions
- Who has permission to sync
- Typical sync duration for different data sizes
- How to check logs for detailed errors
- **NEW**: How to query SyncMonolithLogs for audit history
- **NEW**: How to export sync reports

## Compliance & Audit

The sync log feature provides:
- **Complete audit trail** - Every sync operation recorded
- **User accountability** - Clear attribution of actions
- **Detailed failure tracking** - Specific reasons for issues
- **Performance metrics** - Duration and success rates
- **Export capability** - Reports for compliance reviews
