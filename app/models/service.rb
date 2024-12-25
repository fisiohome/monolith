class Service < ApplicationRecord
  include Activation

  # define the associations
  has_one :therapist

  has_many :location_services, dependent: :destroy
  has_many :locations, through: :location_services
  has_one :active_locations, -> { where(active: true) }, class_name: "LocationService"

  # define the validation
  validates :code, presence: true
  validates :name, presence: true, uniqueness: true

  # define the callbacks
  before_save :transform_service_name

  private

  def transform_service_name
    self.name = name.gsub(/\s+/, "_").upcase if name.present?
    self.code = code.upcase if code.present?
  end
end
