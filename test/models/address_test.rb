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
  test "update_coordinates should set coordinates as an array of latitude and longitude when latitude or longitude changes" do
    # Case 1: Change latitude and longitude
    @jakarta_address.latitude = -6.2277
    @jakarta_address.longitude = 106.8414
    @jakarta_address.save!
    assert_equal [-6.2277, 106.8414], @jakarta_address.coordinates, "Coordinates should update correctly when both latitude and longitude change"

    # Case 2: Change only latitude
    @jakarta_address.latitude = -6.3000
    @jakarta_address.save!
    assert_equal [-6.3000, 106.8414], @jakarta_address.coordinates, "Coordinates should update correctly when only latitude changes"

    # Case 3: Change only longitude
    @jakarta_address.longitude = 107.0000
    @jakarta_address.save!
    assert_equal [-6.3000, 107.0000], @jakarta_address.coordinates, "Coordinates should update correctly when only longitude changes"

    # Case 4: No changes to latitude or longitude
    coordinates_before = @jakarta_address.coordinates.dup
    @jakarta_address.save!
    assert_equal coordinates_before, @jakarta_address.coordinates, "Coordinates should not change if latitude and longitude remain unchanged"

    # Case 5: Test with nil latitude and longitude
    @jakarta_address.latitude = nil
    @jakarta_address.longitude = nil
    assert_not @jakarta_address.valid?, "Address should not be valid without latitude and longitude"
    assert_includes @jakarta_address.errors[:latitude], "can't be blank", "Validation should ensure latitude is present"
    assert_includes @jakarta_address.errors[:longitude], "can't be blank", "Validation should ensure longitude is present"
  end
end
