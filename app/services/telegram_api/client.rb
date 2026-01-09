module TelegramApi
  class Client
    class << self
      # Creates and returns a memoized Faraday connection instance
      # Configured with JSON request/response handling
      def connection
        @connection ||= Faraday.new(url: base_url) do |faraday|
          # Automatically JSON-encode request bodies and add the proper
          # "Content-Type: application/json" header so callers don't need to.
          faraday.request :json

          # Parse JSON responses (when the server responds with application/json)
          # and return Hashes with indifferent access.
          faraday.response :json, content_type: /\bjson$/

          # Use the default Net::HTTP adapter, which is adequate for our current needs.
          faraday.adapter Faraday.default_adapter
        end
      end

      # Performs a GET request to the Telegram API
      # @param path [String] the API endpoint path
      # @param params [Hash] query parameters
      # @param headers [Hash] additional headers
      # @return [Faraday::Response] the HTTP response
      def get(path, params: {}, headers: {})
        connection.get(path, params, auth_headers.merge(headers))
      end

      # Performs a POST request to the Telegram API
      # @param path [String] the API endpoint path
      # @param body [Hash] request body
      # @param headers [Hash] additional headers
      # @return [Faraday::Response] the HTTP response
      def post(path, body: {}, headers: {})
        # Faraday will JSON-encode +body+ thanks to the :json middleware.
        connection.post(path, body, auth_headers.merge(headers))
      end

      # Performs a PUT request to the Telegram API
      # @param path [String] the API endpoint path
      # @param body [Hash] request body
      # @param headers [Hash] additional headers
      # @return [Faraday::Response] the HTTP response
      def put(path, body: {}, headers: {})
        # Same behavior as #post: body is encoded and the Content-Type is set automatically.
        connection.put(path, body, auth_headers.merge(headers))
      end

      # Performs a DELETE request to the Telegram API
      # @param path [String] the API endpoint path
      # @param params [Hash] query parameters
      # @param headers [Hash] additional headers
      # @return [Faraday::Response] the HTTP response
      def delete(path, params: {}, headers: {})
        connection.delete(path, params, auth_headers.merge(headers))
      end

      private

      # Generates authorization headers with Bearer token
      # @param token [String] the access token
      # @return [Hash] headers with Authorization key
      def auth_headers
        {
          "X-Service-Name" => service_name,
          "X-Service-Token" => service_token
        }
      end

      def service_name
        ENV.fetch("FISIOHOME_TELEGRAM_API_SERVICE_NAME")
      rescue KeyError => e
        Rails.logger.error("[TelegramApi::Client] Missing FISIOHOME_TELEGRAM_API_SERVICE_NAME: #{e.message}")
        raise
      end

      def service_token
        ENV.fetch("FISIOHOME_TELEGRAM_API_SERVICE_TOKEN")
      rescue KeyError => e
        Rails.logger.error("[TelegramApi::Client] Missing FISIOHOME_TELEGRAM_API_SERVICE_TOKEN: #{e.message}")
        raise
      end

      # Retrieves the base URL from environment variables
      # @return [String] the API base URL
      # @raise [KeyError] if FISIOHOME_TELEGRAM_API_URL is not set
      def base_url
        ENV.fetch("FISIOHOME_TELEGRAM_API_URL")
      rescue KeyError => e
        Rails.logger.error("[TelegramApi::Client] Missing FISIOHOME_TELEGRAM_API_URL: #{e.message}")
        raise
      end
    end

    # Custom error class for authentication failures
    class AuthenticationError < StandardError; end
  end
end
