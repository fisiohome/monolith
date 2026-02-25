require "test_helper"

class AdminPortal::MasterDataSyncServiceTest < ActiveSupport::TestCase
  def setup
    @service = AdminPortal::MasterDataSyncService.new
  end

  test "normalize_telegram_id should add @ if missing" do
    assert_equal "@ikaprw27", @service.send(:normalize_telegram_id, "ikaprw27")
    assert_equal "@test123", @service.send(:normalize_telegram_id, "test123")
  end

  test "normalize_telegram_id should keep @ if present" do
    assert_equal "@ikaprw27", @service.send(:normalize_telegram_id, "@ikaprw27")
    assert_equal "@test123", @service.send(:normalize_telegram_id, "@test123")
  end

  test "normalize_telegram_id should handle nil" do
    assert_nil @service.send(:normalize_telegram_id, nil)
  end

  test "normalize_telegram_id should handle empty string" do
    assert_nil @service.send(:normalize_telegram_id, "")
  end

  test "normalize_telegram_id should handle whitespace" do
    assert_equal "@test123", @service.send(:normalize_telegram_id, "  test123  ")
    assert_equal "@test123", @service.send(:normalize_telegram_id, " @test123 ")
  end

  test "normalize_telegram_id should handle mixed case" do
    assert_equal "@TestUser", @service.send(:normalize_telegram_id, "TestUser")
    assert_equal "@TestUser", @service.send(:normalize_telegram_id, "@TestUser")
  end
end
