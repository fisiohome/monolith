class PatientContact < ApplicationRecord
  # * define the associations
  belongs_to :patient

  # * define the validations
  validates :contact_name, presence: true, length: {minimum: 3}
  validates :contact_phone, uniqueness: true, presence: true
  validates :email, allow_blank: true, uniqueness: true, format: {with: URI::MailTo::EMAIL_REGEXP, message: "must be a valid email address"}
end
