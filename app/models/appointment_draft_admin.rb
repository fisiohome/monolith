class AppointmentDraftAdmin < ApplicationRecord
  belongs_to :appointment_draft
  belongs_to :admin

  validates :is_primary, inclusion: {in: [true, false]}

  scope :primary, -> { where(is_primary: true) }

  after_create :ensure_single_primary

  private

  def ensure_single_primary
    return unless is_primary?

    # Set all other admins for this draft as non-primary
    appointment_draft.appointment_draft_admins
      .where.not(id: id)
      .update_all(is_primary: false)
  end
end
