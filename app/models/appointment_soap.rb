class AppointmentSoap < ApplicationRecord
  belongs_to :appointment
  belongs_to :therapist

  scope :active, -> { where(deleted_at: nil) }
  scope :final_visits, -> { where(is_final_visit: true) }

  def soft_delete!
    update(deleted_at: Time.current)
  end

  def deleted?
    deleted_at.present?
  end
end
