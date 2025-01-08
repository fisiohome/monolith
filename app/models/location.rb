class Location < ApplicationRecord
  # define the associations
  has_many :addresses

  has_many :location_services, dependent: :destroy
  has_many :services, through: :location_services
  has_one :active_services, -> { where(active: true) }, class_name: "LocationService"

  # define the validation
  validates :country, :country_code, :state, presence: true
  validates :city, presence: true, uniqueness: true
end
