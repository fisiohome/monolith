class PatientAddress < ApplicationRecord
  include ActivationValidation

  # * define the associations
  belongs_to :patient
  belongs_to :address

  # * cycle callbacks
  before_save :ensure_single_active_address, if: :active

  # * define the validation
  # validates :active, uniqueness: {scope: :patient_id, message: "only one active address is allowed per patient"}, if: -> { active }

  private

  def ensure_single_active_address
    # Deactivate any other active address for the same therapist
    PatientAddress.where(patient_id: patient_id, active: true)&.where&.not(id: id)&.update_all(active: false)
  end
end
