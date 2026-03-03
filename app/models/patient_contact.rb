class PatientContact < ApplicationRecord
  # * define the associations
  has_many :patients, inverse_of: :patient_contact, dependent: :restrict_with_error

  # * cycle callbacks
  before_validation :normalize_email

  # * define the validations
  validates :contact_name, presence: true, length: {minimum: 3}
  validates :contact_phone, uniqueness: true, presence: true
  validates :email, allow_blank: true, uniqueness: true, format: {with: URI::MailTo::EMAIL_REGEXP, message: "must be a valid email address"}

  private

  def normalize_email
    # Convert blank email to nil to allow multiple blank emails in unique index
    # PostgreSQL allows multiple NULL values but treats empty strings as duplicates
    self.email = nil if email.blank?
  end
end
