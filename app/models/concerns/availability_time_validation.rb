module AvailabilityTimeValidation
  extend ActiveSupport::Concern

  included do
    validate :end_time_after_start_time
    validate :start_and_end_time_presence
  end

  private

  # Partial availability validation, ensure end_time > start_time
  def end_time_after_start_time
    if start_time.present? && end_time.present? && start_time >= end_time
      errors.add(:end_time, "must be after the start time")
    end
  end

  # Ensure start_time and end_time must both be present or both absent
  def start_and_end_time_presence
    if start_time.blank? ^ end_time.blank?  # XOR logic: one is present, the other is not
      errors.add(:base, "Start time and end time must both be present or both absent")
    end
  end
end
