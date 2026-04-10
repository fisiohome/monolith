class Address < ApplicationRecord
  # * define the associations
  belongs_to :location

  has_many :therapist_addresses, dependent: :destroy
  has_many :therapists, through: :therapist_addresses

  has_many :patient_addresses, dependent: :destroy
  has_many :patient, through: :patient_addresses

  before_validation :normalize_address
  # * cycle callbacks
  before_save :update_coordinates, if: -> { latitude_changed? || longitude_changed? }

  # * define the validation
  validates :address, presence: true
  validates :address, length: {minimum: 5, maximum: 500}
  validates :postal_code, length: {maximum: 20}, allow_blank: true
  validates :notes, length: {maximum: 1000}, allow_blank: true

  # Custom validations
  validate :valid_coordinates?
  validate :postal_code_format
  validate :address_not_empty

  private

  def update_coordinates
    self.coordinates = [latitude, longitude]
  end

  def normalize_address
    self.address = address.strip if address.present?
    self.postal_code = postal_code.strip if postal_code.present?
    self.notes = notes.strip if notes.present?
  end

  def valid_coordinates?
    return unless latitude.present? && longitude.present?

    unless latitude.is_a?(Numeric) && longitude.is_a?(Numeric)
      errors.add(:base, "Coordinates must be numeric")
      return
    end

    unless latitude.between?(-90, 90) && longitude.between?(-180, 180)
      errors.add(:base, "Coordinates must be within valid ranges (latitude: -90 to 90, longitude: -180 to 180)")
    end
  end

  def postal_code_format
    return if postal_code.blank?

    # Allow alphanumeric postal codes with spaces and hyphens
    unless postal_code.match?(/\A[A-Za-z0-9\s\-]{3,20}\z/)
      errors.add(:postal_code, "must be 3-20 characters and contain only letters, numbers, spaces, and hyphens")
    end
  end

  def address_not_empty
    return if address.blank?

    # Check if address contains only whitespace or special characters
    if address.strip.empty? || !address.match?(/[A-Za-z0-9]/)
      errors.add(:address, "must contain at least one alphanumeric character")
    end
  end
end
