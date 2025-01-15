class LocationService < ApplicationRecord
  include ActivationValidation

  # define the associations
  belongs_to :location
  belongs_to :service

  # define the validation
  validates :location_id, uniqueness: {scope: :service_id}
end
