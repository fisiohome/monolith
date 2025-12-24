module AdminPortal
  class FeatureFlagsService
    ENVIRONMENTS = %w[DEV STAGING PROD].freeze

    def initialize(client: FisiohomeApi::Client, key_format: :snake)
      @client = client
      @key_format = key_format
    end

    # Fetches a list of feature flags from the external API
    # @param env [String] the environment to fetch flags for (DEV, STAGING, PROD)
    # @return [Hash] hash containing feature_flags array, or empty defaults on error
    def list(env: nil)
      query = {env: env.presence}.compact

      response = client.get("/api/v1/feature-flags", params: query)

      if response.success?
        build_response(response.body)
      else
        Rails.logger.error("[FeatureFlagsService] Failed to fetch feature flags: #{response.status} - #{response.body}")
        {feature_flags: []}
      end
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      Rails.logger.error("[FeatureFlagsService] Network error when fetching feature flags: #{e.message}")
      {feature_flags: []}
    rescue Faraday::Error => e
      Rails.logger.error("[FeatureFlagsService] Faraday error when fetching feature flags: #{e.message}")
      {feature_flags: []}
    rescue => e
      Rails.logger.error("[FeatureFlagsService] Unexpected error when fetching feature flags: #{e.message}")
      {feature_flags: []}
    end

    # Creates or updates feature flags via the external API
    # POST /api/v1/feature-flags with body: { key, env, is_enabled } or [{ key, env, is_enabled }, ...]
    # @param attributes [Hash/Array] feature flag attributes or array of attributes
    # @return [Hash] hash with :success boolean and either :feature_flag/:feature_flags or :errors
    def save(attributes)
      if attributes.is_a?(Array)
        save_multiple(attributes)
      else
        save_single(attributes)
      end
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      handle_mutation_exception("save", e)
    rescue Faraday::Error => e
      handle_mutation_exception("save", e)
    rescue => e
      handle_mutation_exception("save", e)
    end

    # Deletes an existing feature flag via the external API
    # DELETE /api/v1/feature-flags/:key/:env
    # @param key [String] the feature flag key
    # @param env [String] the environment
    # @return [Hash] hash with :success boolean and optional :errors
    def destroy(key, env)
      response = client.delete("/api/v1/feature-flags/#{key}/#{env}")

      if response.success?
        {success: true}
      else
        Rails.logger.error("[FeatureFlagsService] Failed to delete feature flag #{key}/#{env}: #{response.status} - #{response.body}")
        errors = normalize_errors(response.body, fallback: "Failed to delete feature flag.")
        {success: false, errors: format_errors(errors)}
      end
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      handle_mutation_exception("delete", e)
    rescue Faraday::Error => e
      handle_mutation_exception("delete", e)
    rescue => e
      handle_mutation_exception("delete", e)
    end

    # Deletes a feature flag across every environment.
    # @param key [String] the feature flag key
    # @return [Hash] hash with :success boolean and either :deleted_count or :errors
    def destroy_all_environments(key)
      destroy_multiple(ENVIRONMENTS.map { |environment| {key: key, env: environment} })
    end

    # Deletes multiple feature flag instances by iterating over each
    # @param attributes_array [Array<Hash>] array of feature flag hashes with :key and :env
    # @return [Hash] hash with :success boolean and either :deleted_count or :errors
    def destroy_multiple(attributes_array)
      entries = Array(attributes_array).map do |attrs|
        attrs.respond_to?(:to_h) ? attrs.to_h.symbolize_keys.slice(:key, :env) : attrs
      end.compact

      if entries.blank?
        return {success: false, errors: format_errors({full_messages: ["No feature flags provided for deletion."]})}
      end

      results = []
      errors = []

      entries.each do |attrs|
        result = destroy(attrs[:key], attrs[:env])
        if result[:success]
          results << {key: attrs[:key], env: attrs[:env]}
        else
          errors.concat(Array(result[:errors]).flatten)
        end
      end

      if errors.empty?
        {success: true, deleted_count: results.length}
      else
        {success: false, errors: format_errors({full_messages: errors})}
      end
    end

    private

    # Saves a single feature flag
    def save_single(attributes)
      payload = normalize_feature_flag_payload(attributes)
      response = client.post("/api/v1/feature-flags", body: payload)
      handle_mutation_response(response, action: "save")
    end

    # Saves multiple feature flags by iterating over each
    def save_multiple(attributes_array)
      results = []
      errors = []

      attributes_array.each do |attrs|
        result = save_single(attrs)
        if result[:success]
          results << result[:feature_flag]
        else
          errors.concat(Array(result[:errors]).flatten)
        end
      end

      if errors.empty?
        formatted = deep_transform_keys_format({feature_flags: results}, format: key_format)
        {success: true, feature_flags: formatted[:feature_flags]}
      else
        {success: false, errors: format_errors({full_messages: errors})}
      end
    end

    attr_reader :client, :key_format

    # Combines the fetched feature flags data, then formats keys.
    def build_response(body)
      response = {
        feature_flags: build_feature_flags(body)
      }

      deep_transform_keys_format(response, format: key_format)
    end

    # Builds an array of feature flag hashes from the API response body.
    def build_feature_flags(body)
      normalize_items(extract_data(body)).map { |item| build_feature_flag(item) }.compact
    end

    # Builds a single feature flag hash from raw API data.
    # Extracts attributes, validates through the FeatureFlag model, and returns clean attributes.
    # @param item [Hash, Object] raw feature flag data from API
    # @return [Hash, nil] feature flag attributes hash or nil if item is invalid
    def build_feature_flag(item)
      return unless item

      # Extract attributes if the item has an attributes property
      # Handles both string and symbol keys, falling back to the item itself
      attributes = item.is_a?(Hash) ? (item["attributes"] || item[:attributes] || item) : item

      # Normalize incoming keys to snake_case so the model attributes populate correctly
      normalized_attributes =
        if attributes.is_a?(Hash)
          deep_transform_keys_format(attributes, format: :snake)
        else
          attributes
        end

      # Create FeatureFlag model for validation and type safety
      feature_flag = FeatureFlag.new(normalized_attributes)

      # Return the clean attributes hash instead of the model object
      # This gives us validation but clean serialization
      feature_flag.attributes
    end

    # Normalizes data into an array format.
    def normalize_items(data)
      case data
      when Array
        data
      when nil
        []
      else
        [data]
      end
    end

    # Extracts the 'data' field from the API response body.
    def extract_data(body)
      case body
      when Hash
        body["data"] || body[:data] || body
      when Array
        body
      else
        []
      end
    end

    # Recursively transforms hash keys into the requested format.
    def deep_transform_keys_format(value, format:)
      return value unless value.respond_to?(:deep_transform_keys)

      transformer =
        case format&.to_sym
        when :camel
          ->(key) { key.to_s.camelize(:lower) }
        when :snake
          ->(key) { key.to_s.underscore }
        end

      return value unless transformer

      transformed = value.deep_transform_keys(&transformer)
      transformed = transformed.with_indifferent_access if transformed.is_a?(Hash)
      transformed
    end

    # Normalizes feature flag attributes for API submission.
    def normalize_feature_flag_payload(attributes)
      attrs = attributes.respond_to?(:to_h) ? attributes.to_h : attributes
      return {} unless attrs.is_a?(Hash)

      normalized = attrs.deep_dup.with_indifferent_access

      {
        key: normalized[:key].to_s.strip.upcase.gsub(/\s+/, "_"),
        env: normalized[:env].to_s.strip.upcase,
        is_enabled: ApplicationController.helpers.normalize_boolean(normalized[:is_enabled])
      }.compact
    end

    # Handles the response from create/update mutation operations.
    def handle_mutation_response(response, action:)
      if response.success?
        feature_flag = build_feature_flag(extract_data(response.body))
        formatted = deep_transform_keys_format({feature_flag: feature_flag}, format: key_format)
        {success: true, feature_flag: formatted[:feature_flag]}
      else
        Rails.logger.error("[FeatureFlagsService] Failed to #{action} feature flag: #{response.status} - #{response.body}")
        errors = normalize_errors(response.body, fallback: "Failed to #{action} feature flag.")
        {success: false, errors: format_errors(errors)}
      end
    end

    # Normalizes error data from API response body.
    def normalize_errors(body, fallback:)
      return {full_messages: [fallback]} unless body.is_a?(Hash)

      errors = body["errors"] || body[:errors]
      return errors if errors.present?

      message = body["message"] || body[:message] || fallback
      {full_messages: Array(message)}
    end

    # Formats error hash with proper key casing for client response.
    def format_errors(errors)
      deep_transform_keys_format({errors: errors}, format: key_format)[:errors]
    end

    # Handles exceptions during mutation operations.
    def handle_mutation_exception(action, error)
      Rails.logger.error("[FeatureFlagsService] #{action.capitalize} feature flag error: #{error.message}")
      {success: false, errors: format_errors({full_messages: ["Unable to #{action} feature flag. Please try again."]})}
    end
  end
end
