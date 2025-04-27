class AppointmentPackageHistory < ApplicationRecord
  include ActionView::Helpers::NumberHelper
  include PackagePrices

  # * define the associations
  belongs_to :appointment
  belongs_to :package
end
