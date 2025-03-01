class Package < ApplicationRecord
  include ActionView::Helpers::NumberHelper
  include ActivationValidation

  # * define the associations
  belongs_to :service

  has_many :appointments, dependent: :destroy

  # * define the validation
  validates :name, presence: true
  validates :currency, presence: true
  validates :number_of_visit, presence: true, numericality: {only_integer: true, greater_than: 0}
  validates :price_per_visit, presence: true, numericality: {greater_than_or_equal_to: 0}
  validates :total_price, presence: true, numericality: {greater_than_or_equal_to: 0}
  validates :fee_per_visit, presence: true, numericality: {greater_than_or_equal_to: 0}
  validates :total_fee, presence: true, numericality: {greater_than_or_equal_to: 0}
  validates :discount, numericality: {greater_than_or_equal_to: 0, allow_nil: true}

  # * define callbacks
  before_validation :calculate_total_price_and_fee

  # Methods to return formatted values
  def formatted_price_per_visit
    number_to_currency(price_per_visit, unit: currency, precision: 2, format: "%u %n")
  end

  def formatted_total_price
    number_to_currency(total_price, unit: currency, precision: 2, format: "%u %n")
  end

  def formatted_fee_per_visit
    number_to_currency(fee_per_visit, unit: currency, precision: 2, format: "%u %n")
  end

  def formatted_total_fee
    number_to_currency(total_fee, unit: currency, precision: 2, format: "%u %n")
  end

  def formatted_discount
    discount ? number_to_currency(discount, unit: currency, precision: 2, format: "%u %n") : nil
  end

  def total_price_without_discount
    number_of_visit * price_per_visit
  end

  def formatted_total_price_without_discount
    number_to_currency(total_price_without_discount, unit: currency, precision: 2, format: "%u %n")
  end

  private

  def calculate_total_price_and_fee
    return unless number_of_visit && price_per_visit && fee_per_visit

    self.total_price = number_of_visit * price_per_visit - (discount || 0)
    self.total_fee = number_of_visit * fee_per_visit
  end
end
