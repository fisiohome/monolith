module AdminPortal
  class AppointmentsController < ApplicationController
    before_action :set_appointment, only: [:update, :cancel, :update_pic, :update_status]

    def index
      preparation = PreparationIndexAppointmentService.new(params)

      render inertia: "AdminPortal/Appointment/Index", props: deep_transform_keys_to_camel_case({
        appointments: InertiaRails.defer { preparation.fetch_appointments },
        selected_appointment: InertiaRails.defer { preparation.fetch_selected_appointment },
        options_data: InertiaRails.defer { preparation.fetch_options_data }
      })
    end

    def new
      @appointment = params[:created] ? Appointment.find_by(id: params[:created]) || Appointment.new : Appointment.new

      preparation = PreparationNewAppointmentService.new(params)

      render inertia: "AdminPortal/Appointment/New", props: deep_transform_keys_to_camel_case({
        appointment: @appointment.as_json,
        locations: InertiaRails.defer { preparation.fetch_locations },
        services: InertiaRails.defer { preparation.fetch_services },
        therapists: InertiaRails.defer { preparation.fetch_therapists },
        options_data: InertiaRails.defer { preparation.fetch_options_data }
      })
    end

    def create
      result = CreateAppointmentService.new(params).call
      if result[:success]
        redirect_to new_admin_portal_appointment_path(created: result[:data].id), notice: "Appointment was successfully booked."
      else
        error_message = result[:error]&.full_messages

        logger.error("Failed to save the booking of the appointment: #{error_message}.")
        flash[:alert] = error_message
        redirect_to new_admin_portal_appointment_path, inertia: {
          errors: deep_transform_keys_to_camel_case(
            result[:error]&.messages&.transform_values(&:uniq)&.merge({
              full_messages: error_message
            })
          )
        }
      end
    end

    def update
    end

    def cancel
      Rails.logger.info "Starting process to cancel the appointment #{@appointment.registration_number}"

      ActiveRecord::Base.transaction do
        if @appointment.update_columns(status: "CANCELLED")
          Rails.logger.info "Appointment #{@appointment.registration_number} status updated to CANCELLED successfully."
          redirect_to admin_portal_appointments_path(request.query_parameters.except("cancel")), notice: "Appointment cancelled successfully."
        else
          Rails.logger.error "Failed to update appointment #{@appointment.registration_number}: #{@appointment.errors.full_messages.first}"
          redirect_to admin_portal_appointments_path(request.query_parameters), alert: @appointment.errors.full_messages.first
          raise ActiveRecord::Rollback
        end
      end
    rescue => e
      Rails.logger.error "Exception while cancelling appointment #{@appointment.registration_number}: #{e.message}"
      redirect_to admin_portal_appointments_path(request.query_parameters), alert: e.message
    ensure
      Rails.logger.info "Finished process to cancel for the appointment #{@appointment.registration_number}"
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
          @appointment.update(status: params.dig(:form_data, :status))
        end

        Rails.logger.info "Appointment #{@appointment.registration_number} status updated successfully."
        redirect_to admin_portal_appointments_path(request.query_parameters.except("update_status")), notice: "Status updated."
      rescue => e
        Rails.logger.error "Failed to update status the appointment #{@appointment.registration_number}: #{e.message}"
        redirect_to admin_portal_appointments_path(request.query_parameters), alert: "Failed to update status the appointment: #{e.message}"
      ensure
        Rails.logger.info "Finished process to update status the appointment #{@appointment.registration_number}"
      end
    end

    private

    def set_appointment
      @appointment = Appointment.find(params[:id])
    end
  end
end
