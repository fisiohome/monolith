module AdminPortal
  class AppointmentsController < ApplicationController
    before_action :set_appointment, only: [:update]

    def index
      preparation = PreparationIndexAppointmentService.new(params)

      render inertia: "AdminPortal/Appointment/Index", props: deep_transform_keys_to_camel_case({
        appointments: InertiaRails.defer { preparation.fetch_appointments }
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

    private

    def set_appointment
      @appointment = Appointment.find(params[:id])
    end
  end
end
