class FeatureFlag < ApplicationRecord
  ENVIRONMENTS = %w[DEV STAGING PROD].freeze

  self.table_name = "feature_flags"
  self.primary_key = ["key", "env"]

  # Since Rails doesn't natively support composite primary keys without a gem,
  # we'll work with it using custom methods

  def self.find_flag(key, env)
    where(key: key, env: env).first
  end

  def self.enabled?(key, env)
    flag = find_flag(key, env)
    flag&.is_enabled || false
  end

  def toggle!
    update!(is_enabled: !is_enabled)
  end

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
