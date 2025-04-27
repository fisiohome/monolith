module PackagePrices
  extend ActiveSupport::Concern

  included do
    include ActionView::Helpers::NumberHelper

    # * define the validation
    # presence
    validates :name, :currency, :number_of_visit,
      :price_per_visit, :total_price,
      :fee_per_visit, :total_fee,
      presence: true

    # numericity
    validates :number_of_visit,
      numericality: {only_integer: true, greater_than: 0}
    validates :price_per_visit, :total_price,
      :fee_per_visit, :total_fee,
      numericality: {greater_than_or_equal_to: 0}
    validates :discount,
      numericality: {greater_than_or_equal_to: 0, allow_nil: true}

    # * define callbacks
    before_validation :calculate_totals
  end

  # — callbacks
  def calculate_totals
    return unless number_of_visit && price_per_visit && fee_per_visit

    self.total_price = number_of_visit * price_per_visit - (discount || 0)
    self.total_fee = number_of_visit * fee_per_visit
  end
  private :calculate_totals

  # * instance attribute values
  # — helpers
  def total_price_without_discount
    number_of_visit * price_per_visit
  end

  # formats any of the five money fields
  %i[
    price_per_visit total_price
    fee_per_visit total_fee
    discount
  ].each do |field|
    define_method :"formatted_#{field}" do
      amount = public_send(field)
      amount.present? ? number_to_currency(amount, unit: currency, precision: 2, format: "%u %n") : nil
    end
  end

  # formatted_total_price_without_discount
  def formatted_total_price_without_discount
    number_to_currency(total_price_without_discount, unit: currency, precision: 2, format: "%u %n")
  end
end
