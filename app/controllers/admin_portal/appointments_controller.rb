module AdminPortal
  class AppointmentsController < ApplicationController
    before_action :set_appointment, only: [:update, :cancel]

    def index
      preparation = PreparationIndexAppointmentService.new(params)

      render inertia: "AdminPortal/Appointment/Index", props: deep_transform_keys_to_camel_case({
        appointments: InertiaRails.defer { preparation.fetch_appointments },
        selected_appointment: InertiaRails.defer { preparation.fetch_selected_appointment }
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
      Rails.logger.info "Starting cancellation process for appointment #{@appointment.registration_number}"

      ActiveRecord::Base.transaction do
        if @appointment.update_columns(status: "CANCELLED")
          # if false
          Rails.logger.info "Appointment #{@appointment.registration_number} updated to CANCELLED successfully."
          redirect_to admin_portal_appointments_path(request.query_parameters.except("cancel")), notice: "Appointment cancelled successfully."
        else
          Rails.logger.error "Failed to update appointment #{@appointment.registration_number}: #{@appointment.errors.full_messages.first}"
          # redirect_to admin_portal_appointments_path(request.query_parameters), alert: @appointment.errors.full_messages.first
          redirect_to admin_portal_appointments_path(request.query_parameters), alert: "error"
          raise ActiveRecord::Rollback
        end
      end
    rescue => e
      Rails.logger.error "Exception while cancelling appointment #{@appointment.registration_number}: #{e.message}"
      redirect_to admin_portal_appointments_path(request.query_parameters), alert: e.message
    ensure
      Rails.logger.info "Finished cancellation process for appointment #{@appointment.registration_number}"
    end

    private

    def set_appointment
      @appointment = Appointment.find(params[:id])
    end
  end
end
