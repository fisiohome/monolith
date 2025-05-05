require "test_helper"

class AdminTest < ActiveSupport::TestCase
  def setup
    @super_admin = admins(:super_admin)
    @admin = admins(:admin)
  end

  test "valid admin should be valid" do
    assert @super_admin.valid?
    assert @admin.valid?
  end

  test "invalid admin type should be invalid" do
    @super_admin.admin_type = "INVALID_TYPE"
    assert_not @super_admin.valid?
    assert_includes @super_admin.errors[:admin_type], "INVALID_TYPE is not a valid admin type"
  end

  test "should validate presence of name" do
    @admin.name = nil
    assert_not @admin.valid?
    assert_includes @admin.errors[:name], "can't be blank"
  end

  test "super_admin check should return true only for SUPER_ADMIN" do
    assert @super_admin.is_super_admin?
    assert_not @admin.is_super_admin?
  end

  test "destroying admin should destroy associated user" do
    user = @super_admin.user
    @super_admin.destroy
    assert_not User.exists?(user.id), "Associated user was not destroyed"
  end
end
