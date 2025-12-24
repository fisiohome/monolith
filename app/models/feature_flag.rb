class FeatureFlag
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :key, :string
  attribute :env, :string
  attribute :is_enabled, :boolean
  attribute :created_at, :datetime
  attribute :updated_at, :datetime
end
