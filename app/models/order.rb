class Order < ApplicationRecord
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
  validates :payment_status, presence: true
  validates :status, presence: true
end
