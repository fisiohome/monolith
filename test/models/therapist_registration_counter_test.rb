require "test_helper"

class TherapistRegistrationCounterTest < ActiveSupport::TestCase
  def setup
    @fisiohome_counter = therapist_registration_counters(:fisiohome_counter)
    @pusat_okupasi_counter = therapist_registration_counters(:pusat_okupasi_counter)
  end

  # Test validations
  test "therapist_registration_counter should validate uniqueness of service_code" do
    duplicate_counter = TherapistRegistrationCounter.new(service_code: @fisiohome_counter.service_code)
    assert_not duplicate_counter.valid?
    assert_includes duplicate_counter.errors[:service_code], "has already been taken"
  end

  # Test presence of service_code
  test "therapist_registration_counter should be invalid without a service_code" do
    @fisiohome_counter.service_code = "CH"
    assert_not @fisiohome_counter.valid?
    assert_includes @fisiohome_counter.errors[:service_code], "CH is not a valid service code"
  end
end
