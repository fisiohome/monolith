class PatientMedicalRecord < ApplicationRecord
  # * define the associations
  belongs_to :appointment

  # * define the validations
  validates :complaint_description, :condition, presence: true
end
