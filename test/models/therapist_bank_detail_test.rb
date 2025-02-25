require "test_helper"

class TherapistBankDetailTest < ActiveSupport::TestCase
  def setup
    @therapist_one_bca = therapist_bank_details(:therapist_one_bca)
    @therapist_two_mandiri = therapist_bank_details(:therapist_two_mandiri)
    @therapist_two_bni = therapist_bank_details(:therapist_two_bni)
  end

  # Test validations
  test "valid therapist bank detail should be valid" do
    assert @therapist_one_bca.valid?
    assert @therapist_two_mandiri.valid?
  end

  # test "therapist bank detail should validate only one active bank detail per therapist" do
  #   new_active_detail = TherapistBankDetail.new(
  #     therapist: therapists(:therapist_two),
  #     bank_detail: bank_details(:bni_1),
  #     active: true
  #   )
  #   assert_not new_active_detail.valid?
  #   assert_includes new_active_detail.errors[:active], "only one active bank detail is allowed per therapist"
  # end

  # Test associations
  test "should belong to a therapist" do
    assert_equal therapists(:therapist_one), @therapist_one_bca.therapist
  end

  test "should belong to a bank detail" do
    assert_equal bank_details(:bca_1), @therapist_one_bca.bank_detail
  end
end
