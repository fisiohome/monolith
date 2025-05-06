class Appointment < ApplicationRecord
  include ActionView::Helpers::NumberHelper

  # * define the attrs accessors and initializer
  attr_accessor :updater  # Temporary attribute to track who updated

  def initialize(*)
    super
  end

  # * define the constants
  PatientCondition = Struct.new(:title, :description)
  PATIENT_CONDITION = [
    PatientCondition.new("NORMAL", "Fully mobile with no restrictions"),
    PatientCondition.new("ONLY ABLE TO SIT", "Limited mobility, the patient can sit but not stand or walk"),
    PatientCondition.new("BEDRIDDEN", "The patient is confined to bed")
  ].freeze

  PREFERRED_THERAPIST_GENDER = ["MALE", "FEMALE", "NO PREFERENCE"].freeze

  REFERRAL_SOURCES = ["Instagram", "Facebook", "Family or Close Related Person", "Other"].freeze

  FISIOHOME_PARTNER_NAMES = ["Cosmart", "KlinikGo", "The Asian Parent", "Orami Circle", "Ibu2canggih", "Ibu Bayi Canggih", "Kompas myValue", "Blibli", "LoveCare", "Medlife", "Medikids", "Bumi Health", "Other"].freeze

  # * define the state machines
  # graph from deepseek
  # graph TD
  # A[UNSCHEDULED] -->|set date/time| B[PENDING THERAPIST ASSIGNMENT]
  # B -->|assign therapist| C[PENDING PATIENT APPROVAL]
  # C -->|patient approves| D[PENDING PAYMENT]
  # D -->|payment| E[PAID]
  # any -->|cancel| G[CANCELLED]
  state_machine :status, initial: :unscheduled do
    # Define all states
    state :unscheduled do
      def schedulable?
        appointment_date_time.present? && therapist_id.present?
      end
    end
    state :pending_therapist_assignment
    state :pending_patient_approval
    state :pending_payment
    state :paid
    state :cancelled

    # Event: Schedule an appointment (for sequents)
    event :schedule do
      transition unscheduled: :pending_therapist_assignment,
        if: :valid_for_scheduling?
    end

    # Event: Assign therapist to appointment
    event :assign_therapist do
      transition pending_therapist_assignment: :pending_patient_approval
    end

    # Event: Patient approves therapist
    event :patient_approve do
      transition pending_patient_approval: :pending_payment
    end

    # Event: Mark payment complete
    event :mark_paid do
      transition pending_payment: :paid
    end

    # Event: Cancel appointment
    event :cancel do
      transition all => :cancelled
    end

    # Automatic transitions
    before_transition any => :cancelled do |appointment|
      appointment.cascade_cancellation
    end
  end

  # * define enums
  enum :status, {
    unscheduled: "UNSCHEDULED",
    pending_therapist_assignment: "PENDING THERAPIST ASSIGNMENT",
    pending_patient_approval: "PENDING PATIENT APPROVAL",
    pending_payment: "PENDING PAYMENT",
    cancelled: "CANCELLED",
    paid: "PAID"
  }, prefix: true

  # * define the associations
  belongs_to :therapist, optional: true
  belongs_to :patient
  belongs_to :service
  belongs_to :package
  belongs_to :location

  belongs_to :reference_appointment,
    class_name: "Appointment",
    foreign_key: "appointment_reference_id",
    optional: true,
    inverse_of: :series_appointments
  has_many :series_appointments,
    class_name: "Appointment",
    foreign_key: "appointment_reference_id",
    dependent: :nullify,
    inverse_of: :reference_appointment

  has_many :appointment_admins
  has_many :admins, through: :appointment_admins

  has_one :patient_medical_record, dependent: :destroy
  accepts_nested_attributes_for :patient_medical_record

  has_one :address_history,
    class_name: "AppointmentAddressHistory",
    dependent: :destroy, # means if you ever delete an appointment, its history rows go with it.
    inverse_of: :appointment # helps Rails link objects in memory for nested builds or validations.
  accepts_nested_attributes_for :address_history

  has_one :package_history,
    class_name: "AppointmentPackageHistory",
    dependent: :destroy,
    inverse_of: :appointment
  accepts_nested_attributes_for :package_history

  has_many :status_histories,
    class_name: "AppointmentStatusHistory",
    dependent: :destroy,
    inverse_of: :appointment

  # * define the delegations
  delegate :preferred_therapist_gender, :patient, :service, :package, :location, :admins, :address_history, :package_history,
    to: :reference_appointment, prefix: true, allow_nil: true

  # * cycle callbacks
  before_validation :generate_registration_number, on: :create

  # Automatic status determination for new records
  before_validation :set_auto_status, on: :create

  # after every create, snap a fresh history record
  after_commit :snapshot_address_history, on: [:create]
  after_commit :snapshot_package_history, on: [:create]
  after_commit :track_status_change, on: [:create, :update], if: -> { saved_change_to_status? && updater.present? }

  # * define the validations
  validates :registration_number, uniqueness: true
  validates :visit_number, numericality: {
    only_integer: true,
    greater_than: 0,
    less_than_or_equal_to: ->(appt) { appt.package&.number_of_visit || 1 }
  }
  validates :preferred_therapist_gender, presence: true, inclusion: {in: PREFERRED_THERAPIST_GENDER}
  validates :referral_source, inclusion: {in: REFERRAL_SOURCES}, allow_blank: true
  validates :other_referral_source, presence: true, if: -> { referral_source == "Other" }
  validates :fisiohome_partner_name, presence: true, inclusion: {in: FISIOHOME_PARTNER_NAMES}, if: :fisiohome_partner_booking?
  validates :other_fisiohome_partner_name, presence: true, if: -> { fisiohome_partner_name == "Other" }

  with_options if: :initial_visit? do
    validate :initial_visit_requirements
  end

  with_options unless: :initial_visit? do
    validate :validate_series_requirements
  end

  with_options unless: :unscheduled? do
    validates :appointment_date_time, presence: true
  end

  validate :appointment_date_time_in_the_future
  validate :validate_visit_sequence
  validate :status_must_be_valid
  validate :validate_appointment_sequence
  validate :no_duplicate_appointment_time
  validate :no_overlapping_appointments

  validates_associated :address_history

  # * define the scopes
  scope :initial_visits, -> { where(appointment_reference_id: nil) }
  scope :series, -> { where.not(appointment_reference_id: nil) }
  scope :scheduled, -> { where.not(status: "UNSCHEDULED") }

  scope :apply_filters, ->(params) {
    # Chain scopes based on parameters
    filter_by_name(params[:therapist], :therapist)
      .filter_by_name(params[:patient], :patient)
      .filter_by_registration(params[:registration_number])
      .filter_by_city(params[:city])
      .apply_status_filter(params[:filter_by_appointment_status])
  }
  scope :filter_by_name, ->(name, association) {
    return self if name.blank?
    joins(association).where("#{association.to_s.pluralize}.name ILIKE ?", "%#{name}%")
  }
  scope :filter_by_registration, ->(reg_number) {
    return self if reg_number.blank?
    where("registration_number ILIKE ?", "%#{reg_number}%")
  }
  scope :filter_by_city, ->(city) {
    return self if city.blank?
    joins(:location).where("locations.city ILIKE ?", "%#{city}%")
  }
  scope :apply_status_filter, ->(filter) {
    case filter
    when "pending"
      pending
    when "past"
      past
    when "cancel"
      cancelled
    when "unschedule"
      unscheduled
    else
      # Default scope for active appointments
      future.status_paid
    end
  }
  scope :pending, -> {
    where(status: [
      "PENDING THERAPIST ASSIGNMENT",
      "PENDING PATIENT APPROVAL",
      "PENDING PAYMENT"
    ]).future
  }
  scope :cancelled, -> {
    where(status: "CANCELLED")
  }
  scope :unscheduled, -> {
    where(status: "UNSCHEDULED")
  }
  scope :past, -> {
    where("appointment_date_time < ?", Time.current)
      .status_paid
  }
  scope :future, -> {
    where("appointment_date_time >= ?", Time.current)
  }

  # * define the helper methods
  # Financial calculations group
  def voucher_discount
    0
  end

  def formatted_discount
    number_to_currency(voucher_discount, unit: package.currency, precision: 2, format: "%u %n")
  end

  def total_price
    package.total_price - voucher_discount
  end

  def formatted_total_price
    number_to_currency(total_price, unit: package.currency, precision: 2, format: "%u %n")
  end
  # end group

  def start_time
    appointment_date_time.strftime("%H:%M")
  end

  def end_time
    duration = therapist&.therapist_appointment_schedule&.appointment_duration_in_minutes || 0
    buffer = therapist&.therapist_appointment_schedule&.buffer_time_in_minutes || 0
    (appointment_date_time + (duration + buffer).minutes).strftime("%H:%M")
  end

  # Duration calculation for external access (used in validations)
  def total_duration_minutes
    return 0 unless therapist&.therapist_appointment_schedule

    # Sum of appointment duration and buffer time from therapist's schedule
    therapist.therapist_appointment_schedule.appointment_duration_in_minutes +
      therapist.therapist_appointment_schedule.buffer_time_in_minutes
  end

  def initial_visit?
    appointment_reference_id.nil? && visit_number == 1
  end

  def series?
    appointment_reference_id.present?
  end

  # Get total visits from historical package data at time of creation
  def total_package_visits
    package_history&.number_of_visit || package.number_of_visit
  end

  def visit_progress
    "#{visit_number}/#{total_package_visits}"
  end

  def series_completion
    completed_serie = reference_appointment&.series_appointments&.count.to_i
    total = total_package_visits - 1 # Subtract initial visit
    "#{completed_serie}/#{total}"
  end

  def next_available_visit_number
    # For initial visits, start counting from 2
    return 2 if initial_visit? && package.number_of_visit >= 2

    # For sequents appointment in multi-visit packages
    if reference_appointment
      current_max = reference_appointment.series_appointments.maximum(:visit_number) || 1
      next_num = current_max + 1
      (next_num <= reference_appointment.total_package_visits) ? next_num : nil
    end
  end

  def next_visit_progress
    return nil if visit_number === package.number_of_visit || !next_available_visit_number
    "#{next_available_visit_number}/#{total_package_visits}"
  end

  def series_available?
    package.number_of_visit > 1
  end

  def unscheduled?
    status == "UNSCHEDULED"
  end

  def needs_scheduling?
    unscheduled? && appointment_date_time.nil?
  end

  def next_visits
    series_appointments.find_by("visit_number > ?", visit_number)
  end

  # Returns an Array of appointments: the initial visit first, then
  # all of its series_appointments sorted by visit_number.
  def all_visits_in_series
    root = reference_appointment || self
    # include the root visit, then children
    ([root] + root.series_appointments.order(:visit_number))
  end

  private

  # * define the validation methods
  # Validation: Ensure appointment time is in the future
  def appointment_date_time_in_the_future
    return if appointment_date_time.blank? || appointment_date_time > Time.current

    errors.add(:appointment_date_time, "must be in the future")
  end

  # Validation: Ensure status is valid
  def status_must_be_valid
    return if status.blank?

    valid_keys = self.class.statuses.keys.map(&:to_s)
    valid_values = self.class.statuses.values

    unless valid_keys.include?(status.to_s) || valid_values.include?(status.to_s)
      errors.add(:status, "#{status} is not a valid appointment status")
    end
  end

  # Validation: Prevent exact time duplicates
  def no_duplicate_appointment_time
    return if appointment_date_time.blank? || patient.blank?

    conflicting = Appointment
      .where(patient: patient, appointment_date_time: appointment_date_time)
      .where.not(id: id)
      .exists?

    return unless conflicting

    formatted_date_time = appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
    errors.add(:appointment_date_time, "Already has an appointment at #{formatted_date_time}")
  end

  # Validation: Prevent overlapping time ranges
  def no_overlapping_appointments
    return if appointment_date_time.blank? || patient.blank?

    current_start = appointment_date_time
    current_end = current_start + total_duration_minutes.minutes

    Appointment.where(patient: patient)
      .where.not(id: id)
      .where.not(therapist_id: nil)
      .find_each do |existing|
      next unless existing.therapist&.therapist_appointment_schedule

      # Calculate existing appointment time range
      existing_total_duration_minutes = existing.total_duration_minutes
      existing_start = existing.appointment_date_time
      existing_end = existing_start + existing_total_duration_minutes.minutes

      overlapping = current_start < existing_end && current_end > existing_start
      if overlapping
        start = existing_start.strftime("%B %d, %Y %I:%M %p")
        ending = (existing_start + existing_total_duration_minutes.minutes).strftime("%I:%M %p")

        errors.add(:appointment_date_time, "overlaps with #{start} - #{ending}")
        break # Stop checking after first overlap
      end
    end
  end

  def initial_visit_requirements
    errors.add(:appointment_date_time, "Initial visit cannot be unscheduled") if unscheduled?
    errors.add(:appointment_date_time, "must be present for initial visit") if appointment_date_time.blank?
  end

  def validate_series_requirements
    errors.add(:appointment_reference_id, "cannot be modified") if appointment_reference_id_changed? && persisted?
    errors.add(:package_id, "must match reference appointment's package") if reference_appointment&.package_id != package_id
    errors.add(:patient_id, "must match reference appointment's patient") if reference_appointment&.patient_id != patient_id
  end

  def validate_visit_sequence
    return unless package && visit_number > total_package_visits

    errors.add(:visit_number, "exceeds package's total visits of #{total_package_visits}")
  end

  def valid_for_scheduling?
    appointment_date_time.present? && therapist_id.present?
  end

  def cascade_cancellation
    series_appointments.each do |appointment|
      appointment.cancel! unless appointment.cancelled?
    end
  end

  def validate_appointment_sequence
    if initial_visit?
      validate_initial_visit_position
    elsif series?
      validate_series_visit_position
    end
  end

  def validate_initial_visit_position
    first_series = series_appointments.order(:appointment_date_time).first
    return unless first_series

    return if appointment_date_time < first_series.appointment_date_time

    formatted_date = first_series.appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
    errors.add(:appointment_date_time, "The first visit must occur before any another visit series on #{formatted_date}")
  end

  def validate_series_visit_position
    initial = reference_appointment
    # Ensure initial visit exists and is scheduled
    if initial.appointment_date_time.blank?
      errors.add(:appointment_date_time, "First visit must be scheduled first")
      return
    end

    # appointment sequent must be after the initial visit
    if appointment_date_time <= initial.appointment_date_time
      formatted_initial_date = initial.appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
      errors.add(:appointment_date_time, "Visits series must be after the first visit on #{formatted_initial_date}")
      return
    end

    next_series = initial.series_appointments
      .where.not(id: id)
      .where("appointment_date_time > ?", appointment_date_time_was)
      .order(:appointment_date_time)
      .first

    return unless next_series

    # New date must be before the next appointment sequent
    return if appointment_date_time < next_series.appointment_date_time

    formatted_next_date = next_series.appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
    errors.add(:appointment_date_time, "This visit series must be before the next one on #{formatted_next_date}")
  end

  # * define the callback methods
  # Generates a unique registration number based on the service code and a random number.
  def generate_registration_number
    return if registration_number.present? || service.blank?

    service_code = service.code.upcase
    loop do
      random_number = SecureRandom.random_number(10**6).to_s.rjust(6, "0") # 6-digit random number
      candidate = "#{service_code}-#{random_number}"
      unless Appointment.exists?(registration_number: candidate)
        self.registration_number = candidate
        break
      end
    end
  end

  def snapshot_address_history
    addr = patient.active_address
    return unless addr

    # remove old snapshot (optional, but keeps only one record in the table)
    address_history&.destroy

    # Rails gives you this helper for has_one :address_history
    create_address_history!(
      location: addr.location,
      latitude: addr.latitude,
      longitude: addr.longitude,
      address_line: addr.address,
      postal_code: addr.postal_code,
      notes: addr&.notes
      # coordinates will be filled in by your default attribute
    )
  end

  def snapshot_package_history
    return if package.blank?

    # Remove previous history if exists
    package_history&.destroy

    create_package_history!(
      package: package,
      name: package.name,
      currency: package.currency,
      number_of_visit: package.number_of_visit,
      price_per_visit: package.price_per_visit,
      discount: package.discount,
      total_price: package.total_price,
      fee_per_visit: package.fee_per_visit,
      total_fee: package.total_fee
    )
  end

  def track_status_change
    raw_old, raw_new = saved_change_to_status
    # grab the enum_map = Appointment.statuses hash
    enum_map = self.class.statuses
    # Figure out the enum‐key for each side, whether Rails gave you the key or the value
    old_key = enum_map.key(raw_old) || raw_old
    new_key = enum_map.key(raw_new) || raw_new

    status_histories.create!(
      old_status: enum_map[old_key],   # always the human­readable string
      new_status: enum_map[new_key],   # e.g. "PENDING THERAPIST ASSIGNMENT"
      reason: status_reason, # from the optional column
      changed_by: updater.id # or however you track the actor
    )
  end

  def determine_initial_status
    return :pending_patient_approval if therapist_id.present?
    return :pending_therapist_assignment if initial_visit? || appointment_date_time.present?

    :unscheduled
  end

  def set_auto_status
    return unless new_record?

    self.status = determine_initial_status
  end
end
