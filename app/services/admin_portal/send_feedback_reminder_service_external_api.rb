module AdminPortal
  class SendFeedbackReminderServiceExternalApi
    include ActiveModel::Model
    include ActiveModel::Attributes

    attr_reader :order, :current_user

    def initialize(order, current_user)
      @order = order
      @current_user = current_user
    end

    def call
      Rails.logger.info "Starting external API feedback reminder for order ID: #{order.id}"

      # Validate that all appointments are completed
      unless all_appointments_completed?
        return {
          success: false,
          error: "Cannot send feedback reminder. Not all appointments are completed."
        }
      end

      # Make external API call
      response = make_external_api_call

      if response.success?
        Rails.logger.info "Successfully sent feedback reminder for order ID: #{order.id}"

        {
          success: true,
          message: "Feedback reminder sent successfully.",
          data: response.body
        }
      else
        error_message = extract_error_message(response)
        Rails.logger.error "Failed to send feedback reminder for order ID: #{order.id}: #{error_message}"

        {
          success: false,
          error: error_message,
          status_code: response.status
        }
      end
    rescue => e
      Rails.logger.error "Exception in SendFeedbackReminderServiceExternalApi: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.join("\n")

      {
        success: false,
        error: "An unexpected error occurred: #{e.message}"
      }
    end

    private

    def all_appointments_completed?
      return false if order.appointments.empty?

      order.appointments.all? { |appointment| appointment.status == "completed" }
    end

    def make_external_api_call
      endpoint_path = "api/v1/feedbacks/send-email"
      payload = {
        registration_number: order.registration_number,
        order_id: order.id
      }

      Rails.logger.info "Making POST request to #{endpoint_path} with payload: #{payload.inspect}"

      response = FisiohomeApi::Client.post(endpoint_path, body: payload)

      Rails.logger.info "External API response status: #{response.status}"
      Rails.logger.debug { "External API response body: #{response.body.inspect}" }

      response
    end

    def extract_error_message(response)
      case response.status
      when 400
        "Bad request: Invalid parameters"
      when 401
        "Authentication failed: Invalid API credentials"
      when 403
        "Access forbidden: Insufficient permissions"
      when 404
        "Order not found"
      when 422
        # Try to extract validation errors from response body
        if response.body.is_a?(Hash) && response.body["errors"]
          response.body["errors"].map { |error| error["message"] || error }.join(", ")
        else
          "Validation failed: Invalid data"
        end
      when 500..599
        "Server error: Please try again later"
      else
        "Unexpected error (#{response.status}): #{response.body}"
      end
    end
  end
end
