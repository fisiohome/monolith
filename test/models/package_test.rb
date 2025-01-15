require "test_helper"

class PackageTest < ActiveSupport::TestCase
  setup do
    @package = packages(:basic_fisiohome)
  end

  # Test basic validity
  test "valid package" do
    assert @package.valid?
  end

  # Test presence validations with error messages
  test "invalid without name" do
    @package.name = nil
    assert_not @package.valid?
    assert_includes @package.errors[:name], "can't be blank", "Name should have a presence validation error"
  end

  test "invalid without currency" do
    @package.currency = nil
    assert_not @package.valid?
    assert_includes @package.errors[:currency], "can't be blank", "Currency should have a presence validation error"
  end

  test "invalid without number_of_visit" do
    @package.number_of_visit = nil
    assert_not @package.valid?
    assert_includes @package.errors[:number_of_visit], "can't be blank", "Number of visits should have a presence validation error"
  end

  # Test numericality validations with error messages
  test "invalid with negative number_of_visit" do
    @package.number_of_visit = -1
    assert_not @package.valid?
    assert_includes @package.errors[:number_of_visit], "must be greater than 0", "Number of visits should be greater than 0"
  end

  test "invalid with negative price_per_visit" do
    @package.price_per_visit = -10
    assert_not @package.valid?
    assert_includes @package.errors[:price_per_visit], "must be greater than or equal to 0", "Price per visit should be non-negative"
  end

  test "total_price calculation" do
    package = Package.new(
      service: services(:pusat_okupasi),
      name: "Test Package",
      currency: "USD",
      number_of_visit: 5,
      price_per_visit: 100,
      discount: 50,
      fee_per_visit: 10
    )
    package.valid? # Trigger callback
    assert_equal 450, package.total_price, "Incorrect total_price calculation"
    assert_equal 50, package.total_fee, "Incorrect total_fee calculation"
  end

  test "discount can be nil" do
    @package.discount = nil
    assert @package.valid?, "Package should be valid without a discount"
  end

  # Test associations
  test "belongs to service" do
    assert_respond_to @package, :service, "Package should belong to a service"
    assert_not_nil @package.service, "Package's service should not be nil"
  end

  test "invalid without service" do
    @package.service = nil
    assert_not @package.valid?
    assert_includes @package.errors[:service], "must exist", "Package should require a valid service association"
  end

  # Test formatted data
  test "formatted_price_per_visit returns formatted value" do
    @package.price_per_visit = 123.456
    @package.currency = "USD"
    expected_format = "USD 123.46"
    assert_equal expected_format, @package.formatted_price_per_visit, "Price per visit should be formatted with currency and precision"
  end

  test "formatted_total_price handles discount correctly" do
    package = packages(:zero_discount_package)
    expected_format = "USD 250.00"
    assert_equal expected_format, package.formatted_total_price, "Total price should be formatted and include zero discount"
  end

  test "formatted_discount is nil when discount is nil" do
    @package.discount = nil
    assert_nil @package.formatted_discount, "Formatted discount should be nil when discount is nil"
  end
end
