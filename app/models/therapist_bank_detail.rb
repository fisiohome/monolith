class TherapistBankDetail < ApplicationRecord
  include Activation

  # define the associations
  belongs_to :therapist
  belongs_to :bank_detail
  accepts_nested_attributes_for :bank_detail

  # cycle callbacks
  before_save :ensure_single_active_bank_detail, if: :active

  # define the validation
  validates :active, uniqueness: {scope: :therapist_id, message: "only one active bank detail is allowed per therapist"}, if: -> { active }

  private

  def ensure_single_active_bank_detail
    # Deactivate any other active bank details for the same therapist
    TherapistBankDetail.where(therapist_id: therapist_id, active: true).where.not(id: id).update_all(active: false)
  end
end
