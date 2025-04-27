class Package < ApplicationRecord
  include ActionView::Helpers::NumberHelper
  include ActivationValidation
  include PackagePrices

  # * define the associations
  belongs_to :service

  has_many :appointments, dependent: :destroy
  has_many :appointment_package_histories,
    dependent: :restrict_with_error, # prevents you from deleting a location if any history points to it (safer than silent nullify).
    inverse_of: :package # helps Rails link objects in memory for nested builds or validations.
end
