module AdminPortal
  class AppointmentsController < ApplicationController
    include AppointmentsHelper

    before_action :authenticate_user!
    before_action :set_appointment, only: [:cancel, :update_pic, :update_status, :reschedule_page, :reschedule]

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
        therapists: -> { preparation.fetch_therapists },
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
        therapists: -> { preparation.fetch_therapists },
        options_data: InertiaRails.defer { preparation.fetch_options_data }
      })
    end

    def reschedule
      result = UpdateAppointmentService.new(@appointment, params, current_user).call

      if result[:success]
        notice_msg =
          if result[:changed]
            "Appointment was successfully rescheduled."
          else
            "No changes detected."
          end

        redirect_to admin_portal_appointments_path(rescheduled: @appointment.id), notice: notice_msg
      else
        logger.error("Failed to reschedule: #{result[:error]}")
        first_error = result[:error]&.full_messages&.first
        error_message = result[:error]&.full_messages

        logger.error("Failed to reschedule the appointment: #{error_message}.")
        flash[:alert] = first_error
        redirect_to reschedule_admin_portal_appointments_path(@appointment),
          inertia: {
            errors: deep_transform_keys_to_camel_case(
              result[:error]&.messages&.transform_values(&:uniq)&.merge({
                fullMessages: error_message
              })
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
        redirect_to(
          admin_portal_appointments_path(request.query_parameters.except("cancel")),
          notice: message
        )
      else
        Rails.logger.warn "Failed to cancel the appointment #{@appointment.registration_number}: #{message}"
        redirect_to(
          admin_portal_appointments_path(request.query_parameters),
          alert: message
        )
      end
    end

    def cancel_external
      Rails.logger.info "Starting external API cancel process for appointment ID: #{params[:id]}"

      # Find appointment by order ID
      @appointment = Appointment.joins(:order).find_by(orders: {id: params[:id]})

      unless @appointment
        Rails.logger.error "Appointment not found for order ID: #{params[:id]}"
        redirect_to(
          admin_portal_appointments_path(request.query_parameters),
          alert: "Appointment not found"
        )
        return
      end

      cancellation_reason = params.dig(:form_data, :reason)

      result = CancelAppointmentServiceExternalApi.new(@appointment, current_user, cancellation_reason).call

      if result[:success]
        redirect_to(
          admin_portal_appointments_path(request.query_parameters.except("cancel")),
          notice: result[:message] || "Appointment cancelled successfully via external API."
        )
      else
        Rails.logger.warn "Failed to cancel appointment #{@appointment.registration_number} via external API: #{result[:error]}"
        redirect_to(
          admin_portal_appointments_path(request.query_parameters),
          alert: result[:error]
        )
      end
    end

    def update_pic
      Rails.logger.info "Starting process to update the admin PIC(s) for appointment #{@appointment.registration_number}"

      begin
        ActiveRecord::Base.transaction do
          current_admin_ids = @appointment.admin_ids
          new_admin_ids = params.dig(:form_data, :admin_ids)

          # Remove admins not in new list
          (current_admin_ids - new_admin_ids).each do |admin_id|
            AppointmentAdmin.find_by(appointment: @appointment, admin_id: admin_id)&.destroy!
          end

          # Add new admins
          (new_admin_ids - current_admin_ids).each do |admin_id|
            AppointmentAdmin.create!(appointment: @appointment, admin_id: admin_id)
          end
        end # Transaction commits here if no exceptions

        Rails.logger.info "Appointment #{@appointment.registration_number} admin PIC(s) updated successfully."
        redirect_to admin_portal_appointments_path(request.query_parameters.except("update_pic")), notice: "Admin PIC(s) updated successfully."
      rescue => e
        Rails.logger.error "Failed to update admin PIC(s) for appointment #{@appointment.registration_number}: #{e.message}"
        redirect_to admin_portal_appointments_path(request.query_parameters), alert: "Failed to update admins PIC(s): #{e.message}"
      ensure
        Rails.logger.info "Finished process to update the admin PIC(s) for appointment #{@appointment.registration_number}"
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
            redirect_to admin_portal_appointments_path(request.query_parameters.except("update_status")), notice: "Status updated."
          else
            messages = service.errors.join(", ")
            Rails.logger.warn "Failed to update status the appointment #{@appointment.registration_number}: #{messages}"
            redirect_to admin_portal_appointments_path(request.query_parameters), alert: "Failed to update status the appointment: #{messages}"
            raise ActiveRecord::Rollback
          end
        end
      rescue => e
        Rails.logger.error "Error updating status for appointment #{@appointment.registration_number}: #{e.message}"
        redirect_to admin_portal_appointments_path(request.query_parameters), alert: "Error updating status: #{e.message}"
      ensure
        Rails.logger.info "Finished process to update status the appointment #{@appointment.registration_number}"
      end
    end

    def sync_data_master
      sync_response = MasterDataSyncService.new(current_user).appointments
      redirect_path = admin_portal_appointments_path(request.query_parameters)

      if sync_response[:success]
        results = sync_response[:results]
        Rails.logger.debug do
          "Sync Summary - Appointments: Created: #{results[:created]}, Updated: #{results[:updated]}, Skipped: #{results[:skipped]}, Failed: #{results[:failed]}, Unchanged: #{results[:unchanged]}"
        end
        redirect_to redirect_path, notice: sync_response[:message]
      else
        redirect_to redirect_path, alert: sync_response[:error]
      end
    end

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
            format.csv do
              Rails.logger.info "Sending CSV file: #{result[:filename]}"

              send_data result[:data],
                filename: result[:filename],
                type: "text/csv; charset=utf-8; header=present",
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
        Rails.logger.error e.backtrace.join("\n")

        redirect_to redirect_path, alert: error_message
      end
    end

    private

    def set_appointment
      @appointment = Appointment.includes(:therapist).find(params[:id])
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
