class FeatureFlagChecker
  TELEGRAM_BROADCASTS_KEY = "TELEGRAM_BROADCASTS"

  attr_reader :env

  def self.enabled?(key, env: FeatureFlag.environment_for_current_rails_env)
    return false unless key

    begin
      new(env: env).enabled?(key)
    rescue => e
      Rails.logger.error("[FeatureFlagChecker] Error checking #{key}: #{e.message}")
      false
    end
  end

  def initialize(env: FeatureFlag.environment_for_current_rails_env)
    @env = env
  end

  def enabled?(key)
    return false unless key

    FeatureFlag.enabled?(key, env)
  rescue => e
    Rails.logger.error("[FeatureFlagChecker] Error checking #{key}: #{e.message}")
    false
  end

  private
end
