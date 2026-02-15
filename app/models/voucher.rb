class Voucher < ApplicationRecord
  # Relationships
  has_many :voucher_packages, dependent: :destroy
  has_many :packages, through: :voucher_packages
  has_many :voucher_usages, dependent: :destroy

  # Default scope to exclude deleted records
  default_scope -> { where(deleted_at: nil) }

  # Validations
  validates :code, presence: true, uniqueness: {conditions: -> { where(deleted_at: nil) }}
  validates :discount_type, presence: true
  validates :discount_value, presence: true, numericality: {greater_than: 0}
  validates :quota, presence: true, numericality: {greater_than_or_equal_to: 0}
  validates :used_count, numericality: {greater_than_or_equal_to: 0}
  validates :max_discount_amount, numericality: {greater_than_or_equal_to: 0}, allow_blank: true
  validates :min_order_amount, numericality: {greater_than_or_equal_to: 0}, allow_blank: true
  validate :valid_from_must_be_before_valid_until

  # Scopes
  scope :active, -> { where(is_active: true) }
  scope :by_code, ->(code) { where("code ILIKE ?", "%#{code}%") }
  scope :by_discount_type, ->(type) { where(discount_type: type) }

  # Enums
  enum :discount_type, {percentage: "PERCENTAGE", fixed: "FIXED"}

  # Methods
  def remaining_quota
    quota - used_count
  end

  def can_be_used?
    is_active &&
      remaining_quota > 0 &&
      (valid_from.nil? || valid_from <= Time.current) &&
      (valid_until.nil? || valid_until >= Time.current)
  end

  private

  def valid_from_must_be_before_valid_until
    return if valid_from.blank? || valid_until.blank?

    if valid_from > valid_until
      errors.add(:valid_from, "must be before valid until")
    end
  end
end
