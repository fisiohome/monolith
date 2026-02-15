module AdminPortal
  class VouchersServiceExternalApi
    def initialize(client: FisiohomeApi::Client, key_format: :snake)
      @client = client
      @key_format = key_format
    end

    # Fetches a list of vouchers from the external API
    # Handles various error scenarios and returns a consistent response format
    # @return [Hash] hash containing vouchers array and metadata, or empty defaults on error
    def list(code: nil, is_active: nil, discount_type: nil, page: nil, limit: nil)
      normalized_page = normalize_integer(page) || 1
      normalized_limit = normalize_integer(limit) || 10

      query = {
        code: code.presence,
        is_active: normalize_boolean(is_active),
        discount_type: discount_type.presence,
        page: normalized_page,
        limit: normalized_limit
      }.compact

      response = client.get("/api/v1/vouchers", params: query)

      if response.success?
        build_response(response.body)
      else
        Rails.logger.error("[VouchersService] Failed to fetch vouchers: #{response.status} - #{response.body}")
        {vouchers: [], meta: {}}
      end
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      Rails.logger.error("[VouchersService] Network error when fetching vouchers: #{e.message}")
      {vouchers: [], meta: {}}
    rescue Faraday::Error => e
      Rails.logger.error("[VouchersService] Faraday error when fetching vouchers: #{e.message}")
      {vouchers: [], meta: {}}
    rescue => e
      Rails.logger.error("[VouchersService] Unexpected error when fetching vouchers: #{e.message}")
      {vouchers: [], meta: {}}
    end

    # Fetches a single voucher by ID from the external API
    # Handles various error scenarios and returns a consistent response format
    # @param id [String, Integer] the voucher ID to fetch
    # @return [Hash] hash containing the voucher or nil on error
    def find(id)
      response = client.get("/api/v1/vouchers/#{id}")

      if response.success?
        build_single_response(response.body)
      else
        Rails.logger.error("[VouchersService] Failed to fetch voucher #{id}: #{response.status} - #{response.body}")
        {voucher: nil}
      end
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      Rails.logger.error("[VouchersService] Network error when fetching voucher #{id}: #{e.message}")
      {voucher: nil}
    rescue Faraday::Error => e
      Rails.logger.error("[VouchersService] Faraday error when fetching voucher #{id}: #{e.message}")
      {voucher: nil}
    rescue => e
      Rails.logger.error("[VouchersService] Unexpected error when fetching voucher #{id}: #{e.message}")
      {voucher: nil}
    end

    # Creates a new voucher via the external API
    # Normalizes the payload, sends a POST request, and handles the response
    # @param attributes [Hash] voucher attributes to create
    # @return [Hash] hash with :success boolean and either :voucher or :errors
    def create(attributes)
      payload = normalize_voucher_payload(attributes)
      response = client.post("/api/v1/vouchers", body: payload)
      handle_mutation_response(response, action: "create")
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      handle_mutation_exception("create", e)
    rescue Faraday::Error => e
      handle_mutation_exception("create", e)
    rescue => e
      handle_mutation_exception("create", e)
    end

    # Updates an existing voucher via the external API
    # Normalizes the payload, sends a PUT request, and handles the response
    # @param id [String, Integer] the voucher ID to update
    # @param attributes [Hash] voucher attributes to update
    # @return [Hash] hash with :success boolean and either :voucher or :errors
    def update(id, attributes)
      payload = normalize_voucher_payload(attributes)
      response = client.put("/api/v1/vouchers/#{id}", body: payload)
      handle_mutation_response(response, action: "update")
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      handle_mutation_exception("update", e)
    rescue Faraday::Error => e
      handle_mutation_exception("update", e)
    rescue => e
      handle_mutation_exception("update", e)
    end

    # Deletes an existing voucher via the external API
    # Sends a DELETE request and handles the response
    # @param id [String, Integer] the voucher ID to delete
    # @return [Hash] hash with :success boolean and optional :errors
    def destroy(id)
      response = client.delete("/api/v1/vouchers/#{id}")

      if response.success?
        {success: true}
      else
        Rails.logger.error("[VouchersService] Failed to delete voucher #{id}: #{response.status} - #{response.body}")
        errors = normalize_errors(response.body, fallback: "Failed to delete voucher.")
        {success: false, errors: format_errors(errors)}
      end
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      handle_mutation_exception("delete", e)
    rescue Faraday::Error => e
      handle_mutation_exception("delete", e)
    rescue => e
      handle_mutation_exception("delete", e)
    end

    private

    attr_reader :client, :key_format

    # Normalizes a value to a boolean (true/false) or nil.
    # Handles various truthy/falsy string representations.
    # @param value [Object] the value to normalize
    # @return [Boolean, nil] true, false, or nil if value is blank or unrecognized
    def normalize_boolean(value)
      return nil if value.nil? || (value.respond_to?(:empty?) && value.empty?)
      return value if value == true || value == false

      case value.to_s.strip.downcase
      when "true", "1", "yes", "y" then true
      when "false", "0", "no", "n" then false
      end
    end

    # Normalizes a value to an integer or nil.
    # Returns nil if the value is blank or cannot be converted to an integer.
    # @param value [Object] the value to normalize
    # @return [Integer, nil] the integer value or nil if conversion fails
    def normalize_integer(value)
      return nil if value.nil? || (value.respond_to?(:empty?) && value.empty?)

      Integer(value)
    rescue ArgumentError, TypeError
      nil
    end

    # Combines the fetched vouchers data and metadata, then formats keys.
    # Ensures the caller receives the desired casing (camelCase / snake_case).
    def build_response(body)
      response = {
        vouchers: build_vouchers(body),
        meta: extract_meta(body)
      }

      deep_transform_keys_format(response, format: key_format)
    end

    # Builds a single voucher response from the API body.
    # Extracts the voucher data, builds a voucher hash, and transforms keys to the desired format.
    # @param body [Hash, Object] the API response body
    # @return [Hash] hash containing the voucher with properly formatted keys
    def build_single_response(body)
      response = {
        voucher: build_voucher(extract_data(body))
      }

      deep_transform_keys_format(response, format: key_format)
    end

    # Recursively transforms hash keys into the requested format.
    # Returns original value if it cannot be transformed (e.g. plain objects).
    def deep_transform_keys_format(value, format:)
      return value unless value.respond_to?(:deep_transform_keys)

      # Pick the correct key transformer (camelCase, snake_case, or nil if unsupported).
      transformer =
        case format&.to_sym
        when :camel
          ->(key) { key.to_s.camelize(:lower) }
        when :snake
          ->(key) { key.to_s.underscore }
        end

      return value unless transformer

      # Apply the transformer and ensure indifferent access so symbol/string lookups both work.
      transformed = value.deep_transform_keys(&transformer)
      transformed = transformed.with_indifferent_access if transformed.is_a?(Hash)
      transformed
    end

    # Builds an array of voucher hashes from the API response body.
    # Extracts data, normalizes it to an array, and transforms each item into a voucher hash.
    # @param body [Hash, Array, Object] the API response body
    # @return [Array<Hash>] array of voucher attribute hashes
    def build_vouchers(body)
      normalize_items(extract_data(body)).map { |item| build_voucher(item) }.compact
    end

    # Builds a single voucher hash from raw API data.
    # Extracts attributes, validates through the Voucher model, and returns clean attributes.
    # @param item [Hash, Object] raw voucher data from API
    # @return [Hash, nil] voucher attributes hash or nil if item is invalid
    def build_voucher(item)
      return unless item

      # Extract attributes if the item has an attributes property
      # Handles both string and symbol keys, falling back to the item itself
      attributes = item.is_a?(Hash) ? (item["attributes"] || item[:attributes] || item) : item

      # Create Voucher model for validation and type safety
      voucher = Voucher.new(attributes)

      # Return the clean attributes hash instead of the model object
      # This gives us validation but clean serialization
      voucher.attributes
    end

    # Normalizes data into an array format.
    # Handles cases where data might be a single item, array, or nil.
    # @param data [Object] the data to normalize
    # @return [Array] normalized array
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
    # Handles both string and symbol keys, and falls back to the body itself.
    # @param body [Hash, Array, Object] the response body
    # @return [Object] extracted data or empty array
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

    # Extracts pagination/metadata from the API response body.
    # Looks for 'meta' key with both string and symbol access.
    # @param body [Hash, Object] the response body
    # @return [Hash] metadata hash or empty hash if not found
    def extract_meta(body)
      case body
      when Hash
        body["meta"] || body[:meta] || {}
      else
        {}
      end
    end

    # Normalizes voucher attributes for API submission.
    # Converts package_ids to integers where applicable and ensures snake_case keys.
    # @param attributes [Hash, Object] raw voucher attributes
    # @return [Hash] normalized payload ready for API submission
    def normalize_voucher_payload(attributes)
      attrs = attributes.respond_to?(:to_h) ? attributes.to_h : attributes
      return {} unless attrs.is_a?(Hash)

      normalized = attrs.deep_dup.with_indifferent_access
      # Convert package_ids to integers if they are numeric strings
      normalized[:package_ids] = Array(normalized[:package_ids]).map do |package_id|
        if package_id.is_a?(String) && package_id.match?(/^\d+$/)
          package_id.to_i
        else
          package_id
        end
      end

      # Ensure snake_case keys for the external API
      deep_transform_keys_format(normalized, format: :snake)
    end

    # Handles the response from create/update mutation operations.
    # Builds a success response with voucher data or error response with formatted errors.
    # @param response [Faraday::Response] the API response object
    # @param action [String] the action being performed (create/update)
    # @return [Hash] hash with :success boolean and either :voucher or :errors
    def handle_mutation_response(response, action:)
      if response.success?
        # Extract and format voucher data on success
        voucher = build_voucher(extract_data(response.body))
        formatted = deep_transform_keys_format({voucher: voucher}, format: key_format)
        {success: true, voucher: formatted[:voucher]}
      else
        # Log error and format error response
        Rails.logger.error("[VouchersService] Failed to #{action} voucher: #{response.status} - #{response.body}")
        errors = normalize_errors(response.body, fallback: "Failed to #{action} voucher.")
        {success: false, errors: format_errors(errors)}
      end
    end

    # Normalizes error data from API response body.
    # Extracts errors or message fields, falling back to a default message.
    # @param body [Hash, Object] the API response body
    # @param fallback [String] default error message if none found
    # @return [Hash] normalized error hash with full_messages key
    def normalize_errors(body, fallback:)
      return {full_messages: [fallback]} unless body.is_a?(Hash)

      # Try to extract errors field
      errors = body["errors"] || body[:errors]
      return errors if errors.present?

      # Fall back to message field or default
      message = body["message"] || body[:message] || fallback
      {full_messages: Array(message)}
    end

    # Formats error hash with proper key casing for client response.
    # @param errors [Hash] raw error hash
    # @return [Hash] formatted error hash with proper key casing
    def format_errors(errors)
      deep_transform_keys_format({errors: errors}, format: key_format)[:errors]
    end

    # Handles exceptions during mutation operations (create/update).
    # Logs the error and returns a formatted error response.
    # @param action [String] the action being performed (create/update)
    # @param error [Exception] the exception that occurred
    # @return [Hash] hash with :success false and :errors
    def handle_mutation_exception(action, error)
      Rails.logger.error("[VouchersService] #{action.capitalize} voucher error: #{error.message}")
      {success: false, errors: format_errors({full_messages: ["Unable to #{action} voucher. Please try again."]})}
    end
  end
end
