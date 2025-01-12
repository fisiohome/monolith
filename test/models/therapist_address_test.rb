require "test_helper"

class TherapistAddressTest < ActiveSupport::TestCase
  def setup
    @therapist_one_addresses = therapist_addresses(:therapist_one_addresses)
    @therapist_two_addresses = therapist_addresses(:therapist_two_addresses)
  end

  # Test validations
  test "should be valid with valid attributes" do
    assert @therapist_one_addresses.valid?
    assert @therapist_two_addresses.valid?
  end

  test "should not allow more than one active address per therapist" do
    new_address = TherapistAddress.new(
      therapist: therapists(:therapist_one),
      address: addresses(:bandung_address),
      active: true
    )
    assert_not new_address.valid?
    assert_includes new_address.errors[:active], "only one active address is allowed per therapist"
  end

  test "should allow multiple inactive addresses for the same therapist" do
    inactive_address = TherapistAddress.new(
      therapist: therapists(:therapist_one),
      address: addresses(:bandung_address),
      active: false
    )
    assert inactive_address.valid?
  end

  # Test associations
  test "should belong to a therapist" do
    assert_equal therapists(:therapist_one), @therapist_one_addresses.therapist
  end

  test "should belong to an address" do
    assert_equal addresses(:jakarta_selatan_address), @therapist_one_addresses.address
  end
end
