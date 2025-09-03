class Appointment < ApplicationRecord
  include ActionView::Helpers::NumberHelper

  # * define the attrs accessors, initializer, and the alias
  attr_accessor :updater  # Temporary attribute to track who updated
  attr_accessor :skip_auto_series_creation # Add a flag to control auto series creation

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

  STATUS_ORDER = %w[
    cancelled
    unscheduled
    on_hold
    pending_therapist_assignment
    pending_patient_approval
    pending_payment
    paid
    completed
  ].freeze
  STATUS_METADATA = {
    "cancelled" => {
      name: "Cancelled",
      description: "Appointment has been cancelled"
    },
    "unscheduled" => {
      name: "Unscheduled",
      description: "Appointment has not been scheduled yet"
    },
    "on_hold" => {
      name: "On Hold",
      description: "Appointment is on hold"
    },
    "pending_therapist_assignment" => {
      name: "Awaiting Therapist",
      description: "Appointment waiting for therapist assignment"
    },
    "pending_patient_approval" => {
      name: "Awaiting Approval",
      description: "Appointment waiting for patient confirmation"
    },
    "pending_payment" => {
      name: "Payment Required",
      description: "Appointment waiting for payment processing"
    },
    "paid" => {
      name: "Confirmed",
      description: "Appointment confirmed and paid"
    },
    "completed" => {
      name: "Completed",
      description: "Appointment has been completed"
    }
  }.freeze

  # * define enums
  enum :status, {
    cancelled: "CANCELLED",
    unscheduled: "UNSCHEDULED",
    on_hold: "ON HOLD",
    pending_therapist_assignment: "PENDING THERAPIST ASSIGNMENT",
    pending_patient_approval: "PENDING PATIENT APPROVAL",
    pending_payment: "PENDING PAYMENT",
    paid: "PAID",
    completed: "COMPLETED"
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

  # before every update, clear the details if the status is on hold
  before_save :clear_details_if_on_hold, if: -> { will_save_change_to_status? && status_on_hold? }

  # after every create, snap a fresh history record
  after_commit :create_series_appointments, on: :create, if: -> { should_create_series? && enable_auto_series_creation? }
  after_commit :snapshot_address_history, on: [:create]
  after_commit :snapshot_package_history, on: [:create]
  after_commit :track_status_change, on: [:create, :update], if: -> { saved_change_to_status? && updater.present? }

  # * define the validations
  validates :registration_number, uniqueness: {scope: :visit_number}
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

  with_options unless: -> { unscheduled? || status_on_hold? || status_cancelled? } do
    validates :appointment_date_time, presence: true
  end

  validate :appointment_date_time_in_the_future
  validate :validate_paid_requires_therapist
  validate :validate_visit_sequence
  validate :unscheduled_appointment_requirements
  validate :validate_appointment_sequence
  validate :no_duplicate_appointment_time
  validate :no_overlapping_appointments
  validate :status_must_be_valid
  validate :valid_status_transition
  validate :series_status_cannot_outpace_root
  validate :therapist_daily_limit

  validates_associated :address_history

  # * define the scopes
  scope :initial_visits, -> { where(appointment_reference_id: nil) }
  scope :series, -> { where.not(appointment_reference_id: nil) }
  scope :scheduled, -> { where.not(status: "UNSCHEDULED") }

  scope :apply_filters, ->(params, current_user = nil) {
    other_filters_blank = [
      params[:registration_number], params[:therapist], params[:patient],
      params[:city], params[:patient_genders], params[:service_ids], params[:package_ids]
    ].all?(&:blank?)

    # Chain scopes based on parameters
    filtered = filter_by_name(params[:therapist], :therapist)
      .filter_by_name(params[:patient], :patient)
      .filter_by_registration(params[:registration_number])
      .filter_by_city(params[:city])
      .filter_by_patient_genders(params[:patient_genders])
      .filter_by_service_ids(params[:service_ids])
      .filter_by_package_ids(params[:package_ids])
      .assigned_to(current_user)

    if params[:status].present? || other_filters_blank
      filtered = filtered.apply_status_filter(params[:status])
    end

    filtered
  }
  scope :filter_by_name, ->(name, association) {
    return self if name.blank?

    reflection = reflect_on_association(association)
    return self unless reflection

    table_name = reflection.klass.table_name
    joins(association).where("#{table_name}.name ILIKE ?", "%#{name}%")
  }
  scope :filter_by_registration, ->(reg_number) {
    return self if reg_number.blank?
    where("registration_number ILIKE ?", "%#{reg_number}%")
  }
  scope :filter_by_city, ->(city) {
    return self if city.blank?
    joins(:location).where("locations.city ILIKE ?", "%#{city}%")
  }
  # Filter appointments by one or more patient genders (e.g., ["MALE", "FEMALE"])
  scope :filter_by_patient_genders, ->(genders) {
    return self if genders.blank?
    joins(:patient).where(patients: {gender: genders.strip.split(/\s*,\s*/)})
  }
  # Filter appointments by one or more service_ids
  scope :filter_by_service_ids, ->(service_ids) {
    return self if service_ids.blank?
    where(service_id: service_ids.strip.split(/\s*,\s*/))
  }
  # Filter appointments by one or more package_ids
  scope :filter_by_package_ids, ->(package_ids) {
    return self if package_ids.blank?
    where(package_id: package_ids.strip.split(/\s*,\s*/))
  }
  # Scope: appointments assigned to a given user (therapist or admin)
  # Usage: Appointment.assigned_to(user)
  scope :assigned_to, ->(user) {
    return nil if user.blank?
    if user&.therapist&.present?
      where(therapist_id: user.therapist.id)
    elsif user&.admin&.present?
      joins(:admins).where(appointment_admins: {admin_id: user.admin.id})
    end
  }
  scope :apply_status_filter, ->(filter) {
    case filter
    when "pending_therapist"
      pending_therapist
    when "pending_patient_approval"
      pending_patient_approval
    when "pending_payment"
      pending_payment
    when "past"
      past
    when "cancel"
      cancelled
    when "unschedule"
      unscheduled
    when "on_hold"
      on_hold
    when "completed"
      completed
    when "upcoming"
      # Default scope for active appointments
      future.status_paid
    else
      # Default: today and future, excluding unscheduled, cancelled, and on hold
      today_and_future.where.not(status: ["UNSCHEDULED", "CANCELLED", "ON_HOLD"])
    end
  }
  scope :pending_therapist, -> { where(status: ["PENDING THERAPIST ASSIGNMENT"]).today_and_future }
  scope :pending_patient_approval, -> { where(status: ["PENDING PATIENT APPROVAL"]).today_and_future }
  scope :pending_payment, -> { where(status: ["PENDING PAYMENT"]).today_and_future }
  scope :cancelled, -> { where(status: "CANCELLED").where(appointment_reference_id: nil) }
  scope :unscheduled, -> { where(status: "UNSCHEDULED") }
  scope :on_hold, -> { where(status: "ON HOLD") }
  scope :completed, -> { where(status: "COMPLETED") }
  scope :past, -> { where("appointment_date_time < ?", Time.current.in_time_zone(Time.zone.name)) }
  scope :future, -> { where("appointment_date_time >= ?", Time.current.in_time_zone(Time.zone.name)) }
  scope :today_and_future, -> { where("appointment_date_time >= ?", Time.zone.now.beginning_of_day) }

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
    return if appointment_date_time.blank?
    appointment_date_time.strftime("%H:%M")
  end

  def end_time
    return if appointment_date_time.blank?
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

  def enable_auto_series_creation?
    !skip_auto_series_creation.nil? && skip_auto_series_creation == false
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
    status_unscheduled?
  end

  def schedulable?
    unscheduled? || status_pending_therapist_assignment? || status_pending_patient_approval?
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

  # returns the immediately preceding appointment in the series (or nil)
  def previous_visit
    return nil if initial_visit?

    # series visits: look up earlier-numbered series, falling back to the root
    reference_appointment
      .series_appointments
      .where("visit_number < ?", visit_number)
      .order(visit_number: :desc)
      .first ||
      reference_appointment
  end

  # returns the immediately following appointment in the series (or nil)
  def next_visit
    if initial_visit?
      # first visit → first series appointment
      series_appointments.order(visit_number: :asc).first
    else
      # series visit → next-numbered series
      reference_appointment.series_appointments
        .where("visit_number > ?", visit_number)
        .order(visit_number: :asc)
        .first
    end
  end

  # helpers to expose min/max datetimes
  def min_datetime
    prev = previous_visit
    while prev && prev.appointment_date_time.nil?
      prev = prev.previous_visit
    end
    prev&.appointment_date_time
  end

  def max_datetime
    nxt = next_visit
    while nxt && nxt.appointment_date_time.nil?
      nxt = nxt.next_visit
    end
    nxt&.appointment_date_time
  end

  def cancellable?
    # Initial visits can always be cancelled
    # Series appointments can be cancelled if initial visit is cancelled
    initial_visit? || (series? && reference_appointment.status_cancelled?)
  end

  def should_create_series?
    initial_visit? && series_available?
  end

  def status_human_readable
    STATUS_METADATA[status]
  end

  # Check if this appointment or its reference (first visit) is paid
  def paid?
    status_paid? || reference_appointment&.status_paid? || reference_appointment&.status_completed?
  end

  def completed?
    status_completed?
  end

  def cascade_cancellation(updater: nil, reason: nil)
    return unless initial_visit?

    series_appointments.where.not(status: :cancelled).find_each do |appt|
      appt.update(  # Use update instead of update! for validation handling
        status: :cancelled,
        status_reason: reason,
        updater:
      )
    end
  end

  def cascade_hold(updater: nil, reason: nil)
    series_appointments.where.not(status: [:on_hold, :completed]).find_each do |appt|
      appt.update(
        status: :on_hold,
        status_reason: reason,
        updater: updater
      )
    end
  end

  # Custom status transition methods
  def assign_therapist!
    base_message = "Cannot change to needs patient approval"
    unless valid_for_scheduling?
      errors.add(:base, "#{base_message}. " \
        "Required details: therapist and appointment time")
      return false
    end

    # ? turn off the validation now, preventing the strict status update validation because it's just used by our admin internal
    # if !schedulable? && !(updater_is_super_admin? || updater_is_admin_supervisor?)
    #   errors.add(:base, "#{base_message}, #{status_human_readable[:description]}")
    #   return false
    # end

    transaction do
      if update(status: :pending_patient_approval, status_reason:, updater:)
        true
      else
        errors.add(:base, "Failed change status to needs patient approval: #{errors.full_messages.join(", ")}")
        false
      end
    end
  end

  def patient_approve!
    # ? turn off the validation now, preventing the strict status update validation because it's just used by our admin internal
    # base_message = "Cannot change to waiting payment"
    # if !status_pending_patient_approval? && !(updater_is_super_admin? || updater_is_admin_supervisor?)
    #   errors.add(:base, "#{base_message}, #{status_human_readable[:description]}")
    #   return false
    # end

    transaction do
      if update(status: :pending_payment, status_reason:, updater:)
        true
      else
        errors.add(:base, "Failed change status to waiting payment: #{errors.full_messages.join(", ")}")
        false
      end
    end
  end

  def mark_paid!
    # ? turn off the validation now, preventing the strict status update validation because it's just used by our admin internal
    # base_message = "Cannot mark paid appointment"
    # if !status_pending_payment? && !(updater_is_super_admin? || updater_is_admin_supervisor?)
    #   errors.add(:base, "#{base_message}, #{status_human_readable[:description]}")
    #   return false
    # end

    transaction do
      if update(status: :paid, status_reason:, updater:)
        true
      else
        errors.add(:base, "Failed to mark paid appointment: #{errors.full_messages.join(", ")}")
        false
      end
    end
  end

  def mark_completed!
    transaction do
      if update(status: :completed, status_reason:, updater:)
        true
      else
        errors.add(:base, "Failed to mark completed appointment: #{errors.full_messages.join(", ")}")
        false
      end
    end
  end

  def cancel!
    unless cancellable?
      base_message = "Cannot cancel series appointment"
      error_message = (series? && !reference_appointment.status_cancelled?) ? "#{base_message}. First visit has not been cancelled (current status: #{status_human_readable[:name]})" : "#{base_message}, #{status_human_readable[:description]}"
      errors.add(:base, error_message)
      return false
    end

    transaction do
      if update(status: :cancelled, status_reason:, updater:)
        cascade_cancellation(updater:, reason: status_reason)
        true
      else
        errors.add(:base, "Cancellation failed: #{errors.full_messages.join(", ")}")
        false
      end
    end
  end

  def hold!
    transaction do
      if initial_visit?
        cascade_hold(updater:, reason: status_reason)
        true
      elsif update(status: :on_hold, status_reason:, updater:)
        reference_appointment&.cascade_hold(updater:, reason: status_reason)
        true
      else
        errors.add(:base, "Failed to hold appointment: #{errors.full_messages.join(", ")}")
        false
      end
    end
  end

  private

  def clear_details_if_on_hold
    self.appointment_date_time = nil
    self.therapist_id = nil
  end

  # ! To bypass the validation if updater is SUPER_ADMIN
  def updater_is_super_admin?
    updater&.admin&.is_super_admin?
  end

  def updater_is_admin_supervisor?
    updater&.admin&.is_admin_supervisor?
  end

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

  # Validation: Prevents a patient from having two appointments at the exact same date and time.
  def no_duplicate_appointment_time
    return if appointment_date_time.blank? || patient.blank?

    conflicting = Appointment
      .where(patient: patient, appointment_date_time: appointment_date_time)
      .where.not(id: id)
      .first

    return unless conflicting

    formatted_date_time = appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
    errors.add(:appointment_date_time, "already has an appointment (#{conflicting.registration_number}) on #{formatted_date_time}")
  end

  # Validation: Prevents a patient from having appointments that overlap in time, even if the start times are different.
  def no_overlapping_appointments
    return if appointment_date_time.blank? || patient.blank? || status_cancelled?

    current_start = appointment_date_time
    current_end = current_start + (total_duration_minutes || 0).minutes

    Appointment.where(patient: patient)
      .where.not(id: id)
      .where.not(therapist_id: nil)
      .find_each do |existing|
      next unless existing.therapist&.therapist_appointment_schedule

      # Calculate existing appointment time range
      existing_total_duration_minutes = existing.total_duration_minutes || 0
      existing_start = existing.appointment_date_time

      # Skip if appointment_date_time is nil
      next if existing_start.blank?

      existing_end = existing_start + existing_total_duration_minutes.minutes

      overlapping = current_start < existing_end && current_end > existing_start
      if overlapping
        start = existing_start.strftime("%B %d, %Y %I:%M %p")
        ending = (existing_start + existing_total_duration_minutes.minutes).strftime("%I:%M %p")

        errors.add(:appointment_date_time, "overlaps with (#{existing.registration_number}) on #{start} — #{ending}")
        break # Stop checking after first overlap
      end
    end
  end

  def initial_visit_requirements
    errors.add(:appointment_date_time, "initial visit cannot be unscheduled") if unscheduled?
    errors.add(:appointment_date_time, "must be present for initial visit") if appointment_date_time.blank?
  end

  def validate_series_requirements
    errors.add(:appointment_reference_id, "cannot be modified") if appointment_reference_id_changed? && persisted?
    errors.add(:package_id, "must match reference appointment's package") if reference_appointment&.package_id != package_id
    errors.add(:patient_id, "must match reference appointment's patient") if reference_appointment&.patient_id != patient_id
  end

  def unscheduled_appointment_requirements
    return unless unscheduled?

    if appointment_date_time.present?
      errors.add(:appointment_date_time, "must be blank for unscheduled appointments")
    end

    if therapist_id.present?
      errors.add(:therapist_id, "cannot be assigned to unscheduled appointments")
    end
  end

  def validate_visit_sequence
    return unless package && visit_number > total_package_visits

    errors.add(:visit_number, "exceeds package's total visits of #{total_package_visits}")
  end

  def valid_for_scheduling?
    appointment_date_time.present? && therapist_id.present?
  end

  def validate_appointment_sequence
    if initial_visit?
      validate_initial_visit_position
    elsif series?
      validate_series_visit_position
    else
      false
    end
  end

  def validate_initial_visit_position
    first_series = series_appointments.order(:appointment_date_time).first
    return false unless first_series

    return false if first_series.appointment_date_time.blank?

    return false if appointment_date_time < first_series.appointment_date_time

    formatted_date = first_series.appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
    errors.add(:appointment_date_time, "the first visit must occur before any another visit series (#{first_series.registration_number}) on #{formatted_date}")
    true
  end

  def validate_series_visit_position
    # skip the validation for unscheduled series & if there's not have series
    return false unless series? && appointment_date_time.present?

    initial = reference_appointment

    # First visit must be scheduled before any series visits
    if initial.appointment_date_time.blank?
      errors.add(:appointment_date_time, "first visit (#{initial.registration_number}) must be scheduled before scheduling any visit series")
      return true
    end

    # This series visit must come strictly after the first visit
    if appointment_date_time <= initial.appointment_date_time
      formatted_initial_start_date = initial.appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
      formatted_initial_end_date = (
        initial.appointment_date_time + initial.total_duration_minutes.minutes
      ).strftime("%I:%M %p")
      errors.add(
        :appointment_date_time,
        "must be after the first visit (#{initial.registration_number}) on " \
        "#{formatted_initial_start_date} — #{formatted_initial_end_date}"
      )
      return true
    end

    # This visit must be after the previous visit in the series (if any)
    prev = initial.series_appointments
      .where("visit_number < ?", visit_number)
      .order(visit_number: :desc)
      .first
    if prev&.appointment_date_time.present? && appointment_date_time <= prev.appointment_date_time
      formatted_prev_visit_date = prev.appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
      formatted_prev_end_date = (
        prev.appointment_date_time + prev.total_duration_minutes.minutes
      ).strftime("%I:%M %p")
      errors.add(
        :appointment_date_time,
        "must be after visit #{prev.visit_number}/#{total_package_visits} " \
        "(#{prev.registration_number}) on " \
        "#{formatted_prev_visit_date} — #{formatted_prev_end_date}"
      )
      return true
    end

    # This visit must be before the next visit in the series (if any)
    nxt = initial.series_appointments
      .where("visit_number > ?", visit_number)
      .order(visit_number: :asc)
      .first
    if nxt&.appointment_date_time.present? && appointment_date_time >= nxt.appointment_date_time
      formatted_nxt_visit_date = nxt.appointment_date_time.strftime("%B %d, %Y at %I:%M %p")
      formatted_nxt_end_date = (
        nxt.appointment_date_time + nxt.total_duration_minutes.minutes
      ).strftime("%I:%M %p")
      errors.add(
        :appointment_date_time,
        "must be before visit #{nxt.visit_number}/#{total_package_visits} " \
        "(#{nxt.registration_number}) on " \
        "#{formatted_nxt_visit_date} — #{formatted_nxt_end_date}"
      )
      return true
    end

    false
  end

  # Enforce that paid appointments must have a therapist when rescheduling
  def validate_paid_requires_therapist
    if status == "paid" && therapist_id.blank?
      errors.add(
        :therapist_id,
        "must be selected when rescheduling a paid appointment"
      )
    end
  end

  # ? Bug ticket documentation see: https://fisiohome.atlassian.net/browse/PE-64?atlOrigin=eyJpIjoiODcyNmJjNDU1YzVlNDBlMGJjY2VhYzJjNzQxMGU1NmUiLCJwIjoiaiJ9
  def series_status_cannot_outpace_root
    return unless series?
    return if status_cancelled?
    # skip if there's error on validate appointment sequence
    return if validate_appointment_sequence

    root = reference_appointment || self
    root.reload if root.persisted?  # Get fresh status from DB
    return if root.status_cancelled?

    root_status = root.status
    current_index = STATUS_ORDER.index(status)
    root_index = STATUS_ORDER.index(root.status)
    root_status_name = STATUS_METADATA[root_status][:name]

    if current_index > root_index
      errors.add(:status, "cannot be ahead of first visit (#{root.registration_number}) status (#{root_status_name})")
    end
  end

  def valid_status_transition
    # Skip for new records or cancellation
    return if status_was.nil? || status_cancelled?

    # ! SUPER_ADMIN can do anything about the status update
    return if updater_is_super_admin? || updater_is_admin_supervisor?

    previous_status = status_was
    new_status = status

    allowed_transitions = {
      "cancelled" => [],  # Once cancelled, no more transitions
      "unscheduled" => ["unscheduled", "pending_therapist_assignment", "pending_patient_approval", "on_hold", "cancelled"],
      "on_hold" => ["unscheduled", "on_hold", "pending_therapist_assignment", "pending_patient_approval"],
      "pending_therapist_assignment" => ["unscheduled", "pending_therapist_assignment", "pending_patient_approval", "on_hold", "cancelled"],
      "pending_patient_approval" => ["unscheduled", "pending_therapist_assignment", "pending_patient_approval", "pending_payment", "on_hold", "cancelled", "paid"],
      "pending_payment" => ["pending_payment", "paid", "cancelled"],
      "paid" => ["on_hold", "paid", "completed", "cancelled"],
      "completed" => []
    }

    previous_status_name = STATUS_METADATA[previous_status][:name]
    new_status_name = STATUS_METADATA[new_status][:name]
    unless allowed_transitions[previous_status]&.include?(new_status)
      errors.add(:status, "invalid transition from #{previous_status_name} to #{new_status_name}")
    end
  end

  def therapist_daily_limit
    return if appointment_date_time.blank? || therapist_id.blank? || status_cancelled?

    # Get the date part in the therapist's timezone if you have therapist time zones; otherwise, use Time.zone.
    appt_date = appointment_date_time.in_time_zone(Time.zone.name).to_date
    therapist = self.therapist
    schedule = therapist&.therapist_appointment_schedule
    max_appts = schedule&.max_daily_appointments

    # Count non-cancelled appointments for this therapist on the same day, excluding this record if updating.
    appointments_count = Appointment.where(
      therapist_id: therapist_id,
      appointment_date_time: appt_date.all_day # or appt_date.beginning_of_day..appt_date.end_of_day
    ).where.not(status: "CANCELLED")
      .where.not(id: id)
      .count

    # Add 1 if creating a new appointment or updating time/therapist
    appointments_count += 1 unless persisted? && !will_save_change_to_appointment_date_time? && !will_save_change_to_therapist_id?

    if appointments_count > max_appts
      therapist_name = therapist&.name || "Therapist"
      formatted_date = appt_date.strftime("%A, %B %d, %Y")
      errors.add(
        :base,
        "#{therapist_name} is already assigned #{max_appts} appointments on #{formatted_date}. " \
        "This would be the #{appointments_count.ordinalize} appointment. " \
        "Please choose another day or therapist."
      )
    end
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

    transaction do
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
  end

  def snapshot_package_history
    return if package.blank?

    transaction do
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
  end

  def track_status_change
    transaction do
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

  # Method to explicitly create series appointments
  def create_series_appointments
    return unless initial_visit?

    # Pull every column from the first visit
    template = attributes

    # Scrub columns that would violate PK/FK constraints or business rules
    scrubbed_template = template.except(
      "id", "visit_number", "appointment_reference_id",
      "therapist_id", "appointment_date_time", "status", "created_at", "updated_at"
    )

    # Add the fields that DO differ for each child
    (2..total_package_visits).each do |visit_no|
      sequel = series_appointments.create!(
        scrubbed_template.merge(
          visit_number: visit_no,
          appointment_date_time: nil,
          preferred_therapist_gender: preferred_therapist_gender,
          status: :unscheduled,
          skip_auto_series_creation: true,  # Prevent infinite recursion
          updater: updater,
          admins: admins
        )
      )

      # Clone (or stub) the medical record in the same fashion
      medical_attrs = if (pmr = patient_medical_record)
        pmr.attributes.except("id", "appointment_id", "created_at", "updated_at")
      else
        {complaint_description: "", condition: ""}
      end

      sequel.create_patient_medical_record!(medical_attrs)
    end
  end
end
