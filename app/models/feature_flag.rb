class FeatureFlag
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :key, :string
  attribute :env, :string
  attribute :is_enabled, :boolean
  attribute :created_at, :datetime
  attribute :updated_at, :datetime

  def self.environment_for_current_rails_env
    case Rails.env
    when "development"
      "DEV"
    when "staging"
      "STAGING"
    else
      "PROD"
    end
  end
end
