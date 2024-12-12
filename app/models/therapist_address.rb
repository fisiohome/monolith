class TherapistAddress < ApplicationRecord
  include Activation

  # define the associations
  belongs_to :therapist
  belongs_to :addresses

  # define the validation
  validates :therapist_id, :address_id, presence: true
  validates :active, uniqueness: { scope: :therapist_id, message: "only one active address is allowed per therapist" }, if: -> { active }

  private

  def ensure_single_active_bank_detail
    # Deactivate any other active address for the same therapist
    TherapistAddress.where(therapist_id: therapist_id, active: true).where.not(id: id).update_all(active: false)
  end
end
