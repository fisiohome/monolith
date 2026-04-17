# frozen_string_literal: true

module AdminPortal
  module Orders
    class QueueCodeRequestServiceExternalApi
      include ApplicationHelper

      QUEUE_SEQUENCE_ENDPOINT = "/api/v1/bookings/queue-sequence/next"

      def initialize(client: FisiohomeApi::Client)
        @client = client
      end

      def call
        response = client.post(QUEUE_SEQUENCE_ENDPOINT)
        payload = response.body || {}

        if response.success?
          data = payload.with_indifferent_access[:data] || {}

          {
            success: payload.fetch("success", true),
            message: payload["message"] || "Queue code reserved successfully",
            data: deep_transform_keys_to_camel_case(data)
          }
        else
          {
            success: false,
            error: extract_error_message(payload),
            status: response.status
          }
        end
      rescue FisiohomeApi::Client::AuthenticationError => e
        Rails.logger.error("[Orders::QueueCodeRequestServiceExternalApi] Auth error: #{e.message}")
        {success: false, error: "Authentication failed while requesting queue code."}
      rescue Faraday::Error => e
        Rails.logger.error("[Orders::QueueCodeRequestServiceExternalApi] API error: #{e.class} - #{e.message}")
        {success: false, error: "External API request for queue code failed."}
      rescue => e
        Rails.logger.error("[Orders::QueueCodeRequestServiceExternalApi] Unexpected error: #{e.class} - #{e.message}")
        {success: false, error: "Unexpected error while requesting queue code."}
      end

      private

      attr_reader :client

      def extract_error_message(payload)
        return payload["message"] if payload.respond_to?(:[]) && payload["message"].present?
        return payload["error"] if payload.respond_to?(:[]) && payload["error"].present?

        "Failed to reserve queue code."
      end
    end
  end
end
