class OrderDetail < ApplicationRecord
  belongs_to :order
  belongs_to :appointment, optional: true

  validates :visit_number, presence: true, numericality: {greater_than: 0}
  validates :base_fee, numericality: {greater_than_or_equal_to: 0}
  validates :travel_fee, numericality: {greater_than_or_equal_to: 0}
  validates :additional_fee, numericality: {greater_than_or_equal_to: 0}
  validates :subtotal_fee, numericality: {greater_than_or_equal_to: 0}
  validates :allocated_amount, numericality: {greater_than_or_equal_to: 0}
  validates :visit_status, presence: true, inclusion: {in: %w[PENDING SCHEDULED COMPLETED CANCELLED NO_SHOW]}
end
