class AppointmentEvidence < ApplicationRecord
  belongs_to :appointment
  belongs_to :patient

  has_many :appointment_evidence_photos, dependent: :destroy, foreign_key: "evidence_id"

  validates :token, presence: true
  validates :nonce, presence: true

  scope :active, -> { where(deleted_at: nil) }

  def soft_delete!
    update(deleted_at: Time.current)
  end

  def deleted?
    deleted_at.present?
  end
end
