module AdminPortal
  class AppointmentsController < ApplicationController
    include ServicesHelper
    include LocationsHelper

    def index
      render inertia: "AdminPortal/Appointment/Index", props: deep_transform_keys_to_camel_case({})
    end

    def new
      # @appointment = Appointment.new

      # retrieves all active locations
      get_locations_lambda = lambda do
        Location.all.map do |location|
          deep_transform_keys_to_camel_case(serialize_location(
            location,
            {only: %i[id city country country_code state]}
          ))
        end
      end

      # retrieves all active services join by the selected location
      selected_location_id = params[:location_id]
      get_services_lambda = lambda do
        return if selected_location_id.blank?

        locations = Location.find(selected_location_id)
        active_services = locations.services
          .joins(:location_services)
          .where(location_services: {active: true})
          .where(active: true)
          .distinct
          .includes(:packages)
          .where(packages: {active: true})

        active_services.map do |service|
          deep_transform_keys_to_camel_case(
            serialize_service(
              service,
              only: %i[id code active description name],
              include_packages: true,
              only_packages: %i[id name active number_of_visit]
            )
          )
        end
      end

      render inertia: "AdminPortal/Appointment/New", props: deep_transform_keys_to_camel_case({
        locations: InertiaRails.defer { get_locations_lambda.call },
        services: InertiaRails.defer { get_services_lambda.call }
      })
    end
  end
end
