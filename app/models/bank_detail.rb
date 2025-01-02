class BankDetail < ApplicationRecord
  # define the associations
  has_many :therapist_bank_details, dependent: :destroy
  has_many :therapists, through: :therapist_bank_details

  # define the validation
  validates :bank_name, :account_number, :account_holder_name, presence: true
  validates :account_number, uniqueness: {scope: :bank_name, message: "The combination of bank name and account number must be unique"}

  # callback to transform attributes to uppercase
  before_save :uppercase_bank_name_and_account_holder_name

  private

  def uppercase_bank_name_and_account_holder_name
    self.bank_name = bank_name.upcase
    self.account_holder_name = account_holder_name.upcase
  end
end
