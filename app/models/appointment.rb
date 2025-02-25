class Appointment < ApplicationRecord
  # * define the associations
  belongs_to :therapist, optional: true
  belongs_to :patient
  belongs_to :service
  belongs_to :package
  belongs_to :location

  has_many :appointment_admins
  has_many :admins, through: :appointment_admins

  # * cycle callbacks
  before_create :generate_registration_number

  # * define the validations
  validates :appointment_date_time, presence: true
  validate :appointment_date_time_in_the_future

  validates :registration_number, uniqueness: true

  validates :other_referral_source, presence: true, if: -> { referral_source == "Other" }

  validates :fisiohome_partner_name, presence: true, if: :fisiohome_partner_booking?
  validates :other_fisiohome_partner_name, presence: true, if: -> { fisiohome_partner_name == "Other" }

  validates :preferred_therapist_gender, :patient_complaint_description, :patient_condition, presence: true

  # * define the constants
  PatientCondition = Struct.new(:title, :description)
  PATIENT_CONDITION = [
    PatientCondition.new("NORMAL", "Fully mobile with no restrictions"),
    PatientCondition.new("ONLY ABLE TO SIT", "Limited mobility, the patient can sit but not stand or walk"),
    PatientCondition.new("BEDRIDDEN", "The patient is confined to bed")
  ].freeze

  PREFERRED_THERAPIST_GENDER = ["MALE", "FEMALE", "NO PREFERENCE"].freeze

  REFERRAL_SOURCES = ["Instagram", "Facebook", "Family or Close Related Person", "Other"].freeze

  FISIOHOME_PARTNER_NAMES = ["Cosmart", "KlinikGo", "The Asian Parent", "Orami Circle", "Ibu2canggih", "Ibu Bayi Canggih", "Kompas myValue", "Blibli", "LoveCare", "Medlife", "Medikids", "Bumi Health", "Other"].freeze

  private

  def appointment_date_time_in_the_future
    if appointment_date_time.present? && appointment_date_time <= Time.current
      errors.add(:appointment_date_time, "must be in the future")
    end
  end

  # Generates a unique registration number based on the service code and a random number.
  def generate_registration_number
    return if registration_number.present? || service.blank?
    service_code = service.code.upcase
    loop do
      random_number = SecureRandom.random_number(10**6).to_s.rjust(6, "0") # 6-digit random number
      candidate = "#{service_code}-#{random_number}"
      unless Appointment.exists?(registration_number: candidate)
        self.registration_number = candidate
        break
      end
    end
  end
end
