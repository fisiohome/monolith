module AdminPortal
  class TelegramService
    def initialize(client: nil)
      @client = client || TelegramApi::Client
    end

    def fetch_groups
      # Return hardcoded groups for now
      [
        {
          id: "-5251148500",
          name: "Testing Group Mitra"
        }
      ]
    end

    def broadcast_message(group_id:, message:, mentions: [])
      # Convert ActionController::Parameters to regular hash if needed
      message_data = message.respond_to?(:to_unsafe_h) ? message.to_unsafe_h : message

      body = message_data.is_a?(Hash) ? message_data : {message: message_data}
      body[:chat_id] = group_id
      body[:mentions] = mentions if mentions.any?

      response = @client.post("/api/v1/telegram/send-telegram", body: body)

      if response.success?
        {
          success: true,
          message_id: response.body.dig("message_id")
        }
      else
        error_message = response.body&.dig("message") || "Failed to send message"
        Rails.logger.error "[TelegramService] Failed to send message: #{response.body}"
        {
          success: false,
          errors: [error_message]
        }
      end
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
      handle_network_error("broadcast_message", e)
    rescue Faraday::Error => e
      handle_faraday_error("broadcast_message", e)
    rescue => e
      handle_unexpected_error("broadcast_message", e)
    end

    private

    # Handle network-related errors (connection failed, timeout)
    def handle_network_error(action, error)
      Rails.logger.error "[TelegramService] Network error in #{action}: #{error.message}"
      {
        success: false,
        errors: ["Network error: Unable to connect to Telegram. Please try again."]
      }
    end

    # Handle Faraday-specific errors
    def handle_faraday_error(action, error)
      Rails.logger.error "[TelegramService] Faraday error in #{action}: #{error.message}"
      {
        success: false,
        errors: ["API error: #{error.message}"]
      }
    end

    # Handle unexpected errors
    def handle_unexpected_error(action, error)
      Rails.logger.error "[TelegramService] Unexpected error in #{action}: #{error.message}"
      {
        success: false,
        errors: ["An unexpected error occurred. Please try again."]
      }
    end
  end
end
