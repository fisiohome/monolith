class Payment < ApplicationRecord
  belongs_to :order

  has_many :order_details, through: :order

  validates :payment_method, presence: true
  validates :payment_gateway, presence: true
  validates :amount, presence: true, numericality: {greater_than: 0}
  validates :status, presence: true
end
