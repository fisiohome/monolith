class Service < ApplicationRecord
  include Activation

  # define the associations
  has_one :therapist, dependent: :destroy

  has_many :location_services, dependent: :destroy
  has_many :locations, through: :location_services
  has_one :active_locations, -> { where(active: true) }, class_name: "LocationService"

  # define the validation
  validates :code, presence: true
  validates :name, presence: true, uniqueness: true
end
