module AdminPortal
  class VouchersService
    def initialize(client: FisiohomeApi::Client, key_format: :snake)
      @client = client
      @key_format = key_format
    end

    # Fetches a list of vouchers from the external API
    # Handles various error scenarios and returns a consistent response format
    # @return [Hash] hash containing vouchers array and metadata, or empty defaults on error
    def list
      response = client.get("/api/v1/vouchers")

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

    private

    attr_reader :client, :key_format

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
  end
end
