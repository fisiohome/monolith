class Therapist < ApplicationRecord
  # define the associations
  belongs_to :user

  belongs_to :service
  has_one :active_service, -> { where(active: true) }, class_name: "Service"

  has_one :therapist_document, dependent: :destroy
  accepts_nested_attributes_for :therapist_document

  has_many :therapist_addresses, dependent: :destroy
  has_many :addresses, through: :therapist_addresses
  has_one :active_therapist_address, -> { where(active: true) }, class_name: "TherapistAddress"
  has_one :active_address, through: :active_therapist_address, source: :address

  has_many :therapist_bank_details, dependent: :destroy
  has_many :bank_details, through: :therapist_bank_details
  has_one :active_therapist_bank_detail, -> { where(active: true) }, class_name: "TherapistBankDetail"
  has_one :active_bank_detail, through: :active_therapist_bank_detail, source: :bank_detail

  # cycle callbacks
  after_destroy :destroy_associated_user
  before_create :assign_registration_number
  after_save :update_user_suspend_status

  # define the validation
  enum :gender, { MALE: "MALE", FEMALE: "FEMALE" }, prefix: true
  validates :gender, presence: true, inclusion: { in: [ "MALE", "FEMALE" ], message: "%{value} is not a valid gender"  }

  enum :employment_type, { KARPIS: "KARPIS", FLAT: "FLAT" }, prefix: true
  validates :employment_type, presence: true, inclusion: { in: [ "KARPIS", "FLAT" ], message: "%{value} is not a valid employment type"  }

  enum :employment_status, { ACTIVE: "ACTIVE", HOLD: "HOLD", INACTIVE: "INACTIVE" }, prefix: true
  validates :employment_status, presence: true, inclusion: { in: [ "ACTIVE", "HOLD", "INACTIVE" ], message: "%{value} is not a valid employment status" }

  validates :name, :specialization, :modality, presence: true
  validates :batch, numericality: true, presence: true
  validates :phone_number, :registration_number, uniqueness: true, presence: true

  self.implicit_order_column = "created_at"

  private

  def destroy_associated_user
    return if !user.present?

    logger.info "Deleting the associated User: #{user.email}"
    user.destroy
  end

  def assign_registration_number
    service_code = Service.find(service_id).code
    registration_counter = TherapistRegistrationCounter.find_or_create_by(service_code: service_code) do |counter|
      counter.last_number = 0
    end

    self.registration_number = "#{service_code}#{format('%04d', registration_counter.last_number + 1)}"
    registration_counter.increment!(:last_number)
  end

  def update_user_suspend_status
    return unless saved_change_to_employment_status?

    case employment_status
    when "ACTIVE"
      user.update(suspend_at: nil, suspend_end: nil) # Remove suspension
    when "HOLD", "INACTIVE"
      suspend_duration = employment_status == "HOLD" ? 7.days : nil # Example: 7 days suspension for "HOLD"
      user.update(
        suspend_at: Time.current,
        suspend_end: suspend_duration ? Time.current + suspend_duration : nil
      )
    end
  end
end