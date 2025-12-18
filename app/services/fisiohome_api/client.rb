module FisiohomeApi
  class Client
    class << self
      # API endpoint configuration
      API_ENDPOINT_VERSION = "/api/v1"
      LOGIN_ENDPOINT = "#{API_ENDPOINT_VERSION}/auth/login"
      REFRESH_TOKEN_ENDPOINT = "#{API_ENDPOINT_VERSION}/auth/refresh"

      # Creates and returns a memoized Faraday connection instance
      # Configured with JSON request/response handling
      def connection
        @connection ||= Faraday.new(url: base_url) do |faraday|
          faraday.request :json
          faraday.response :json, content_type: /\bjson$/
          faraday.adapter Faraday.default_adapter
        end
      end

      # Performs a GET request to the external API
      # @param path [String] the API endpoint path
      # @param params [Hash] query parameters
      # @param headers [Hash] additional headers
      # @return [Faraday::Response] the HTTP response
      def get(path, params: {}, headers: {})
        connection.get(path, params, auth_headers.merge(headers))
      end

      # Performs a POST request to the external API
      # @param path [String] the API endpoint path
      # @param body [Hash] request body
      # @param headers [Hash] additional headers
      # @return [Faraday::Response] the HTTP response
      def post(path, body: {}, headers: {})
        connection.post(path, body, auth_headers.merge(headers))
      end

      # Authenticates a user with email and password
      # @param email [String] user's email
      # @param password [String] user's password
      # @return [Hash] authentication result with tokens or error
      def authenticate(email:, password:)
        response = connection.post(LOGIN_ENDPOINT, {
          email: email,
          password: password
        })

        if response.success? && response.body.dig("data", "access_token")
          # Default token expiration: 3 hours (10800 seconds)
          expires_in = response.body.dig("data", "expires_in") || 10800
          {
            success: true,
            access_token: response.body.dig("data", "access_token"),
            refresh_token: response.body.dig("data", "refresh_token"),
            expires_at: Time.current + expires_in.seconds
          }
        else
          Rails.logger.warn("[FisiohomeApi::Client] Authentication failed for #{email}: #{response.status}")
          {success: false, error: response.body.dig("message") || "Authentication failed"}
        end
      rescue Faraday::Error => e
        Rails.logger.error("[FisiohomeApi::Client] Network error during authentication: #{e.message}")
        {success: false, error: e.message}
      end

      # Refreshes an expired access token using a refresh token
      # @param refresh_token [String] the refresh token
      # @return [Hash] new authentication tokens or error
      def refresh_access_token(refresh_token:)
        response = connection.post(REFRESH_TOKEN_ENDPOINT, {
          refresh_token: refresh_token
        })

        if response.success? && response.body.dig("data", "access_token")
          # Default token expiration: 3 hours (10800 seconds)
          expires_in = response.body.dig("data", "expires_in") || 10800
          {
            success: true,
            access_token: response.body.dig("data", "access_token"),
            refresh_token: response.body.dig("data", "refresh_token"),
            expires_at: Time.current + expires_in.seconds
          }
        else
          Rails.logger.warn("[FisiohomeApi::Client] Token refresh failed: #{response.status}")
          {success: false, error: response.body.dig("message") || "Token refresh failed"}
        end
      rescue Faraday::Error => e
        Rails.logger.error("[FisiohomeApi::Client] Network error during token refresh: #{e.message}")
        {success: false, error: e.message}
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
        ENV.fetch("FISIOHOME_EXTERNAL_API_SERVICE_NAME")
      rescue KeyError => e
        Rails.logger.error("[FisiohomeApi::Client] Missing FISIOHOME_EXTERNAL_API_SERVICE_NAME: #{e.message}")
        raise
      end

      def service_token
        ENV.fetch("FISIOHOME_EXTERNAL_API_SERVICE_TOKEN")
      rescue KeyError => e
        Rails.logger.error("[FisiohomeApi::Client] Missing FISIOHOME_EXTERNAL_API_SERVICE_TOKEN: #{e.message}")
        raise
      end

      # Retrieves the base URL from environment variables
      # @return [String] the API base URL
      # @raise [KeyError] if FISIOHOME_EXTERNAL_API_URL is not set
      def base_url
        ENV.fetch("FISIOHOME_EXTERNAL_API_URL")
      rescue KeyError => e
        Rails.logger.error("[FisiohomeApi::Client] Missing FISIOHOME_EXTERNAL_API_URL: #{e.message}")
        raise
      end
    end

    # Custom error class for authentication failures
    class AuthenticationError < StandardError; end
  end
end
