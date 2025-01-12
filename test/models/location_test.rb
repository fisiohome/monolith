require "test_helper"

class LocationTest < ActiveSupport::TestCase
  def setup
    @jakarta_selatan = locations(:jakarta_selatan)
    @bandung = locations(:bandung)
  end

  # Test validations
  test "valid location should be valid" do
    assert @jakarta_selatan.valid?
    assert @bandung.valid?
  end

  test "location should validate presence of country" do
    @jakarta_selatan.country = nil
    assert_not @jakarta_selatan.valid?
    assert_includes @jakarta_selatan.errors[:country], "can't be blank"
  end

  test "location should validate presence of state" do
    @jakarta_selatan.state = nil
    assert_not @jakarta_selatan.valid?
    assert_includes @jakarta_selatan.errors[:state], "can't be blank"
  end

  test "location should validate presence of city" do
    @jakarta_selatan.city = nil
    assert_not @jakarta_selatan.valid?
    assert_includes @jakarta_selatan.errors[:city], "can't be blank"
  end

  test "location should validate uniqueness of city" do
    duplicate_location = Location.new(
      country: @jakarta_selatan.country,
      country_code: @jakarta_selatan.country_code,
      state: @jakarta_selatan.state,
      city: @jakarta_selatan.city
    )
    assert_not duplicate_location.valid?
    assert_includes duplicate_location.errors[:city], "has already been taken"
  end

  # Test associations
  test "should have many addresses" do
    assert_includes @jakarta_selatan.addresses, addresses(:jakarta_selatan_address)
  end

  test "should have many location_services" do
    assert_includes @jakarta_selatan.location_services, location_services(:jakarta_selatan_fisiohome)
  end

  test "should have many services through location_services" do
    assert_includes @jakarta_selatan.services, services(:fisiohome)
  end

  test "should have one active service" do
    active_service = @jakarta_selatan.active_services
    assert_equal location_services(:jakarta_selatan_fisiohome), active_service
  end
end
