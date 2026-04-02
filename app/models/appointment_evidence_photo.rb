class AppointmentEvidencePhoto < ApplicationRecord
  belongs_to :evidence, class_name: "AppointmentEvidence"

  validates :object_key, presence: true
  validates :photo_type, presence: true, inclusion: {in: %w[environment selfie document other]}

  scope :active, -> { where(deleted_at: nil) }

  def soft_delete!
    update(deleted_at: Time.current)
  end

  def deleted?
    deleted_at.present?
  end
end
