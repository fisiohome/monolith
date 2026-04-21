module AdminPortal
  module Orders
    class RegenerateInvoiceServiceExternalApi
      def initialize(order, expiry_minutes)
        @order = order
        @expiry_minutes = expiry_minutes&.to_i
      end

      def call
        Rails.logger.info "[RegenerateInvoiceServiceExternalApi] Attempting to regenerate invoice for order #{@order.id}"

        unless @order
          Rails.logger.error "[RegenerateInvoiceServiceExternalApi] Order is missing"
          return {success: false, error: "Order not found"}
        end

        payload = {}
        payload[:expiry_minutes] = @expiry_minutes if @expiry_minutes.present? && @expiry_minutes > 0

        begin
          # External API expects POST to /api/v1/bookings/:id/regenerate-invoice
          response = FisiohomeApi::Client.post(
            "/api/v1/bookings/#{@order.id}/regenerate-invoice",
            body: payload
          )

          if response.success?
            response_body = response.body
            Rails.logger.info "[RegenerateInvoiceServiceExternalApi] Successfully regenerated invoice for order #{@order.id}"
            {
              success: true,
              data: response_body
            }
          else
            error_message = format_error_response(response)
            Rails.logger.error "[RegenerateInvoiceServiceExternalApi] Failed to regenerate invoice: #{error_message}"
            {
              success: false,
              error: error_message
            }
          end
        rescue ::FisiohomeApi::Client::AuthenticationError => e
          Rails.logger.error "[RegenerateInvoiceServiceExternalApi] Auth error: #{e.message}"
          {success: false, error: "Authentication failed while requesting invoice regeneration."}
        rescue Faraday::ClientError => e
          Rails.logger.error "[RegenerateInvoiceServiceExternalApi] Client error: #{e.message}"
          {success: false, error: "Failed to connect to the external service: #{e.message}"}
        rescue => e
          Rails.logger.error "[RegenerateInvoiceServiceExternalApi] Unexpected error: #{e.message}\n#{e.backtrace.join("\n")}"
          {success: false, error: "An unexpected error occurred while regenerating the invoice."}
        end
      end

      private

      def format_error_response(response)
        if response.body.is_a?(Hash)
          # Extract error message from API response format
          response.body["error"] || response.body["message"] || "API returned status #{response.status}"
        else
          "API returned status #{response.status}"
        end
      end
    end
  end
end
