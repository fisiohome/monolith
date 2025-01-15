class TherapistRegistrationCounter < ApplicationRecord
  include ServiceCodeValidation

  # define the validation
  validates :service_code, uniqueness: true
end
