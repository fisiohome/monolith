class PatientAddress < ApplicationRecord
  include ActivationValidation

  # * define the associations
  belongs_to :patient
  belongs_to :address

  # * class attributes for validation control
  class_attribute :skip_deactivation_validation, default: false

  before_validation :validate_address_uniqueness
  # * cycle callbacks
  before_save :ensure_single_active_address, if: :active?

  # * define the validation
  validates :patient_id, uniqueness: {
    scope: :address_id,
    message: "already has this address",
    conditions: -> { where(active: true) }
  }
  validate :patient_must_have_active_address, on: :create

  # * class methods for validation control
  def self.with_deactivation_validation_disabled
    original_value = skip_deactivation_validation
    self.skip_deactivation_validation = true
    yield
  ensure
    self.skip_deactivation_validation = original_value
  end

  private

  def ensure_single_active_address
    # Only run if we're setting this as active and there are other active addresses
    return unless active? && patient_id.present?

    # Check if there are other active addresses to deactivate
    other_active_addresses = PatientAddress.where(patient_id: patient_id, active: true)
      .where.not(id: id)

    if other_active_addresses.exists?
      # Deactivate any other active addresses for the same patient
      other_active_addresses.update_all(active: false)
    end
  end

  def validate_address_uniqueness
    return unless patient_id.present? && address_id.present?

    # Check if patient already has this exact address
    existing = PatientAddress.where(patient_id: patient_id, address_id: address_id)
      .where.not(id: id)
      .first

    if existing
      if active && !existing.active
        # Allow activating a duplicate that was previously inactive
        existing.destroy!
      else
        errors.add(:base, "Patient already has this address")
      end
    end
  end

  def patient_must_have_active_address
    return unless patient.present? && active?

    # Allow if this is the first address or patient already has an active address
    nil if patient.patient_addresses.where(active: true).where.not(id: id).empty?

    # If we're setting this as active and there's already an active one,
    # the ensure_single_active_address callback will handle it
  end

  def cannot_deactivate_if_only_active
    return if patient.blank?
    return unless active_changed?

    # Only check if we're deactivating (changing from true to false)
    return unless active_was && !active?

    # Don't allow deactivating if this is the only active address
    # Check for other active addresses excluding this record
    other_active_count = patient.patient_addresses.where(active: true).where.not(id: id).count
    if other_active_count == 0
      errors.add(:active, "cannot be deactivated - patient must have at least one active address")
    end
  end

  def skip_deactivation_validation?
    self.class.skip_deactivation_validation
  end
end
