class Location < ApplicationRecord
  # * define the associations
  has_many :addresses

  has_many :location_services, dependent: :destroy
  has_many :services, through: :location_services
  has_one :active_services, -> { where(active: true) }, class_name: "LocationService"

  has_many :appointments, dependent: :destroy

  # now you can walk from a location to all its appointment‐histories
  has_many :appointment_address_histories,
    dependent: :restrict_with_error, # prevents you from deleting a location if any history points to it (safer than silent nullify).
    inverse_of: :location # helps Rails link objects in memory for nested builds or validations.

  # * define the validation
  validates :country, :country_code, :state, presence: true
  validates :city, presence: true, uniqueness: true

  # * instance methods
  def full_name
    "#{city}, #{state}, #{country}"
  end

  # * cache methods
  def self.cached_locations
    Rails.cache.fetch("all_locations", expires_in: 1.hour) do
      all.as_json
    end
  end
end
