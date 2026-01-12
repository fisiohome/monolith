class FeatureFlagChecker
  TELEGRAM_BROADCASTS_KEY = "TELEGRAM_BROADCASTS"

  def self.enabled?(key, env: FeatureFlag.environment_for_current_rails_env)
    new(env: env).enabled?(key)
  end

  def initialize(service: AdminPortal::FeatureFlagsService.new, env: FeatureFlag.environment_for_current_rails_env)
    @service = service
    @env = env
  end

  def enabled?(key)
    result = service.find(key: key, env: env)

    if result[:success]
      flag = result[:feature_flag]
      flag.is_a?(Hash) ? flag[:is_enabled] || flag["is_enabled"] : false
    else
      Rails.logger.warn("[FeatureFlagChecker] Unable to fetch #{key}: #{result[:errors]}")
      false
    end
  rescue => e
    Rails.logger.error("[FeatureFlagChecker] Error checking #{key}: #{e.message}")
    false
  end

  private

  attr_reader :service, :env
end
