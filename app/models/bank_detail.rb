class BankDetail < ApplicationRecord
  # define the associations
  has_many :therapist_bank_details, dependent: :destroy
  has_many :therapists, through: :therapist_bank_details

  # define the validation
  validates :bank_name, :account_number, :account_holder_name, presence: true
end
