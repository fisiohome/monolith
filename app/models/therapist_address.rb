class TherapistAddress < ApplicationRecord
  include ActivationValidation

  # define the associations
  belongs_to :therapist
  belongs_to :address

  # cycle callbacks
  before_save :ensure_single_active_address, if: :active

  # define the validation
  # validates :active, uniqueness: {scope: :therapist_id, message: "only one active address is allowed per therapist"}, if: -> { active }

  private

  def ensure_single_active_address
    # Deactivate any other active address for the same therapist
    TherapistAddress.where(therapist_id: therapist_id, active: true).where.not(id: id).update_all(active: false)
  end
end
