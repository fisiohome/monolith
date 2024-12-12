class TherapistDocument < ApplicationRecord
  # define the associations
  belongs_to :therapist

  # define the validation
  validates :therapist_id, presence: true
end
