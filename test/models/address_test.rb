require "test_helper"

class AddressTest < ActiveSupport::TestCase
  def setup
    @jakarta_address = addresses(:jakarta_selatan_address)
    @bandung_address = addresses(:bandung_address)
  end

  # Test validations
  test "valid address should be valid" do
    assert @jakarta_address.valid?
    assert @bandung_address.valid?
  end

  test "address should validate presence of latitude" do
    @jakarta_address.latitude = nil
    assert_not @jakarta_address.valid?
    assert_includes @jakarta_address.errors[:latitude], "can't be blank"
  end

  test "address should validate presence of longitude" do
    @jakarta_address.longitude = nil
    assert_not @jakarta_address.valid?
    assert_includes @jakarta_address.errors[:longitude], "can't be blank"
  end

  test "address should validate presence of address" do
    @jakarta_address.address = nil
    assert_not @jakarta_address.valid?
    assert_includes @jakarta_address.errors[:address], "can't be blank"
  end

  test "address should validate presence of postal_code" do
    @jakarta_address.postal_code = nil
    assert_not @jakarta_address.valid?
    assert_includes @jakarta_address.errors[:postal_code], "can't be blank"
  end

  # Test associations
  test "should destroy associated therapist_addresses when address is destroyed" do
    assert_difference "TherapistAddress.count", -1 do
      @jakarta_address.destroy
    end
  end

  test "should have many therapists through therapist_addresses" do
    therapist = therapists(:therapist_one)
    TherapistAddress.create!(address: @jakarta_address, therapist: therapist)
    assert_includes @jakarta_address.therapists, therapist
  end

  # Test callbacks
  test "update_coordinates should set coordinates as an array of latitude and longitude" do
    @jakarta_address.latitude = -6.2277
    @jakarta_address.longitude = 106.8414
    @jakarta_address.save!
    assert_equal [-6.2277, 106.8414], @jakarta_address.coordinates
  end
end
