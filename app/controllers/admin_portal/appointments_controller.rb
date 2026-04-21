module AdminPortal
  class AppointmentsController < ApplicationController
    include AppointmentsHelper

    before_action :authenticate_user!
    before_action :set_appointment, only: [:cancel, :update_pic, :update_status, :reschedule_page, :reschedule, :download_soap_pdf, :download_soap_final_pdf, :download_invoice]
    before_action :set_order, only: [:update_payment_status, :send_feedback_reminder, :change_package]

    def index
      preparation = PreparationIndexAppointmentService.new(params, current_user)

      render inertia: "AdminPortal/Appointment/Index", props: deep_transform_keys_to_camel_case({
        appointments: InertiaRails.defer {
          service_appt = preparation.fetch_appointments

          deep_transform_keys_to_camel_case(
            {
              data: service_appt[:data],
              metadata: pagy_metadata(service_appt[:metadata])
            }
          )
        },
        selected_appointment: InertiaRails.defer { preparation.fetch_selected_appointment },
        options_data: InertiaRails.defer { preparation.fetch_options_data },
        filter_options_data: InertiaRails.defer { preparation.fetch_filter_options_data }
      })
    end

    def orders
      preparation = AdminPortal::PreparationOrdersAppointmentService.new(params)

      render inertia: "AdminPortal/Appointment/Orders", props: deep_transform_keys_to_camel_case({
        orders: InertiaRails.defer {
          service_orders = preparation.fetch_orders

          deep_transform_keys_to_camel_case(
            {
              data: service_orders[:data],
              metadata: pagy_metadata(service_orders[:metadata])
            }
          )
        },
        selected_order: InertiaRails.defer { preparation.fetch_selected_order },
        selected_appointment: InertiaRails.defer { preparation.fetch_selected_appointment },
        options_data: InertiaRails.defer { preparation.fetch_options_data }
      })
    end

    def new
      @appointment = if params[:created]
        find_created_appointment(params[:created])
      else
        Appointment.new
      end

      @appointment.reference_appointment = Appointment.find(params[:reference]) if params[:reference]

      preparation = PreparationNewAppointmentService.new(params)

      render inertia: "AdminPortal/Appointment/New", props: deep_transform_keys_to_camel_case({
        appointment: @appointment.as_json,
        locations: InertiaRails.defer { preparation.fetch_locations },
        services: InertiaRails.defer { preparation.fetch_services },
        therapists: InertiaRails.optional { preparation.fetch_therapists },
        patient_list: InertiaRails.optional { preparation.fetch_patient_list },
        patient_contact_list: InertiaRails.optional { preparation.fetch_patient_contact_list },
        appointment_reference: preparation.fetch_appointment_reference,
        options_data: InertiaRails.defer { preparation.fetch_options_data },
        admins: InertiaRails.defer { preparation.fetch_admins }
      })
    end

    def create
      result = CreateAppointmentServiceExternalApi.new(params, current_user).call

      if result[:success]
        appointment_id = extract_appointment_id(result[:data])
        if appointment_id
          redirect_to new_admin_portal_appointment_path(created: appointment_id), notice: "Appointment was successfully booked."
        else
          redirect_to new_admin_portal_appointment_path, alert: "Appointment was created but could not retrieve details."
        end
      else
        error_message, error_messages = extract_error_messages(result[:error])
        flash[:alert] = error_message
        redirect_to new_admin_portal_appointment_path, inertia: {
          errors: deep_transform_keys_to_camel_case(
            result[:error].respond_to?(:messages) ?
              result[:error].messages&.transform_values(&:uniq)&.merge({
                full_messages: error_messages
              }) :
              {base: [error_message], full_messages: error_messages}
          )
        }
      end
    end

    def reschedule_page
      appointment_list = serialize_appointment(@appointment, {
        include_therapist: true,
        include_patient: true,
        include_service: true,
        include_location: true,
        include_visit_address: true,
        include_package: true,
        include_admins: false,
        include_patient_medical_record: false,
        include_all_visits: true,
        all_visits_only: [:id, :visit_progress, :visit_number, :appointment_date_time, :status, :registration_number],
        all_visits_methods: [:visit_progress]
      })
      preparation = PreparationRescheduleAppointmentService.new(@appointment, params)

      render inertia: "AdminPortal/Appointment/Reschedule", props: deep_transform_keys_to_camel_case({
        appointment: appointment_list,
        therapists: InertiaRails.optional { preparation.fetch_therapists },
        options_data: InertiaRails.defer { preparation.fetch_options_data }
      })
    end

    def reschedule
      logger.info("Rescheduling appointment #{@appointment&.registration_number} by user #{current_user&.email}")

      begin
        result = UpdateAppointmentService.new(@appointment, params, current_user).call
      rescue => e
        logger.error("Exception in UpdateAppointmentService: #{e.class} - #{e.message}")
        flash[:alert] = "An error occurred: #{e.message}"
        redirect_to reschedule_admin_portal_appointments_path(@appointment)
        return
      end

      # Handle case where service returns nil
      if result.nil?
        logger.error("UpdateAppointmentService returned nil result")
        flash[:alert] = "An unexpected error occurred while rescheduling"
        redirect_to reschedule_admin_portal_appointments_path(@appointment)
        return
      end

      if result&.dig(:success)
        notice_msg =
          if result[:changed]
            "Appointment was successfully rescheduled."
          else
            "No changes detected."
          end

        redirect_params = {rescheduled: @appointment.id}
        redirect_params[:registration_number] = @appointment.registration_number if @appointment.registration_number.present?

        redirect_to determine_redirect_path(custom_params: redirect_params), notice: notice_msg
      else
        error_obj = result&.dig(:error)
        logger.error("Failed to reschedule: #{error_obj.inspect}")

        # Handle different error types
        if error_obj&.respond_to?(:full_messages)
          error_messages = error_obj.full_messages
          first_error = error_messages&.first || "Validation error occurred"
          error_message = error_messages || ["Validation error occurred"]
        else
          first_error = error_obj.to_s
          error_message = [error_obj.to_s]
        end

        logger.error("Failed to reschedule the appointment: #{error_message}.")
        flash[:alert] = first_error
        redirect_to reschedule_admin_portal_appointments_path(@appointment),
          inertia: {
            errors: deep_transform_keys_to_camel_case(
              (error_obj&.respond_to?(:messages) && error_obj.messages) ?
                error_obj.messages.transform_values(&:uniq).merge({
                  fullMessages: error_message
                }) :
                {base: [first_error], fullMessages: error_message}
            )
          }
      end
    end

    # DEPRECATED: This method uses internal status update only
    # Use cancel_external instead to cancel via external API
    def cancel
      Rails.logger.info "Starting process to cancel #{@appointment.registration_number}"

      success, message = begin
        Appointment.transaction do
          service = AppointmentStatusUpdaterService.new(@appointment, current_user)
          success = service.call(new_status: "cancelled", reason: params.dig(:form_data, :reason))

          if success
            [true, "Appointment cancelled successfully."]
          else
            [false, service.errors.first]
          end
        end
      rescue => e
        Rails.logger.error "Exception while cancelling appointment #{@appointment.registration_number}: #{e.message}"
        [false, e.message]
      ensure
        Rails.logger.info "Finished process to cancel for the appointment #{@appointment.registration_number}"
      end

      if success
        Rails.logger.info "Appointment #{@appointment.registration_number} cancelled."

        redirect_to determine_redirect_path(exclude_param: "cancel"), notice: message
      else
        Rails.logger.warn "Failed to cancel appointment #{@appointment.registration_number}: #{message}"

        redirect_to determine_redirect_path, alert: message
      end
    end

    def cancel_external
      Rails.logger.info "Starting external API cancel process for order ID: #{params[:id]}"

      # Find appointment by order ID
      @appointment = Appointment.joins(:order).find_by(orders: {id: params[:id]})

      unless @appointment
        Rails.logger.error "Appointment not found for order ID: #{params[:id]}"

        redirect_to determine_redirect_path, alert: "Appointment not found"
        return
      end

      cancellation_reason = params.dig(:form_data, :reason)

      result = CancelAppointmentServiceExternalApi.new(@appointment, current_user, cancellation_reason).call

      if result[:success]
        redirect_to determine_redirect_path(exclude_param: "cancel"), notice: result[:message] || "Appointment cancelled successfully via external API."
      else
        default_error_message = "Failed to cancel appointment via external API"
        error_message = result[:error] || default_error_message
        Rails.logger.error "#{default_error_message}: #{error_message}"

        redirect_to determine_redirect_path, alert: error_message, inertia: {
          errors: deep_transform_keys_to_camel_case({base: [error_message], full_messages: [error_message]})
        }
      end
    end

    def update_pic
      Rails.logger.info "Starting process to update the admin PIC(s) for appointment #{@appointment.registration_number}"

      begin
        ActiveRecord::Base.transaction do
          appointments = Appointment.where(registration_number: @appointment.registration_number)
          new_admin_ids = params.dig(:form_data, :admin_ids) || []

          appointments.each do |appt|
            current_admin_ids = appt.admin_ids

            # Remove admins not in new list
            (current_admin_ids - new_admin_ids).each do |admin_id|
              AppointmentAdmin.find_by(appointment: appt, admin_id: admin_id)&.destroy!
            end

            # Add new admins
            (new_admin_ids - current_admin_ids).each do |admin_id|
              AppointmentAdmin.create!(appointment: appt, admin_id: admin_id)
            end
          end
        end

        redirect_to determine_redirect_path(exclude_param: "update_pic"), notice: "Admin PIC(s) updated successfully."
      rescue => e
        Rails.logger.error "Failed to update admin PIC(s) for appointment #{@appointment.registration_number}: #{e.message}"

        redirect_to determine_redirect_path, alert: "Failed to update admins PIC(s): #{e.message}"
      ensure
        Rails.logger.info "Finished process to update the admin PIC(s) for the appointment #{@appointment.registration_number}"
      end
    end

    def update_status
      Rails.logger.info "Starting process to update status the appointment #{@appointment.registration_number}"

      begin
        ActiveRecord::Base.transaction do
          service = AppointmentStatusUpdaterService.new(@appointment, current_user)
          success = service.call(new_status: params.dig(:form_data, :status), reason: params.dig(:form_data, :reason))
          if success
            Rails.logger.info "Appointment #{@appointment.registration_number} status updated successfully."

            redirect_to determine_redirect_path(exclude_param: "update_status"), notice: "Status updated."
          else
            messages = service.errors.join(", ")
            Rails.logger.warn "Failed to update status the appointment #{@appointment.registration_number}: #{messages}"

            redirect_to determine_redirect_path, alert: "Failed to update status the appointment: #{messages}"
            raise ActiveRecord::Rollback
          end
        end
      rescue => e
        Rails.logger.error "Error updating status for appointment #{@appointment.registration_number}: #{e.message}"

        redirect_to determine_redirect_path, alert: "Error updating status: #{e.message}"
      ensure
        Rails.logger.info "Finished process to update status the appointment #{@appointment.registration_number}"
      end
    end

    def update_payment_status
      Rails.logger.info "Starting external API payment status update for order ID: #{@order.id}"

      payment_status = params.dig(:form_data, :payment_status)

      unless payment_status
        Rails.logger.error "Payment status parameter is missing"
        redirect_to determine_redirect_path, alert: "Payment status is required"
        return
      end

      result = UpdatePaymentStatusServiceExternalApi.new(@order, current_user, payment_status).call

      if result[:success]
        redirect_to determine_redirect_path(exclude_param: "update_payment_status"), notice: result[:message] || "Payment status updated successfully."
      else
        default_error_message = "Failed to update payment status"
        error_message = result[:error] || default_error_message
        Rails.logger.error "#{default_error_message}: #{error_message}"
        redirect_to determine_redirect_path, alert: error_message, inertia: {
          errors: deep_transform_keys_to_camel_case({base: [error_message], full_messages: [error_message]})
        }
      end
    end

    def send_feedback_reminder
      Rails.logger.info "Starting external API feedback reminder for order ID: #{@order.id}"

      result = SendFeedbackReminderServiceExternalApi.new(@order, current_user).call

      if result[:success]
        redirect_to determine_redirect_path, notice: result[:message] || "Feedback reminder sent successfully."
      else
        error_message = result[:error] || "Failed to send feedback reminder"
        Rails.logger.error "Failed to send feedback reminder: #{error_message}"
        redirect_to determine_redirect_path, alert: error_message, inertia: {
          errors: deep_transform_keys_to_camel_case({base: [error_message], full_messages: [error_message]})
        }
      end
    end

    def change_package
      Rails.logger.info "Starting external API package change for order ID: #{@order.id}"

      new_package_id = params.dig(:form_data, :new_package_id)
      force = params.dig(:form_data, :force) || false
      bypass_payment = params.dig(:form_data, :bypass_payment) != false # default to true

      if new_package_id.blank?
        Rails.logger.error "New package ID is required"
        redirect_to determine_redirect_path, alert: "New package ID is required"
        return
      end

      Rails.logger.info "Calling [ChangeOrderPackageServiceExternalApi] with new_package_id: #{new_package_id}, force: #{force}, bypass_payment: #{bypass_payment}"
      result = ChangeOrderPackageServiceExternalApi.new(@order, current_user, new_package_id, force: force, bypass_payment: bypass_payment).call
      Rails.logger.info "[ChangeOrderPackageServiceExternalApi] result: #{result}"

      if result[:success]
        redirect_to orders_admin_portal_appointments_path(search: @order.registration_number), notice: result[:message] || "Package changed successfully."
      else
        error_message = result[:error] || "Failed to change package"
        Rails.logger.error "Failed to change package: #{error_message}"
        redirect_to determine_redirect_path, alert: error_message, inertia: {
          errors: deep_transform_keys_to_camel_case({base: [error_message], full_messages: [error_message]})
        }
      end
    end

    #     def sync_data_master
    #       sync_response = MasterDataSyncService.new(current_user).appointments
    #       redirect_path = admin_portal_appointments_path(request.query_parameters)
    #
    #       if sync_response[:success]
    #         results = sync_response[:results]
    #         Rails.logger.debug do
    #           "Sync Summary - Appointments: Created: #{results[:created]}, Updated: #{results[:updated]}, Skipped: #{results[:skipped]}, Failed: #{results[:failed]}, Unchanged: #{results[:unchanged]}"
    #         end
    #         redirect_to redirect_path, notice: sync_response[:message]
    #       else
    #         redirect_to redirect_path, alert: sync_response[:error]
    #       end
    #     end

    def export
      from_date_param = params[:report_from]
      to_date_param = params[:report_to]
      redirect_path = admin_portal_appointments_path(request.query_parameters.except("report_from", "report_to"))

      # Log the parameters for debugging
      Rails.logger.info "Export params - from: #{from_date_param}, to: #{to_date_param}"
      Rails.logger.info "Request format: #{request.format}"

      begin
        export_service = ExportAppointmentService.new(from_date_param:, to_date_param:)
        result = export_service.call

        Rails.logger.info "Export result: #{result.keys}"

        if result[:success]
          respond_to do |format|
            format.xlsx do
              Rails.logger.info "Sending XLSX file: #{result[:filename]}"

              send_data result[:data],
                filename: result[:filename],
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                disposition: "attachment"
            end

            Rails.logger.info "Successfully exported #{result[:count]} appointments."
          end
        else
          Rails.logger.error "Export failed: #{result[:error]}"

          redirect_to redirect_path, alert: result[:error]
        end
      rescue => e
        error_message = "Export failed: #{e.message}"
        Rails.logger.error error_message

        redirect_to redirect_path, alert: error_message
      end
    end

    def download_soap_pdf
      appointment_id = params[:id]

      Rails.logger.info "Attempting to download SOAP PDF for appointment ID: #{appointment_id}"

      unless @appointment
        Rails.logger.error "Appointment not found for ID: #{appointment_id}"
        flash[:alert] = "Appointment not found"

        redirect_to determine_redirect_path
        return
      end

      begin
        pdf_data = DownloadFileServiceExternalApi.new(
          @appointment.id,
          "appointment",
          download_type: DownloadFileServiceExternalApi::SOAP_PER_VISIT,
          use_external_filename: false
        ).call

        if pdf_data[:success]
          Rails.logger.info "Successfully generated SOAP PDF for appointment ID: #{appointment_id}"
          send_data pdf_data[:data],
            filename: pdf_data[:filename],
            type: "application/pdf",
            disposition: "attachment"
        else
          error_message = pdf_data[:error] || "Failed to generate SOAP PDF"
          Rails.logger.error "Failed to generate SOAP PDF: #{error_message}"
          flash[:alert] = error_message

          redirect_to determine_redirect_path
        end
      rescue => e
        Rails.logger.error "Exception while generating SOAP PDF: #{e.message}"
        flash[:alert] = "An error occurred while generating the PDF"

        redirect_to determine_redirect_path
      end
    end

    def download_soap_final_pdf
      appointment_id = params[:id]

      Rails.logger.info "Attempting to download Final SOAP PDF for appointment ID: #{appointment_id}"

      unless @appointment
        Rails.logger.error "Appointment not found for ID: #{appointment_id}"
        flash[:alert] = "Appointment not found"

        redirect_to determine_redirect_path
        return
      end

      begin
        pdf_data = DownloadFileServiceExternalApi.new(
          @appointment.id,
          "appointment",
          download_type: DownloadFileServiceExternalApi::SOAP_FINAL,
          use_external_filename: false
        ).call

        if pdf_data[:success]
          Rails.logger.info "Successfully generated Final SOAP PDF for appointment ID: #{appointment_id}"
          send_data pdf_data[:data],
            filename: pdf_data[:filename],
            type: "application/pdf",
            disposition: "attachment"
        else
          error_message = pdf_data[:error] || "Failed to generate Final SOAP PDF"
          Rails.logger.error "Failed to generate Final SOAP PDF: #{error_message}"
          flash[:alert] = error_message

          redirect_to determine_redirect_path
        end
      rescue => e
        Rails.logger.error "Exception while generating Final SOAP PDF: #{e.message}"
        flash[:alert] = "An error occurred while generating the PDF"

        redirect_to determine_redirect_path
      end
    end

    def download_invoice
      appointment_id = params[:id]

      Rails.logger.info "Attempting to download Invoice for appointment ID: #{appointment_id}"

      unless @appointment
        Rails.logger.error "Appointment not found for ID: #{appointment_id}"
        flash[:alert] = "Appointment not found"

        redirect_to determine_redirect_path
        return
      end

      # Get the order associated with this appointment
      order = @appointment.order
      unless order
        Rails.logger.error "Order not found for appointment ID: #{appointment_id}"
        flash[:alert] = "Order not found for this appointment"

        redirect_to determine_redirect_path
        return
      end

      begin
        pdf_data = DownloadFileServiceExternalApi.new(
          order.id,
          "order",
          download_type: DownloadFileServiceExternalApi::INVOICE,
          use_external_filename: false
        ).call

        if pdf_data[:success]
          Rails.logger.info "Successfully generated Invoice for appointment ID: #{appointment_id}, order ID: #{order.id}"
          send_data pdf_data[:data],
            filename: pdf_data[:filename],
            type: "application/pdf",
            disposition: "attachment"
        else
          error_message = pdf_data[:error] || "Failed to generate Invoice"
          Rails.logger.error "Failed to generate Invoice: #{error_message}"
          flash[:alert] = error_message

          redirect_to determine_redirect_path
        end
      rescue => e
        Rails.logger.error "Exception while generating Invoice: #{e.message}"
        flash[:alert] = "An error occurred while generating the PDF"

        redirect_to determine_redirect_path
      end
    end

    private

    # Determines the appropriate redirect path based on the referring page
    # @param keep_params [Boolean] Whether to keep query parameters (default: true)
    # @param exclude_param [Symbol] Parameter to exclude from query string
    # @param custom_params [Hash] Custom parameters to use instead of query params
    # @return [String] The appropriate redirect path
    def determine_redirect_path(keep_params: true, exclude_param: nil, custom_params: nil)
      # Check if user came from orders page
      is_from_orders = request.referer&.include?(orders_admin_portal_appointments_path)

      # Return appropriate path based on parameters
      if custom_params
        is_from_orders ? orders_admin_portal_appointments_path(custom_params) : admin_portal_appointments_path(custom_params)
      elsif exclude_param
        is_from_orders ? orders_admin_portal_appointments_path(request.query_parameters.except(exclude_param)) : admin_portal_appointments_path(request.query_parameters.except(exclude_param))
      elsif keep_params
        is_from_orders ? orders_admin_portal_appointments_path(request.query_parameters) : admin_portal_appointments_path(request.query_parameters)
      else
        is_from_orders ? orders_admin_portal_appointments_path : admin_portal_appointments_path
      end
    end

    def set_appointment
      @appointment = Appointment.includes(:therapist).find(params[:id])
    end

    def set_order
      @order = Order.find(params[:order_id])
    end

    # Finds a recently created appointment with retry for DB sync delay
    def find_created_appointment(appointment_id)
      appointment = Appointment.find_by(id: appointment_id)
      unless appointment
        sleep(0.5)
        appointment = Appointment.find_by(id: appointment_id)
      end
      appointment || Appointment.new
    end

    # Extracts appointment ID from result data (Appointment object or API response hash)
    def extract_appointment_id(data)
      return data.id if data.respond_to?(:id)

      appointments = data["appointments"] || data[:appointments] || []
      appointments.first&.dig("appointment_id") || appointments.first&.dig(:appointment_id)
    end

    # Extracts error messages from various error types
    def extract_error_messages(error)
      if error.is_a?(String)
        [error, [error]]
      elsif error.respond_to?(:full_messages)
        [error.full_messages&.first, error.full_messages]
      else
        [error.to_s, [error.to_s]]
      end
    end
  end
end
