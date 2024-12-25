class TherapistDocument < ApplicationRecord
  # define the associations
  belongs_to :therapist

  # define the validation
  # validate that the valid period is present only if the registration certificate document is present
  validates :registration_certificate_valid_period, presence: true, if: :registration_certificate_document_present?

  private

  def registration_certificate_document_present?
    registration_certificate_document.present?
  end
end
