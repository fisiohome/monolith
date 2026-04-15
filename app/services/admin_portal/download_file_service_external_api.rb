module AdminPortal
  class DownloadFileServiceExternalApi
    LOG_TAG = "[DownloadAPI]".freeze

    # Download types
    SOAP_PER_VISIT = "report"
    SOAP_FINAL = "report-final"
    INVOICE = "invoice"

    def initialize(id, id_type, download_type: SOAP_PER_VISIT, use_external_filename: false)
      @id = id
      @id_type = id_type
      @download_type = download_type
      @use_external_filename = use_external_filename

      @endpoint_path = case download_type
      when "invoice"
        "/api/v1/bookings/#{id}/invoice"
      else
        "/api/v1/appointments/#{id}/#{download_type}"
      end
    end

    def call
      log_info("start", id: @id, id_type: @id_type, endpoint: @endpoint_path)

      response = call_download_api
      result = handle_api_response(response)

      if result[:success]
        log_info("success", id: @id, id_type: @id_type, filename: result[:filename])
      else
        log_error("failed", id: @id, id_type: @id_type, error: result[:error])
      end

      result
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

    def call_download_api
      log_debug("api_request", endpoint: @endpoint_path, id: @id, id_type: @id_type)
      FisiohomeApi::Client.get_binary(@endpoint_path)
    end

    def handle_api_response(response)
      if response.success?
        # Check if response is a PDF
        content_type = response.headers["content-type"]

        log_debug("response_headers", content_type: content_type, size: response.body&.bytesize)

        if content_type&.include?("application/pdf")
          # Generate descriptive filename based on download type with timestamp
          timestamp = Time.current.strftime("%Y%m%d_%H%M%S")
          filename = case @download_type
          when SOAP_PER_VISIT
            "soap_visit_report_#{timestamp}.pdf"
          when SOAP_FINAL
            "soap_final_report_#{timestamp}.pdf"
          when INVOICE
            "invoice_#{timestamp}.pdf"
          else
            "#{@download_type}_document_#{timestamp}.pdf"
          end

          # Use external API filename if option is enabled and available
          if @use_external_filename
            content_disposition = response.headers["content-disposition"]
            if content_disposition&.match?(/filename=(?:"([^"]+)"|([^;]+))/)
              filename = $1 || $2
            end
          end

          {
            success: true,
            data: response.body,
            filename: filename,
            content_type: "application/pdf",
            message: "File downloaded successfully"
          }
        else
          error_message = "Invalid file format received from external API"
          log_error("invalid_format", content_type: content_type, body_preview: response.body&.first(200))
          {success: false, error: error_message, type: "InvalidFormat"}
        end
      else
        error_message = parse_api_error(response)
        log_error("api_failed", status: response.status, error: error_message)
        {success: false, error: error_message, type: "ApiError"}
      end
    end

    def parse_api_error(response)
      body = response.body

      # If body is a string that looks like JSON, try to parse it
      if body.is_a?(String) && body.start_with?("{")
        begin
          parsed = JSON.parse(body)
          return parsed["error"] || parsed["message"] || "HTTP #{response.status}"
        rescue JSON::ParserError
          # If parsing fails, return the raw body
        end
      end

      # If body is already a hash
      return body["error"] || body["message"] || "HTTP #{response.status}" if body.is_a?(Hash)

      # Default to status and body
      "HTTP #{response.status}: #{body}"
    end

    # Logging helpers for consistent structured logs
    def log_info(event, **data) = Rails.logger.info("#{LOG_TAG} #{event} #{data.to_json}")

    def log_warn(event, **data) = Rails.logger.warn("#{LOG_TAG} #{event} #{data.to_json}")

    def log_error(event, **data) = Rails.logger.error("#{LOG_TAG} #{event} #{data.to_json}")

    def log_debug(event, **data) = Rails.logger.debug { "#{LOG_TAG} #{event} #{data.to_json}" }
  end
end
