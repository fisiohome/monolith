class TherapistAdjustedAvailability < ApplicationRecord
  include AvailabilityTimeValidation

  # * define the associations
  belongs_to :therapist_appointment_schedule

  # * define the validations
  validates :specific_date, presence: true

  validates :specific_date,
    uniqueness: {
      scope: [:therapist_appointment_schedule_id, :start_time, :end_time],
      message: "Exact duplicate record already exists for this schedule, date, and time."
    }

  # Must not exceed the parent schedule window (if not available_now)
  validate :adjusted_availabilities_within_date_window

  # Fully Unavailable vs. Partial Availability priority
  validate :no_mixing_full_and_partial_for_same_date

  # ? TECH-DEBT - will be skipped for now, not running properly
  # Overlapping checks validation (partial overlap)
  # validate :no_overlapping_availabilities
  # validate :no_overlapping_availabilities, unless: :unavailable?

  # If both start_time and end_time are nil => "Fully Unavailable"
  def unavailable?
    start_time.blank? && end_time.blank?
  end

  private

  # Adjusted Availabilities Must Not Exceed the Schedule Window
  def adjusted_availabilities_within_date_window
    schedule = therapist_appointment_schedule
    return if schedule.available_now? # no window restriction if available_now

    if schedule.start_date_window.present? && schedule.end_date_window.present?
      if specific_date < schedule.start_date_window || specific_date > schedule.end_date_window
        errors.add(:specific_date, "must be within the schedule date window (#{schedule.start_date_window} - #{schedule.end_date_window})")
      end
    end
  end

  # Fully Unavailable vs. Partial Availability Priority
  # e.g. If a date is fully unavailable, don't allow partial blocks for the same date.
  # If partial availability already exists, don't allow marking that date as fully unavailable.
  def no_mixing_full_and_partial_for_same_date
    existing_records = TherapistAdjustedAvailability
      .where(therapist_appointment_schedule_id: therapist_appointment_schedule_id,
        specific_date: specific_date)
      .where.not(id: id)

    if unavailable?
      # This new record is "fully unavailable"
      if existing_records.where.not(start_time: nil, end_time: nil).exists?
        errors.add(:base, "Cannot mark date fully unavailable if partial availability exists for this date")
      end
    elsif existing_records.where(start_time: nil, end_time: nil).exists?
      # This new record is partial
      errors.add(:base, "Cannot create partial availability if date is already fully unavailable")
    end
  end

  # ? TECH-DEBT - will be skipped for now, not running properly
  # Validates that there are no overlapping availability periods for the therapist.
  # Example of overlapping: if an availability exists from 10:00 to 12:00,
  # another availability from 11:00 to 13:00 would be considered overlapping.
  # def no_overlapping_availabilities
  #   # Only check partial overlap if we have times
  #   return if unavailable?

  #   overlapping = TherapistAdjustedAvailability
  #     .where(therapist_appointment_schedule_id: therapist_appointment_schedule_id,
  #       specific_date: specific_date)
  #     .where.not(id: id)
  #     .where.not(start_time: nil, end_time: nil)
  #     .where("start_time < ? AND end_time > ?", end_time, start_time)

  #   if overlapping.exists?
  #     errors.add(:base, "Overlapping availability exists with another record on this date")
  #   end
  # end
  #
  # def no_overlapping_availabilities
  #   overlapping = TherapistAdjustedAvailability
  #     .where(therapist_appointment_schedule_id: therapist_appointment_schedule_id)
  #     .where(specific_date: specific_date)
  #     .where.not(id: id)
  #     .where.not(start_time: nil, end_time: nil) # only compare with partial records
  #     .where("start_time < ? AND end_time > ?", end_time, start_time)

  #   if overlapping.exists?
  #     errors.add(:base, "Overlapping availability exists with another record")
  #   end
  # end
end
