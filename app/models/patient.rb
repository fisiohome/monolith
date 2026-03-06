class Patient < ApplicationRecord
  # * define the scopes
  scope :search, ->(search) {
    return if search.blank?

    joins(:patient_contact)
      .where(
        "patients.name ILIKE :t OR patient_contacts.contact_name ILIKE :t OR patient_contacts.email ILIKE :t OR patient_contacts.contact_phone ILIKE :t OR patients.patient_number ILIKE :t",
        t: "%#{search.strip}%"
      )
  }
  scope :by_city, ->(city) {
    return if city.blank?

    left_joins(patient_addresses: {address: :location})
      .where(Location.arel_table[:city].matches("%#{city}%"))
  }

  # * define the constants
  GenderStruct = Struct.new(:title, :title_id)
  GENDER_LABELS = [GenderStruct.new("MALE", "Laki-Laki"), GenderStruct.new("FEMALE", "Perempuan")].freeze

  # * define the associations
  belongs_to :patient_contact
  belongs_to :user, optional: true
  accepts_nested_attributes_for :patient_contact

  has_many :appointments, dependent: :nullify
  has_many :therapists, through: :appointments
  has_many :patient_medical_records, through: :appointments

  has_many :patient_addresses, -> { order(active: :desc, created_at: :desc) }
  has_many :addresses, through: :patient_addresses
  has_one :active_patient_address, -> { where(active: true) }, class_name: "PatientAddress"
  has_one :active_address, through: :active_patient_address, source: :address
  accepts_nested_attributes_for :patient_addresses

  # * cycle callbacks
  before_validation :assign_patient_number, on: :create
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
    location = active_address&.location
    location&.attributes&.slice("country", "state", "city")
  end

  # Address management helper methods
  def has_multiple_addresses?
    patient_addresses.count > 1
  end

  def can_delete_address?(patient_address)
    return false if patient_address.blank?
    return false if patient_address.active? && patient_addresses.where(active: true).count == 1
    return false if address_used_in_appointments?(patient_address.address)
    true
  end

  def address_used_in_appointments?(address)
    return false if address.blank?

    # Very flexible matching - primarily use address text matching
    # Only block deletion if there's a strong match on address text for ACTIVE appointments only
    appointments = Appointment.joins(:address_history)
      .where.not(status: ["CANCELLED", "UNSCHEDULED", "ON HOLD", "PENDING THERAPIST ASSIGNMENT"]) # Exclude inactive/cancelled/completed appointments
      .where(
        "appointment_address_histories.address_line ILIKE ?",
        "%#{sanitize_sql_like(address.address)}%"
      )

    # Only use coordinates as additional confirmation if they exist and are very precise
    if address.latitude.present? && address.longitude.present?
      # Use a more generous distance threshold (0.01 degrees ~ 1km) for coordinate matching
      appointments = appointments.where(
        "ABS(appointment_address_histories.latitude - ?) < 0.01 AND ABS(appointment_address_histories.longitude - ?) < 0.01",
        address.latitude,
        address.longitude
      )
    end

    appointments.exists?
  end

  def set_active_address(patient_address)
    return false if patient_address.blank?
    return false unless patient_addresses.include?(patient_address)

    transaction do
      # Deactivate all other addresses
      patient_addresses.where.not(id: patient_address.id).update_all(active: false)
      # Activate the selected address
      patient_address.update!(active: true)
    end

    true
  rescue => e
    Rails.logger.error "Error setting active address: #{e.message}"
    false
  end

  def remove_address(patient_address)
    return false unless can_delete_address?(patient_address)

    transaction do
      # Delete the patient address link
      patient_address.destroy!

      # Delete the address record if it's not used by anyone else
      address = patient_address.address
      if address.patient_addresses.count == 0
        address.destroy!
      end
    end

    true
  rescue => e
    Rails.logger.error "Error removing address: #{e.message}"
    false
  end

  private

  def assign_patient_number
    return if patient_number.present?

    self.patient_number = generate_patient_number
  end

  def generate_patient_number
    prefix = "FH-P-"
    number_width = 7

    Patient.transaction do
      last_number = Patient.lock.order(patient_number: :desc).limit(1).pick(:patient_number)
      next_sequence = if last_number.present?
        last_number.split("-").last.to_i + 1
      else
        1
      end

      format("%s%0*d", prefix, number_width, next_sequence)
    end
  end

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
