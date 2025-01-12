require "test_helper"

class ServiceTest < ActiveSupport::TestCase
  def setup
    @fisiohome_service = services(:fisiohome)
    @pusat_okupasi_service = services(:pusat_okupasi)
    @caregiver = services(:caregiver)
  end

  # Test validations
  test "valid service should be valid" do
    assert @fisiohome_service.valid?
  end

  test "service should validate presence of name" do
    @fisiohome_service.name = nil
    assert_not @fisiohome_service.valid?
    assert_includes @fisiohome_service.errors[:name], "can't be blank"
  end

  test "service should validate presence of code" do
    @fisiohome_service.code = nil
    assert_not @fisiohome_service.valid?
    assert_includes @fisiohome_service.errors[:code], "can't be blank"
  end

  test "service should validate uniqueness of name" do
    duplicate_service = Service.new(name: @fisiohome_service.name, code: "NEW_CODE")
    assert_not duplicate_service.valid?
    assert_includes duplicate_service.errors[:name], "has already been taken"
  end

  # Test associations
  test "should destroy associated location_services when service is destroyed" do
    LocationService.create!(service: @caregiver, location: locations(:bandung_kab))
    assert_difference "LocationService.count", -1 do
      @caregiver.destroy
    end
  end

  # Test callbacks
  test "transform_service_name should convert name to uppercase and replace spaces with underscores" do
    @fisiohome_service.name = "New Service Name"
    @fisiohome_service.save!
    assert_equal "NEW_SERVICE_NAME", @fisiohome_service.name
  end

  test "transform_service_name should convert code to uppercase" do
    @fisiohome_service.code = "lowercase_code"
    @fisiohome_service.save!
    assert_equal "LOWERCASE_CODE", @fisiohome_service.code
  end

  # Test activation (if `Activation` module adds behavior)
  test "activation module should allow service activation toggle" do
    assert_respond_to @fisiohome_service, :active?

    @fisiohome_service.active = true
    assert @fisiohome_service.active?

    @fisiohome_service.active = false
    assert_not @fisiohome_service.active?
  end
end
