require "test_helper"

class TherapistTest < ActiveSupport::TestCase
  def setup
    @therapist_one = therapists(:therapist_one)
    @therapist_two = therapists(:therapist_two)
    @active_therapist = therapists(:active_therapist)
    @hold_therapist = therapists(:hold_therapist)
  end

  # Test validations
  test "valid therapist should be valid" do
    assert @therapist_one.valid?
    assert @therapist_two.valid?
  end

  test "therapist should validate presence of name" do
    @therapist_one.name = nil
    assert_not @therapist_one.valid?
    assert_includes @therapist_one.errors[:name], "can't be blank"
  end

  test "therapist should validate presence of phone_number" do
    @therapist_one.phone_number = nil
    assert_not @therapist_one.valid?
    assert_includes @therapist_one.errors[:phone_number], "can't be blank"
  end

  test "therapist should validate uniqueness of phone_number" do
    duplicate = Therapist.new(phone_number: @therapist_one.phone_number, name: "Duplicate Therapist", user: users(:therapist_user_one), service: services(:fisiohome))
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:phone_number], "has already been taken"
  end

  test "therapist should validate presence of registration_number" do
    @therapist_one.registration_number = nil
    assert @therapist_one.valid?
  end

  test "therapist should validate uniqueness of registration_number" do
    duplicate = Therapist.new(registration_number: @therapist_one.registration_number, name: "Duplicate Therapist", phone_number: "+6281234567894", user: users(:therapist_user_one), service: services(:fisiohome))
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:registration_number], "has already been taken"
  end

  # Test associations
  test "should belong to a user" do
    assert_equal users(:therapist_user_one), @therapist_one.user
  end

  test "should belong to a service" do
    assert_equal services(:fisiohome), @therapist_one.service
  end

  test "should have many addresses through therapist_addresses" do
    assert_includes @therapist_one.addresses, addresses(:jakarta_selatan_address)
  end

  test "should have one active address" do
    assert_equal addresses(:jakarta_selatan_address), @therapist_one.active_address
  end

  test "should have many bank details through therapist_bank_details" do
    assert_includes @therapist_two.bank_details, bank_details(:mandiri_1)
  end

  test "should have one active bank detail" do
    assert_equal bank_details(:mandiri_1), @therapist_two.active_bank_detail
  end

  # Test callbacks
  test "assign_registration_number should generate unique registration number" do
    assert @therapist_one.registration_number.start_with?("FH")
  end

  test "update_user_suspend_status should update user's suspension status" do
    @hold_therapist.update!(employment_status: "ACTIVE")
    assert_nil @hold_therapist.user.suspend_at
    assert_nil @hold_therapist.user.suspend_end

    @hold_therapist.update!(employment_status: "HOLD")
    assert_not_nil @hold_therapist.user.suspend_at
    assert_not_nil @hold_therapist.user.suspend_end
  end

  test "destroy_associated_user should delete user" do
    delete_therapist = therapists(:delete_therapist)
    user = delete_therapist.user
    assert_difference "User.count", -1 do
      delete_therapist.destroy
    end
    assert_not User.exists?(user.id), "Associated user was not destroyed"
  end

  test "destroy_associated_addresses should delete addresses" do
    delete_therapist = therapists(:delete_therapist)
    address = delete_therapist.addresses.first
    assert_difference "Address.count", -1 do
      delete_therapist.destroy
    end
    assert_not Address.exists?(address.id), "Associated address was not destroyed"
  end

  test "destroy_associated_bank_details should delete bank details" do
    delete_therapist = therapists(:delete_therapist)
    bank_detail = delete_therapist.bank_details.first
    assert_difference "BankDetail.count", -1 do
      delete_therapist.destroy
    end
    assert_not BankDetail.exists?(bank_detail.id), "Associated bank detail was not destroyed"
  end

  test "destroying therapist should destroy associated therapist_appointment_schedule" do
    delete_therapist = therapists(:delete_therapist)
    schedule = therapist_appointment_schedules(:therapist_schedule_delete) # Create a fixture for this
    assert_difference "TherapistAppointmentSchedule.count", -1 do
      delete_therapist.destroy
    end
    assert_not TherapistAppointmentSchedule.exists?(schedule.id), "Associated TherapistAppointmentSchedule was not destroyed"
  end
end
