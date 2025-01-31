class TherapistWeeklyAvailability < ApplicationRecord
  include AvailabilityTimeValidation

  # * define the associations
  belongs_to :therapist_appointment_schedule

  # * define the validations
  validates :day_of_week,
    presence: true,
    inclusion: {in: Date::DAYNAMES, message: "%{value} is not a valid day of the week"}
  # Add this uniqueness validation to match your DB index
  validates :end_time,
    uniqueness: {
      scope: [:therapist_appointment_schedule_id, :day_of_week, :start_time, :end_time],
      message: "Exact availability for this day/time range already exists"
    }
  # Overlapping availability periods validation
  validate :no_overlapping_times

  private

  # Validates that there are no overlapping availability periods for the therapist.
  # Example of overlapping: if an availability exists from 10:00 to 12:00,
  # another availability from 11:00 to 13:00 would be considered overlapping.
  def no_overlapping_times
    return if start_time.nil? || end_time.nil?

    overlapping = TherapistWeeklyAvailability.where(
      therapist_appointment_schedule_id: therapist_appointment_schedule_id,
      day_of_week: day_of_week
    ).where.not(id: id)
      .where("(start_time < ?) AND (end_time > ?)", end_time, start_time)

    if overlapping.exists?
      errors.add(:base, "Time range overlaps with existing availability for #{day_of_week}")
    end
  end
end
