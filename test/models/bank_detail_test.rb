require "test_helper"

class BankDetailTest < ActiveSupport::TestCase
  def setup
    @bca_1 = bank_details(:bca_1)
    @mandiri_1 = bank_details(:mandiri_1)
  end

  # Test validations
  test "valid bank detail should be valid" do
    assert @bca_1.valid?
  end

  test "bank detail should validate presence of bank_name" do
    @bca_1.bank_name = nil
    assert_not @bca_1.valid?
    assert_includes @bca_1.errors[:bank_name], "can't be blank"
  end

  test "bank detail should validate presence of account_number" do
    @bca_1.account_number = nil
    assert_not @bca_1.valid?
    assert_includes @bca_1.errors[:account_number], "can't be blank"
  end

  test "bank detail should validate presence of account_holder_name" do
    @bca_1.account_holder_name = nil
    assert_not @bca_1.valid?
    assert_includes @bca_1.errors[:account_holder_name], "can't be blank"
  end

  test "bank detail should validate uniqueness of account_number scoped to bank_name" do
    duplicate = BankDetail.new(bank_name: @bca_1.bank_name, account_number: @bca_1.account_number, account_holder_name: "Test User")
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:account_number], "The combination of bank name and account number must be unique"
  end

  # Test callbacks
  test "uppercase_bank_name_and_account_holder_name should transform to uppercase" do
    @mandiri_1.bank_name = "mandiri"
    @mandiri_1.account_holder_name = "Therapist Two"
    @mandiri_1.save!
    assert_equal "MANDIRI", @mandiri_1.bank_name
    assert_equal "THERAPIST TWO", @mandiri_1.account_holder_name
  end

  # Test associations
  test "should have many therapists through therapist_bank_details" do
    assert_includes @bca_1.therapists, therapists(:therapist_one)
  end
end
