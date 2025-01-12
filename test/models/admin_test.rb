require "test_helper"

class AdminTest < ActiveSupport::TestCase
  def setup
    @super_admin = admins(:super_admin)
    @admin_l1 = admins(:admin_l1)
  end

  test "valid admin should be valid" do
    assert @super_admin.valid?
    assert @admin_l1.valid?
  end

  test "invalid admin type should be invalid" do
    @super_admin.admin_type = "INVALID_TYPE"
    assert_not @super_admin.valid?
    assert_includes @super_admin.errors[:admin_type], "INVALID_TYPE is not a valid admin type"
  end

  test "should validate presence of name" do
    @admin_l1.name = nil
    assert_not @admin_l1.valid?
    assert_includes @admin_l1.errors[:name], "can't be blank"
  end

  test "super_admin check should return true only for SUPER_ADMIN" do
    assert @super_admin.is_super_admin?
    assert_not @admin_l1.is_super_admin?
  end

  test "destroying admin should destroy associated user" do
    user = @super_admin.user
    @super_admin.destroy
    assert_not User.exists?(user.id), "Associated user was not destroyed"
  end
end
