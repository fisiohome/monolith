module AdminPortal
  class UpdatePaymentStatusServiceExternalApi
    include ActiveModel::Model
    include ActiveModel::Attributes

    attr_reader :order, :current_user, :payment_status

    def initialize(order, current_user, payment_status)
      @order = order
      @current_user = current_user
      @payment_status = payment_status
    end

    def call
      Rails.logger.info "Starting external API payment status update for order ID: #{order.id}"

      # Validate payment status
      unless valid_payment_status?
        return {
          success: false,
          error: "Invalid payment status. Must be one of: #{Order::PAYMENT_STATUS.join(", ")}"
        }
      end

      # Make external API call
      response = make_external_api_call

      if response.success?
        # Update local appointment status if needed
        update_local_status if should_update_local_status?

        Rails.logger.info "Successfully updated payment status for order ID: #{order.id} to #{payment_status}"

        {
          success: true,
          message: "Payment status updated to #{payment_status} successfully.",
          data: response.body
        }
      else
        error_message = extract_error_message(response)
        Rails.logger.error "Failed to update payment status for order ID: #{order.id}: #{error_message}"

        {
          success: false,
          error: error_message,
          status_code: response.status
        }
      end
    rescue => e
      Rails.logger.error "Exception in UpdatePaymentStatusServiceExternalApi: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.join("\n")

      {
        success: false,
        error: "An unexpected error occurred: #{e.message}"
      }
    end

    private

    def valid_payment_status?
      Order::PAYMENT_STATUS.include?(payment_status)
    end

    def make_external_api_call
      endpoint_path = "api/v1/bookings/#{order.id}/payment-status"
      payload = {
        payment_status: payment_status
      }

      Rails.logger.info "Making PUT request to #{endpoint_path} with payload: #{payload.inspect}"

      response = FisiohomeApi::Client.put(endpoint_path, body: payload)

      Rails.logger.info "External API response status: #{response.status}"
      Rails.logger.debug { "External API response body: #{response.body.inspect}" }

      response
    end

    def should_update_local_status?
      # Update local appointment status based on payment status
      case payment_status
      when "PAID", "OVERPAID"
        get_appointment_status != "paid"
      when "UNPAID", "PARTIALLY_PAID", "REFUNDED"
        get_appointment_status == "paid"
      else
        false
      end
    end

    def update_local_status
      ActiveRecord::Base.transaction do
        appointments = order.appointments

        if %w[PAID OVERPAID].include?(payment_status)
          appointments.where.not(status: "paid").update_all(status: "paid")
          Rails.logger.info "Updated local appointment status to 'paid' for registration number: #{order.registration_number}"
        elsif %w[UNPAID PARTIALLY_PAID REFUNDED].include?(payment_status)
          appointments.where(status: "paid").update_all(status: "pending_payment")
          Rails.logger.info "Updated local appointment status to 'pending_payment' for registration number: #{order.registration_number}"
        end
      end
    rescue => e
      Rails.logger.error "Failed to update local appointment status: #{e.message}"
      # Don't fail the entire operation if local update fails
    end

    def get_appointment_status
      # Get the status of the first appointment (or return nil if no appointments)
      order.appointments.first&.status
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
