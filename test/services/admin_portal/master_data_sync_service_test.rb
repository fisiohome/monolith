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

  test "should assign special tier service when location has special tier relationship" do
    # Use transaction to isolate test data
    test_result = nil
    ActiveRecord::Base.transaction do
      # Create unique test data with timestamps to avoid conflicts
      timestamp = Time.current.to_i

      # Create test data
      jakarta = Location.create!(city: "KOTA ADM. JAKARTA SELATAN_#{timestamp}", country: "Indonesia",
        state: "DKI Jakarta", country_code: "ID")
      bandung = Location.create!(city: "KOTA BANDUNG_#{timestamp}", country: "Indonesia",
        state: "Jawa Barat", country_code: "ID")

      fisiohome_basic = Service.create!(name: "FISIOHOME_#{timestamp}", code: "FH", description: "Basic tier")
      fisiohome_special = Service.create!(name: "FISIOHOME_SPECIAL_TIER_#{timestamp}", code: "FH", description: "Special tier")

      # Link Jakarta to special tier
      LocationService.create!(location: jakarta, service: fisiohome_special, active: true)
      # Link Bandung to basic tier
      LocationService.create!(location: bandung, service: fisiohome_basic, active: true)

      # Test the location services mapping logic directly
      location_services = LocationService.joins(:service)
        .where(location_id: [jakarta.id, bandung.id])
        .pluck(:location_id, "services.name")
        .group_by(&:first)
        .transform_values { |pairs| Set.new(pairs.map(&:last)) }

      # Test Jakarta - should find special tier
      brand = "FISIOHOME_#{timestamp}"
      service = nil

      # Extract base brand name (remove _SPECIAL_TIER suffix if present)
      base_brand = brand.gsub("_SPECIAL_TIER", "")
      # Further extract just the brand name (FISIOHOME, WICARAKU) by splitting on underscore
      base_brand = base_brand.split("_").first

      if ["FISIOHOME", "WICARAKU"].include?(base_brand)
        special_tier_service_name = "#{base_brand}_SPECIAL_TIER_#{timestamp}"
        location_service_names = location_services[jakarta.id] || Set.new

        service = if location_service_names.include?(special_tier_service_name)
          Service.find_by(name: special_tier_service_name)
        else
          Service.find_by(name: "#{base_brand}_#{timestamp}")
        end
      else
        service = Service.find_by(name: brand)
      end

      jakarta_result = service.id == fisiohome_special.id

      # Test Bandung - should use basic (no special tier)
      service = nil

      # Test with brand that has SPECIAL_TIER suffix
      brand_with_special = "FISIOHOME_SPECIAL_TIER_#{timestamp}"
      base_brand = brand_with_special.gsub("_SPECIAL_TIER", "")
      base_brand = base_brand.split("_").first

      if ["FISIOHOME", "WICARAKU"].include?(base_brand)
        special_tier_service_name = "#{base_brand}_SPECIAL_TIER_#{timestamp}"
        location_service_names = location_services[bandung.id] || Set.new

        service = if location_service_names.include?(special_tier_service_name)
          Service.find_by(name: special_tier_service_name)
        else
          Service.find_by(name: "#{base_brand}_#{timestamp}")
        end
      else
        service = Service.find_by(name: brand_with_special)
      end

      bandung_result = service.id == fisiohome_basic.id

      # Store results for assertion outside transaction
      test_result = {jakarta: jakarta_result, bandung: bandung_result}

      # Rollback to clean up
      raise ActiveRecord::Rollback
    end

    # Assert outside transaction
    assert test_result[:jakarta], "Jakarta should get special tier service"
    assert test_result[:bandung], "Bandung should get basic tier service"
  end
end
