class AppointmentDraft < ApplicationRecord
  # Associations
  belongs_to :admin_pic, class_name: "Admin", optional: true  # Keep for backward compatibility
  belongs_to :created_by_admin, class_name: "Admin"
  belongs_to :appointment, optional: true

  has_many :appointment_draft_admins, dependent: :destroy
  has_many :admins, through: :appointment_draft_admins
  has_one :primary_admin_draft, -> { primary }, class_name: "AppointmentDraftAdmin"
  has_one :primary_admin, through: :primary_admin_draft, source: :admin

  # Enums
  enum :status, {active: 0, expired: 1}

  # Validations
  validates :current_step, presence: true
  validates :form_data, presence: true

  # Scopes
  scope :active_drafts, -> { where(status: :active) }
  scope :expired_drafts, -> { where(status: :expired) }
  scope :for_admin_pic, ->(admin_id) { where(admin_pic_id: admin_id) }
  scope :created_by, ->(admin_id) { where(created_by_admin_id: admin_id) }
  scope :cleanup_eligible, -> { expired.where("expires_at < ?", 3.days.ago) }

  # Callbacks
  before_create :set_expires_at

  # Constants
  STEPS = %w[patient_details appointment_scheduling additional_settings review].freeze
  STATUS_REASONS = [
    {
      labelEn: "Schedule approved",
      labelId: "Sudah menyetujui jadwal",
      value: "SCHEDULE_APPROVED"
    },
    {
      labelEn: "Waiting for patient confirmation",
      labelId: "Menunggu konfirmasi pasien",
      value: "WAITING_FOR_PATIENT_CONFIRMATION"
    },
    {
      labelEn: "Waiting for karpis confirmation",
      labelId: "Menunggu konfirmasi karpis",
      value: "WAITING_FOR_KARPIS_CONFIRMATION"
    },
    {
      labelEn: "Waiting for partner confirmation",
      labelId: "Menunggu konfirmasi mitra",
      value: "WAITING_FOR_PARTNER_CONFIRMATION"
    },
    {
      labelEn: "Still looking for therapist",
      labelId: "Masih dicarikan terapis",
      value: "STILL_LOOKING_FOR_THERAPIST"
    },
    {
      labelEn: "Waiting for patient schedule",
      labelId: "Menunggu jadwal pasien",
      value: "WAITING_FOR_PATIENT_SCHEDULE"
    }
  ].freeze

  # Class methods
  def self.status_reason_options
    STATUS_REASONS.map { |reason| [reason[:labelId], reason[:value]] }
  end

  def self.status_reason_labels
    STATUS_REASONS.pluck(:labelId)
  end

  def self.find_status_reason_by_value(value)
    STATUS_REASONS.find { |reason| reason[:value] == value }&.dig(:labelId)
  end

  def self.find_label_id_by_value(value)
    STATUS_REASONS.find { |reason| reason[:value] == value }&.dig(:labelId)
  end

  # Instance methods
  def expire_with_appointment!(appointment)
    update!(
      status: :expired,
      appointment: appointment
    )
  end

  def step_index
    STEPS.index(current_step) || 0
  end

  def next_step
    next_index = step_index + 1
    STEPS[next_index] if next_index < STEPS.length
  end

  def completed?
    current_step == STEPS.last
  end

  # Admin management methods
  def add_admin(admin, is_primary: false)
    return if admins.include?(admin)

    transaction do
      # If this is the first admin, make it primary
      is_primary = true if admins.empty?

      appointment_draft_admins.create!(admin: admin, is_primary: is_primary)

      # Update legacy admin_pic field for backward compatibility
      if is_primary || admin_pic.blank?
        update!(admin_pic: admin)
      end
    end
  end

  def ensure_admin_in_form_data!(admin)
    return if form_data.blank?

    data = if form_data.is_a?(String)
      JSON.parse(form_data)
    else
      form_data.deep_dup
    end

    data["additionalSettings"] ||= {}
    data["additionalSettings"]["admins"] ||= []

    admin_exists = data["additionalSettings"]["admins"].any? do |admin_hash|
      admin_hash["id"].to_s == admin.id.to_s
    end

    return if admin_exists

    data["additionalSettings"]["admins"] << {
      "id" => admin.id,
      "name" => admin.name,
      "email" => admin.user&.email.to_s
    }

    update!(form_data: data)
  end

  def remove_admin(admin)
    appointment_draft_admins.where(admin: admin).destroy_all

    # If we removed the primary admin, promote another one
    if primary_admin == admin && admins.any?
      new_primary = admins.first
      appointment_draft_admins.where(admin: new_primary).first!.update!(is_primary: true)
      update!(admin_pic: new_primary)
    elsif admins.empty?
      update!(admin_pic: nil)
    end
  end

  def set_primary_admin(admin)
    return unless admins.include?(admin)

    transaction do
      appointment_draft_admins.update_all(is_primary: false)
      appointment_draft_admins.where(admin: admin).first!.update!(is_primary: true)
      update!(admin_pic: admin)
    end
  end

  # Override admin_pic to return primary admin if not set
  def admin_pic
    super || primary_admin
  end

  private

  def set_expires_at
    self.expires_at = 14.days.from_now
  end
end
