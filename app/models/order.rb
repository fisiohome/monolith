class Order < ApplicationRecord
  # * define the constants
  # Order Status (business workflow)
  ORDER_STATUS = %w[
    DRAFT
    PENDING_PAYMENT
    PARTIALLY_PAID
    PAID
    SCHEDULED
    IN_PROGRESS
    COMPLETED
    CANCELLED
    REFUNDED
  ].freeze

  # Payment Status (auto-updated by DB trigger)
  PAYMENT_STATUS = %w[
    UNPAID
    PARTIALLY_PAID
    PAID
    OVERPAID
    REFUNDED
  ].freeze

  belongs_to :patient
  belongs_to :package
  belongs_to :booking_draft, optional: true

  has_many :payments, dependent: :destroy
  has_many :order_details, dependent: :destroy

  # Association to appointments through registration_number
  has_many :appointments, class_name: "Appointment", foreign_key: "registration_number", primary_key: "registration_number"

  validates :registration_number, presence: true
  validates :package_base_price, presence: true, numericality: {greater_than_or_equal_to: 0}
  validates :subtotal, presence: true, numericality: {greater_than_or_equal_to: 0}
  validates :total_amount, presence: true, numericality: {greater_than_or_equal_to: 0}
  validates :payment_status, presence: true, inclusion: {in: PAYMENT_STATUS}
  validates :status, presence: true, inclusion: {in: ORDER_STATUS}
end
