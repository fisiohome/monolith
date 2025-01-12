require "test_helper"

class UserTest < ActiveSupport::TestCase
  def setup
    @active_user = users(:active_user)
    @suspended_user = users(:suspended_user)
    @permanently_suspended_user = users(:permanently_suspended_user)
  end

  # Test validations
  test "valid user should be valid" do
    assert @active_user.valid?
  end

  test "email presence should be validated" do
    @active_user.email = nil
    assert_not @active_user.valid?
    assert_includes @active_user.errors[:email], "can't be blank"
  end

  test "email uniqueness should be validated" do
    duplicate_user = User.new(email: @active_user.email, password: "Password123!")
    assert_not duplicate_user.valid?
    assert_includes duplicate_user.errors[:email], "has already been taken"
  end

  # Test `is_online?` method
  test "is_online? should return true if last_online_at is recent" do
    assert @active_user.is_online?
  end

  test "is_online? should return false if last_online_at is too old" do
    @active_user.last_online_at = 10.minutes.ago
    assert_not @active_user.is_online?
  end

  # Test `suspended?` method
  test "suspended? should return true if user is suspended within the timeframe" do
    assert @suspended_user.suspended?
  end

  test "suspended? should return false if suspend_end has passed" do
    @suspended_user.suspend_end = 1.minute.ago
    assert_not @suspended_user.suspended?
  end

  test "suspended? should return true if suspend_end is not set but suspend_at is past" do
    assert @permanently_suspended_user.suspended?
  end

  test "suspended? should return false if suspend_at is not set" do
    @active_user.suspend_at = nil
    assert_not @active_user.suspended?
  end

  # Test Devise overrides
  test "active_for_authentication? should return true for active user" do
    assert @active_user.active_for_authentication?
  end

  test "active_for_authentication? should return false for suspended user" do
    assert_not @suspended_user.active_for_authentication?
  end

  test "inactive_message should return :locked if user is not suspended" do
    assert_equal :locked, @active_user.inactive_message
  end

  test "inactive_message should return Devise default message for suspended user" do
    assert_not_equal :locked, @suspended_user.inactive_message
  end

  # Test associations
  test "destroying user should destroy associated admin" do
    Admin.create!(user: @active_user, admin_type: "SUPER_ADMIN", name: "Test Admin")
    assert_difference "Admin.count", -1 do
      @active_user.destroy
    end
  end

  # ? TECH-DEBT - will be skipped for now
  # test "destroying user should destroy associated therapist" do
  #   therapist = therapists(:active_therapist)
  #   assert_difference "Therapist.count", -1 do
  #     therapist.user.destroy!
  #   end
  # end
end
