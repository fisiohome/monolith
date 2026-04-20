module AdminPortal
  class ChangeOrderPackageServiceExternalApi
    attr_reader :order, :current_user, :new_package_id, :force, :bypass_payment

    def initialize(order, current_user, new_package_id, force: false, bypass_payment: true)
      @order = order
      @current_user = current_user
      @new_package_id = new_package_id
      @force = force
      @bypass_payment = bypass_payment
    end

    def call
      Rails.logger.info "Starting external API package change for order ID: #{order.id}, new package ID: #{new_package_id}"

      # Validate new package ID
      if new_package_id.blank?
        return {
          success: false,
          error: "New package ID is required"
        }
      end

      # Make external API call
      response = make_external_api_call

      if response.success?
        Rails.logger.info "Successfully changed package for order ID: #{order.id} to package ID: #{new_package_id}"

        {
          success: true,
          message: "Package changed successfully.",
          data: response.body
        }
      else
        error_message = extract_error_message(response)
        Rails.logger.error "Failed to change package for order ID: #{order.id}: #{error_message}"

        {
          success: false,
          error: error_message,
          status_code: response.status
        }
      end
    rescue => e
      Rails.logger.error "Exception in ChangeOrderPackageServiceExternalApi: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.join("\n")

      {
        success: false,
        error: "An unexpected error occurred: #{e.message}"
      }
    end

    private

    def make_external_api_call
      endpoint_path = "api/v1/bookings/#{order.id}/package"
      payload = {
        new_package_id: new_package_id.to_i,
        force: force,
        bypass_payment: bypass_payment
      }

      Rails.logger.info "Making PUT request to #{endpoint_path} with payload: #{payload.inspect}"

      response = FisiohomeApi::Client.put(endpoint_path, body: payload)

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
