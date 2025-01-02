class BankDetail < ApplicationRecord
  # define the associations
  has_many :therapist_bank_details, dependent: :destroy
  has_many :therapists, through: :therapist_bank_details

  # define the validation
  validates :bank_name, :account_number, :account_holder_name, presence: true
  # to ensure the presence of essential attributes and the uniqueness of the bank name and account number combination.
  validates :account_number, uniqueness: {scope: :bank_name, message: "The combination of bank name and account number must be unique"}
end
