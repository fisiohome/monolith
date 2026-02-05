require "test_helper"

class SyncMonolithLogsTest < ActiveSupport::TestCase
  def setup
    @sync_log = sync_monolith_logs(:one)
    @failed_sync = sync_monolith_logs(:two)
    @running_sync = sync_monolith_logs(:running_sync)
  end

  test "should be valid with all attributes" do
    assert @sync_log.valid?
  end

  test "should belong to a user" do
    assert_respond_to @sync_log, :user
    assert_equal users(:admin_user), @sync_log.user
  end

  test "should require sync_type" do
    sync_log = SyncMonolithLogs.new(user: users(:admin_user), status: :completed)
    assert_not sync_log.valid?
    assert_includes sync_log.errors[:sync_type], "can't be blank"
  end

  test "should require status" do
    # Since the database provides a default value of "running",
    # we need to test that it can't be set to nil explicitly
    sync_log = SyncMonolithLogs.new(user: users(:admin_user), sync_type: "therapists", status: nil)
    assert_not sync_log.valid?
    assert_includes sync_log.errors[:status], "can't be blank"
  end

  test "should accept valid status values" do
    valid_statuses = %w[running completed failed partial]
    valid_statuses.each do |status|
      sync_log = SyncMonolithLogs.new(
        user: users(:admin_user),
        sync_type: "test",
        status: status
      )
      assert sync_log.valid?, "Status #{status} should be valid"
    end
  end

  test "should have scope by_sync_type" do
    assert_equal 1, SyncMonolithLogs.by_sync_type("therapists_and_schedules").count
    assert_equal 1, SyncMonolithLogs.by_sync_type("brands_and_packages").count
    assert_equal 1, SyncMonolithLogs.by_sync_type("locations").count
  end

  test "should have scope by_user" do
    admin_logs = SyncMonolithLogs.by_user(users(:admin_user))
    assert_equal 2, admin_logs.count
    assert_includes admin_logs, @sync_log
    assert_includes admin_logs, @running_sync

    super_admin_logs = SyncMonolithLogs.by_user(users(:super_admin_user))
    assert_equal 1, super_admin_logs.count
    assert_includes super_admin_logs, @failed_sync
  end

  test "should have scope recent" do
    recent_logs = SyncMonolithLogs.recent
    assert_equal 3, recent_logs.count
    # Should be ordered by created_at desc
    assert_equal recent_logs.first, SyncMonolithLogs.order(created_at: :desc).first
  end

  test "should have scope completed_or_failed" do
    completed_or_failed = SyncMonolithLogs.completed_or_failed
    assert_equal 2, completed_or_failed.count
    assert_includes completed_or_failed, @sync_log
    assert_includes completed_or_failed, @failed_sync
    assert_not_includes completed_or_failed, @running_sync
  end

  test "duration should return difference in seconds when both timestamps exist" do
    # 12:33:25 - 12:30:00 = 205 seconds
    assert_equal 205, @sync_log.duration
    assert_equal 15, @failed_sync.duration
  end

  test "duration should return nil when timestamps are missing" do
    assert_nil @running_sync.duration
  end

  test "should store details as JSON" do
    details = JSON.parse(@sync_log.details)
    assert_equal 5, details["therapists"]["created"]
    assert_equal 10, details["therapists"]["updated"]
    assert_equal 20, details["schedules"]["created"]
  end

  test "should handle long messages" do
    long_message = "A" * 1000
    sync_log = SyncMonolithLogs.create!(
      user: users(:admin_user),
      sync_type: "test",
      status: :completed,
      ui_message: long_message,
      logger_message: long_message,
      details: long_message,
      started_at: Time.current,
      completed_at: 5.minutes.from_now
    )
    assert_equal long_message, sync_log.ui_message
    assert_equal long_message, sync_log.logger_message
  end

  test "should create sync log with minimal required attributes" do
    sync_log = SyncMonolithLogs.create!(
      user: users(:admin_user),
      sync_type: "test_sync",
      status: :running,
      started_at: Time.current
    )
    assert sync_log.persisted?
    assert_equal "test_sync", sync_log.sync_type
    assert_equal "running", sync_log.status
  end

  test "should update status from running to completed" do
    assert_equal "running", @running_sync.status
    @running_sync.update!(
      status: :completed,
      completed_at: Time.current,
      ui_message: "Sync completed successfully"
    )
    assert_equal "completed", @running_sync.reload.status
    assert_not_nil @running_sync.completed_at
  end

  test "should calculate duration correctly across midnight" do
    sync_log = SyncMonolithLogs.create!(
      user: users(:admin_user),
      sync_type: "test",
      status: :completed,
      started_at: Time.zone.local(2026, 2, 3, 23, 59, 0),
      completed_at: Time.zone.local(2026, 2, 4, 0, 1, 30)
    )
    assert_equal 150, sync_log.duration # 1 minute and 30 seconds
  end
end
