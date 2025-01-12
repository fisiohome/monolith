require "test_helper"

class LocationServiceTest < ActiveSupport::TestCase
  def setup
    @jakarta_selatan_fisiohome = location_services(:jakarta_selatan_fisiohome)
    @bandung_fisiohome = location_services(:bandung_fisiohome)
  end

  # Test validations
  test "valid location_service should be valid" do
    assert @jakarta_selatan_fisiohome.valid?
    assert @bandung_fisiohome.valid?
  end

  test "location_service should validate uniqueness of location-service combination" do
    duplicate_location_service = LocationService.new(
      location: @jakarta_selatan_fisiohome.location,
      service: @jakarta_selatan_fisiohome.service,
      active: true
    )
    assert_not duplicate_location_service.valid?
    assert_includes duplicate_location_service.errors[:location_id], "has already been taken"
  end

  # Test associations
  test "should belong to a location" do
    assert_equal locations(:jakarta_selatan), @jakarta_selatan_fisiohome.location
  end

  test "should belong to a service" do
    assert_equal services(:fisiohome), @jakarta_selatan_fisiohome.service
  end
end
