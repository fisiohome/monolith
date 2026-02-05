module AdminPortal
  class CancelAppointmentServiceExternalApi
    CANCEL_ENDPOINT = "/api/v1/bookings/%s/cancel".freeze

    LOG_TAG = "[CancelAPI]".freeze

    def initialize(appointment, current_user, cancellation_reason)
      @appointment = appointment
      @current_user = current_user
      @cancellation_reason = cancellation_reason
    end

    def call
      order_id = @appointment.order&.id
      log_info("start", appointment_id: @appointment.id, registration_number: @appointment.registration_number, order_id: order_id)

      validate_cancellation_reason
      response = call_cancel_api
      result = handle_api_response(response)

      if result[:success]
        log_info("success", appointment_id: @appointment.id, registration_number: @appointment.registration_number, order_id: order_id)
      else
        log_error("failed", appointment_id: @appointment.id, error: result[:error])
      end

      result
    rescue ActionController::ParameterMissing => e
      log_error("param_missing", message: e.message)
      {success: false, error: "Invalid parameters: #{e.message}", type: "ParameterMissing"}
    rescue FisiohomeApi::Client::AuthenticationError => e
      log_error("auth_failed", message: e.message)
      {success: false, error: "Authentication failed: #{e.message}", type: "AuthenticationError"}
    rescue Faraday::Error => e
      log_error("api_error", type: e.class.name, message: e.message)
      {success: false, error: "API request failed: #{e.message}", type: "ApiError"}
    rescue => e
      log_error("unexpected", type: e.class.name, message: e.message, backtrace: e.backtrace.first(5))
      {success: false, error: e.message, type: "GeneralError"}
    end

    private

    def validate_cancellation_reason
      if @cancellation_reason.blank?
        raise ActionController::ParameterMissing, "cancellation_reason"
      end

      if @cancellation_reason.length < 10
        raise ActionController::ParameterMissing, "cancellation_reason must be at least 10 characters"
      end
    end

    def call_cancel_api
      # Ensure we have an order
      unless @appointment.order&.id
        raise StandardError, "Appointment has no associated order"
      end

      endpoint = CANCEL_ENDPOINT % @appointment.order.id
      payload = {
        reason: @cancellation_reason
      }

      log_debug("api_request", endpoint: endpoint, order_id: @appointment.order.id)
      FisiohomeApi::Client.post(endpoint, body: payload)
    end

    def handle_api_response(response)
      if response.success?
        response_body = response.body
        cancel_data = response_body["data"] || response_body[:data] || response_body

        # Track status change in local database
        track_status_change(cancel_data)

        {
          success: true,
          data: cancel_data,
          message: cancel_data["message"] || "Appointment cancelled successfully"
        }
      else
        error_message = parse_api_error(response)
        log_error("api_failed", status: response.status, error: error_message)
        {success: false, error: error_message, type: "ApiError"}
      end
    end

    def track_status_change(cancel_data)
      # Track status change in local database (status is already updated by external API)
      new_status = cancel_data["status"] || cancel_data[:status]
      if new_status
        @appointment.transaction do
          # Set the updater for tracking
          @appointment.updater = @current_user

          # Get the enum map to convert status to proper format
          enum_map = Appointment.statuses
          # Ensure we have the proper uppercase status format
          formatted_new_status = enum_map[new_status.downcase.to_sym] || new_status.upcase

          # Get the old status in proper format
          old_status_raw = @appointment.status_before_last_save || @appointment.status
          formatted_old_status = enum_map[old_status_raw&.downcase&.to_sym] || old_status_raw&.upcase

          # Create status history record
          @appointment.status_histories.create!(
            old_status: formatted_old_status,
            new_status: formatted_new_status,
            reason: @cancellation_reason,
            changed_by: @current_user.id
          )

          log_info("status_tracked", appointment_id: @appointment.id, new_status: formatted_new_status, changed_by: @current_user.id)
        end
      end
    end

    def parse_api_error(response)
      body = response.body
      return body["error"] || body["message"] || body.to_s if body.is_a?(Hash)

      body.to_s
    end

    # Logging helpers for consistent structured logs
    def log_info(event, **data) = Rails.logger.info("#{LOG_TAG} #{event} #{data.to_json}")

    def log_warn(event, **data) = Rails.logger.warn("#{LOG_TAG} #{event} #{data.to_json}")

    def log_error(event, **data) = Rails.logger.error("#{LOG_TAG} #{event} #{data.to_json}")

    def log_debug(event, **data) = Rails.logger.debug { "#{LOG_TAG} #{event} #{data.to_json}" }
  end
end
