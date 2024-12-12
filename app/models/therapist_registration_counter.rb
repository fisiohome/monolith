class TherapistRegistrationCounter < ApplicationRecord
  include ServiceCode

  # define the validation
  validates :service_code, uniqueness: true
end
