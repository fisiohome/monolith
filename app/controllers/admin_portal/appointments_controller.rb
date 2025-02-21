module AdminPortal
  class AppointmentsController < ApplicationController
    def index
      render inertia: "AdminPortal/Appointment/Index", props: deep_transform_keys_to_camel_case({})
    end

    def new
      # @appointment = Appointment.new

      preparation = PreparationNewAppointmentService.new(params)

      render inertia: "AdminPortal/Appointment/New", props: deep_transform_keys_to_camel_case({
        locations: InertiaRails.defer { preparation.fetch_locations },
        services: InertiaRails.defer { preparation.fetch_services },
        therapists: InertiaRails.defer { preparation.fetch_therapists }
      })
    end
  end
end
