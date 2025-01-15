class TherapistAppointmentSchedule < ApplicationRecord
  # define the associations
  belongs_to :therapist

  has_many :therapist_weekly_availabilities, dependent: :destroy

  has_many :therapist_adjusted_availabilities, dependent: :destroy

  # define the validations
  validates :time_zone, presence: true

  validates :appointment_duration_in_minutes, presence: true, numericality: {only_integer: true, greater_than: 0}
  validates :max_advance_booking_in_days, numericality: {only_integer: true, greater_than_or_equal_to: 0}
  validates :min_booking_before_in_hours, numericality: {only_integer: true, greater_than_or_equal_to: 0}
  validates :buffer_time_in_minutes, numericality: {only_integer: true, greater_than_or_equal_to: 0}

  # If available_now == true, start_date_window and end_date_window must be nil
  validates :start_date_window, :end_date_window, absence: true, if: :available_now?
  # If available_now == false, start_date_window and end_date_window must be present
  validates :start_date_window, :end_date_window, presence: true, unless: :available_now?
  # If start/end dates are set, ensure start <= end
  validate :start_date_before_end_date, unless: :available_now?
  validate :start_date_or_available_now
  validate :therapist_must_be_active

  private

  def start_date_before_end_date
    if start_date_window.present? && end_date_window.present? && end_date_window <= start_date_window
      errors.add(:end_date_window, "must be after the start date")
    end
  end

  def start_date_or_available_now
    return if available_now || start_date_window.present?

    errors.add(:base, "You must set 'available now' or provide a 'start date'")
  end

  def therapist_must_be_active
    if therapist.employment_status != "ACTIVE"
      errors.add(:base, "Cannot create or update a schedule for a non-active therapist")
    end
  end
end
