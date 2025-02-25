class Address < ApplicationRecord
  # * define the associations
  belongs_to :location

  has_many :therapist_addresses, dependent: :destroy
  has_many :therapists, through: :therapist_addresses

  has_many :patient_addresses, dependent: :destroy
  has_many :patient, through: :patient_addresses

  # * cycle callbacks
  before_save :update_coordinates, if: -> { latitude_changed? || longitude_changed? }

  # * define the validation
  validates :address, :postal_code, :latitude, :longitude, presence: true

  private

  def update_coordinates
    self.coordinates = [latitude, longitude]
  end
end
