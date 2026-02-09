module AdminPortal
  class FeatureFlagsController < ApplicationController
    before_action :ensure_admin!
    before_action :ensure_super_admin!

    def index
      render inertia: "AdminPortal/FeatureFlag/Index", props: deep_transform_keys_to_camel_case({
        feature_flags: deep_transform_keys_to_camel_case_array(feature_flags_list[:feature_flags]),
        environments: FeatureFlag::ENVIRONMENTS,
        current_env: current_env
      })
    end

    def create
      env = requested_env
      params = feature_flag_params
      # Ensure we have a hash, not an array
      flag_params = params.is_a?(Array) ? params.first : params

      # Create feature flag for all environments
      results = []
      FeatureFlag::ENVIRONMENTS.each do |environment|
        flag = FeatureFlag.new(flag_params)
        flag.env = environment

        results << if flag.save
          "#{environment}: created"
        else
          "#{environment}: #{flag.errors.full_messages.join(", ")}"
        end
      end

      success_count = results.count { |r| r.include?(": created") }

      if success_count == FeatureFlag::ENVIRONMENTS.length
        redirect_to admin_portal_feature_flags_path(env: env), notice: "Feature flag created successfully in all environments."
      elsif success_count > 0
        redirect_to admin_portal_feature_flags_path(env: env),
          notice: "Feature flag created in #{success_count} environments. Results: #{results.join("; ")}"
      else
        handle_feature_flag_failure(
          ["Failed to create feature flag: #{results.join("; ")}"],
          redirect_params: {new: "feature_flag", env: env}
        )
      end
    end

    def update
      env = requested_env
      params_array = feature_flag_params
      # Ensure we have a hash, not an array
      flag_params = params_array.is_a?(Array) ? params_array.first : params_array

      flag = FeatureFlag.find_flag(params[:id], env)

      if flag&.update(flag_params)
        redirect_to admin_portal_feature_flags_path(env: env), notice: "Feature flag updated successfully."
      else
        handle_feature_flag_failure(
          flag&.errors&.full_messages || ["Feature flag not found"],
          redirect_params: {edit: params[:id], env: env}
        )
      end
    end

    def toggle
      key = params[:id]
      env = params[:env] || current_env
      flag = FeatureFlag.find_flag(key, env)

      if flag
        previous_state = flag.is_enabled
        flag.toggle!

        redirect_to admin_portal_feature_flags_path(env: env),
          notice: "Feature flag '#{key}' #{previous_state ? "disabled" : "enabled"} successfully."
      else
        handle_feature_flag_failure(
          ["Feature flag not found"],
          redirect_params: {env: env}
        )
      end
    rescue => e
      handle_feature_flag_failure(
        [e.message],
        redirect_params: {env: env}
      )
    end

    def destroy
      key = params[:id]
      env = params[:env] || current_env

      flags = FeatureFlag.where(key: key)

      if flags.destroy_all
        redirect_to admin_portal_feature_flags_path(env: env), notice: "Feature flag deleted from all environments."
      else
        handle_feature_flag_failure(
          ["Failed to delete feature flag"],
          redirect_params: {env: env}
        )
      end
    end

    private

    def deep_transform_keys_to_camel_case_array(collection)
      Array.wrap(collection).map { |item| deep_transform_keys_to_camel_case(item) }
    end

    def feature_flags_list
      @feature_flags_list ||= begin
        flags = FeatureFlag.where(env: current_env).order(:key)
        {feature_flags: flags.map(&:attributes)}
      end
    end

    def current_env
      params[:env].presence || "PROD"
    end

    # Extracts and permits feature flag parameters from the request.
    # Handles both single feature flag and array of feature flags.
    # @return [ActionController::Parameters, Array<ActionController::Parameters>] permitted parameters
    def feature_flag_params
      raw = params.require(:feature_flag)
      if raw.is_a?(Array)
        raw.map { |item| item.permit(:key, :env, :is_enabled) }
      else
        raw.permit(:key, :env, :is_enabled)
      end
    end

    # Determines the environment for the current request.
    # Priority: URL param > feature flag param > current default env
    # @return [String] the environment identifier (e.g., "DEV", "STAGING", "PROD")
    def requested_env
      params[:env].presence || env_from_feature_flag_params || current_env
    end

    # Extracts the environment value from feature flag parameters.
    # For arrays, returns the first non-blank env found.
    # @return [String, nil] the environment from params or nil if not present
    def env_from_feature_flag_params
      flag_params = feature_flag_params

      case flag_params
      when Array
        # Lazily iterate to find first non-blank env value
        flag_params.lazy.map { |attrs| attrs[:env].presence }.detect(&:present?)
      else
        flag_params[:env].presence
      end
    end

    def handle_feature_flag_failure(errors, redirect_params:)
      flash[:alert] = extract_error_message(errors)
      redirect_to admin_portal_feature_flags_path(redirect_params), inertia: {
        errors: errors || {}
      }
    end

    def extract_error_message(errors)
      return "Failed to process feature flag." if errors.blank?

      messages = errors[:fullMessages] || errors["fullMessages"] ||
        errors[:full_messages] || errors["full_messages"]

      Array(messages).presence&.first || "Failed to process feature flag."
    end

    def ensure_admin!
      return if current_user&.admin.present?

      redirect_to authenticated_root_path, alert: "You do not have access to this resource."
    end

    def ensure_super_admin!
      return if current_user&.admin&.is_super_admin?

      redirect_to authenticated_root_path, alert: "You do not have access to this resource."
    end
  end
end
