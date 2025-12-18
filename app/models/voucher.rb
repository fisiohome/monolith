class Voucher
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :id, :string
  attribute :code, :string
  attribute :name, :string
  attribute :description, :string
  attribute :discount_type, :string
  attribute :discount_value, :float
  attribute :max_discount_amount, :float
  attribute :min_order_amount, :float
  attribute :quota, :integer
  attribute :used_count, :integer
  attribute :valid_from, :datetime
  attribute :valid_until, :datetime
  attribute :is_active, :boolean
  attribute :created_at, :datetime
  attribute :updated_at, :datetime
  attribute :packages, default: -> { [] }
end
