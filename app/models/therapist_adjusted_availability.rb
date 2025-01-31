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
  #  Check that the date inputted cannot be a past date
  validate :not_in_past, if: :specific_date
  # Overlapping availability periods validation
  validate :no_overlapping_times

  # If both start_time and end_time are nil => "Fully Unavailable"
  def unavailable?
    start_time.blank? && end_time.blank?
  end

  private

  # Past date prevention
  def not_in_past
    if specific_date.past?
      errors.add(:specific_date, "cannot be in the past")
    end
  end

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

  # Validates that there are no overlapping availability periods for the therapist.
  # Example of overlapping: if an availability exists from 10:00 to 12:00,
  # another availability from 11:00 to 13:00 would be considered overlapping.
  def no_overlapping_times
    return if start_time.nil? || end_time.nil?

    overlapping = TherapistAdjustedAvailability.where(
      therapist_appointment_schedule_id: therapist_appointment_schedule_id,
      specific_date: specific_date
    ).where.not(id: id)
      .where("(start_time < ?) AND (end_time > ?)", end_time, start_time)

    if overlapping.exists?
      errors.add(:base, "Time range overlaps with existing availability for #{specific_date}")
    end
  end
end
