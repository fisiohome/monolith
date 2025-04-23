class Appointment < ApplicationRecord
  include ActionView::Helpers::NumberHelper

  # * define the associations
  belongs_to :therapist, optional: true
  belongs_to :patient
  belongs_to :service
  belongs_to :package
  belongs_to :location

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

  # * cycle callbacks
  before_create :generate_registration_number

  # after every create OR update, snap a fresh history record
  after_commit :snapshot_address_history, on: [:create, :update]
  after_commit :snapshot_package_history, on: [:create, :update]

  # * define the validations
  validates :appointment_date_time, presence: true
  validate :appointment_date_time_in_the_future

  validates :registration_number, uniqueness: true

  validates :other_referral_source, presence: true, if: -> { referral_source == "Other" }

  validates :fisiohome_partner_name, presence: true, if: :fisiohome_partner_booking?
  validates :other_fisiohome_partner_name, presence: true, if: -> { fisiohome_partner_name == "Other" }

  validates :preferred_therapist_gender, presence: true

  validate :status_must_be_valid

  validate :no_duplicate_appointment_time
  validate :no_overlapping_appointments

  validates_associated :address_history

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

  enum :status, {
    pending_therapist_assignment: "PENDING THERAPIST ASSIGNMENT",
    pending_patient_approval: "PENDING PATIENT APPROVAL",
    pending_payment: "PENDING PAYMENT",
    cancelled: "CANCELLED",
    paid: "PAID"
  }, prefix: true

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

  private

  # Validation: Ensure appointment time is in the future
  def appointment_date_time_in_the_future
    if appointment_date_time.present? && appointment_date_time <= Time.current
      errors.add(:appointment_date_time, "must be in the future")
    end
  end

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
      existing_start = existing.appointment_date_time
      existing_end = existing_start + existing.total_duration_minutes.minutes

      overlapping = current_start < existing_end && current_end > existing_start
      if overlapping
        start = appointment_date_time.strftime("%B %d, %Y %I:%M %p")
        ending = (appointment_date_time + total_duration_minutes.minutes).strftime("%I:%M %p")

        errors.add(:appointment_date_time, "overlaps with #{start} - #{ending}")
        break # Stop checking after first overlap
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
end
