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
  # validate :therapist_must_be_active

  # Default availability rules used when no custom rules are set.
  # These represent the standard maximum distance (in meters) and duration (in minutes)
  # for therapist availability if no custom rules are provided.
  DEFAULT_AVAILABILITY_RULES = [
    {"distance_in_meters" => 25_000},
    {"duration_in_minutes" => 50},
    {"location" => true}
  ].freeze

  # Returns the effective availability rules for this schedule.
  # If custom rules are present and valid, they are used (filtering out 0 values).
  # Otherwise, the default rules are returned.
  #
  # Rules can be:
  #   - Only distance: [{"distance_in_meters" => 25000}]
  #   - Only duration: [{"duration_in_minutes" => 50}]
  #   - Both: [{"distance_in_meters" => 25000}, {"duration_in_minutes" => 50}]
  #   - None (nil or []): falls back to default rules
  #   - Zero values: [{"distance_in_meters" => 0}] will be filtered out
  def effective_availability_rules
    if availability_rules.present? && availability_rules.is_a?(Array) && availability_rules.any?
      # Filter out rules with 0 values
      filtered_rules = availability_rules.filter do |rule|
        # Keep rule if it has location (regardless of value)
        next true if rule.key?("location") && rule["location"]
        # Keep rule if distance is greater than 0
        next true if rule.key?("distance_in_meters") && rule["distance_in_meters"].to_i > 0
        # Keep rule if duration is greater than 0
        next true if rule.key?("duration_in_minutes") && rule["duration_in_minutes"].to_i > 0
        # Otherwise, filter it out
        false
      end

      # If no rules after filtering, use defaults
      filtered_rules.any? ? filtered_rules : DEFAULT_AVAILABILITY_RULES
    else
      DEFAULT_AVAILABILITY_RULES
    end
  end

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

  # def therapist_must_be_active
  #   if therapist.employment_status != "ACTIVE"
  #     errors.add(:base, "Cannot create or update a schedule for a non-active therapist")
  #   end
  # end

  # Validates that availability_rules, if present, is an array of hashes,
  # and each hash contains at least one of the allowed keys:
  #   - "distance_in_meters"
  #   - "duration_in_minutes"
  #   - "location"
  #
  # This allows any combination: just distance, just duration, just location, or any combination.
  def availability_rules_format
    return if availability_rules.blank?

    if !availability_rules.is_a?(Array) ||
        !availability_rules.all? { |rule| rule.is_a?(Hash) && (rule.key?("distance_in_meters") || rule.key?("duration_in_minutes") || rule.key?("location")) }
      errors.add(:availability_rules, "must be an array of hashes with distance_in_meters, duration_in_minutes, or location keys")
    end
  end
end
