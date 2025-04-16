class Patient < ApplicationRecord
  # * define the associations

  has_many :appointments, dependent: :nullify
  has_many :therapists, through: :appointments
  has_many :patient_medical_records, through: :appointments

  has_one :patient_contact, dependent: :destroy

  has_many :patient_addresses, -> { order(active: :desc) }
  has_many :addresses, through: :patient_addresses
  has_one :active_patient_address, -> { where(active: true) }, class_name: "PatientAddress"
  has_one :active_address, through: :active_patient_address, source: :address
  accepts_nested_attributes_for :patient_addresses

  # * cycle callbacks
  before_destroy :destroy_associated_addresses

  # * define the enums
  enum :gender, {MALE: "MALE", FEMALE: "FEMALE"}, prefix: true

  # * define the validations
  validates :gender, presence: true, inclusion: {in: ["MALE", "FEMALE"], message: "%{value} is not a valid gender"}

  validates :date_of_birth, presence: true
  validate :date_of_birth_in_the_past

  validates :name, presence: true, length: {minimum: 3}
  validates :age, presence: true, numericality: {only_integer: true, greater_than: 0}

  # Ensure the combination of name, date_of_birth, age, and gender is unique
  validates :name, uniqueness: {
    scope: [:date_of_birth, :gender],
    message: "Patient with these details already exists"
  }

  def age
    ((Time.zone.now - date_of_birth.to_time) / 1.year.seconds).floor
  end

  private

  def date_of_birth_in_the_past
    return if date_of_birth.blank?
    if date_of_birth > Time.zone.today
      errors.add(:date_of_birth, "must be in the past")
    end
  end

  def destroy_associated_addresses
    logger.info "Deleting associated Addresses"

    patient_addresses.includes(:address).find_each do |address_item|
      logger.info "Deleting associated Address: #{address_item.address&.id}"
      address_item.address&.destroy
      address_item.destroy
    end
  end
end
