class Patient < ApplicationRecord
  # * define the scopes
  scope :search, ->(search) {
    return if search.blank?

    joins(:patient_contact)
      .where(
        "patients.name ILIKE :t OR patient_contacts.contact_name ILIKE :t OR patient_contacts.email ILIKE :t OR patient_contacts.contact_phone ILIKE :t",
        t: "%#{search.strip}%"
      )
  }
  scope :by_city, ->(city) {
    return if city.blank?

    left_joins(patient_addresses: {address: :location})
      .where(Location.arel_table[:city].matches("%#{city}%"))
  }

  # * define the associations
  belongs_to :patient_contact
  accepts_nested_attributes_for :patient_contact

  has_many :appointments, dependent: :nullify
  has_many :therapists, through: :appointments
  has_many :patient_medical_records, through: :appointments

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

  # Ensure the combination of name, date_of_birth, and gender is unique
  validates :name, uniqueness: {
    scope: [:date_of_birth, :gender],
    message: "Patient with these details already exists"
  }

  # * define the helper methods
  def age
    date_of_birth ? ((Time.zone.now - date_of_birth.to_time) / 1.year.seconds).floor : 0
  end

  def location
    active_address.location.attributes.slice("country", "state", "city")
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
