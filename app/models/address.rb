class Address < ApplicationRecord
  # define the associations
  belongs_to :location

  has_many :therapist_addresses, dependent: :destroy
  has_many :therapists, through: :therapist_addresses

  # cycle callbacks
  before_save :update_coordinates

  # define the validation
  validates :latitude, :longitude, :address, :postal_code, presence: true

  private

  def update_coordinates
    self.coordinates = [ latitude, longitude ]
  end
end
