class AppointmentAddressHistory < ApplicationRecord
  # * define the associations
  belongs_to :appointment, inverse_of: :address_history
  belongs_to :location, inverse_of: :appointment_address_histories

  # * define the validation
  validates :address_line, :postal_code, :latitude, :longitude, presence: true

  # * cycle callbacks
  # set coordinates from lat/lng on each new record (and on update if they change)
  before_validation :set_coordinates

  # * define instance attributes
  # store coordinates as PostgreSQL point type
  # column in the migration:
  # t.point :coordinates, null: false
  attribute :coordinates, :point

  private

  def set_coordinates
    return if latitude.blank? || longitude.blank?
    # for native Postgres point, assigning an [x, y] array works
    self.coordinates = [longitude, latitude]
  end
end
