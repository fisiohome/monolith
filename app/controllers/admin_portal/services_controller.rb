module AdminPortal
  class ServicesController < ApplicationController
    before_action :get_service, only: %i[update destroy update_status]

    def index
      filter_by_status = params[:filter_by_status]
      selected_param = params[:edit] || params[:delete] || params[:update_status]

      # get services
      services = Service
        .includes(:location_services)
        .all
        .where(
          if filter_by_status == "active"
            ["active IS NOT NULL AND active IS true"]
          else
            (filter_by_status == "inactive") ? ["active IS NULL OR active IS false"] :
                        nil
          end
        )
        .sort_by { |item| item.active ? 0 : 1 }

      # get the selected service
      selected_service_lambda = lambda do
        selected_param ? service = Service.includes(:location_services).find_by(id: selected_param) : nil
        service ? deep_transform_keys_to_camel_case(serialize_service(service)) : nil
      end

      # get the location collections
      locations_lambda = lambda do
        selected_param ? Location.all : nil
      end

      render inertia: "AdminPortal/Service/Index", props: deep_transform_keys_to_camel_case({
        services: services.map do |service|
          serialize_service(service)
        end,
        selected_service: -> { selected_service_lambda.call },
        locations: -> { locations_lambda.call }
      })
    end

    def create
      logger.info("Starting the process to create a new service.")
      new_service = Service.new(service_params)
      if new_service.save
        success_message = "New service with name #{new_service.name}, successfully created."
        logger.info(success_message)
        redirect_to admin_portal_services_path, notice: success_message
      else
        base_error_message = "Failed to create a new service."
        error_message = new_service&.errors&.first&.full_message || base_error_message
        logger.error("#{base_error_message} Errors: #{error_message}")
        flash[:alert] = error_message
        redirect_to admin_portal_services_path, inertia: {
          errors: deep_transform_keys_to_camel_case(
            new_service.errors.to_hash.merge({full_messages: new_service.errors.full_messages})
          )
        }
      end
      logger.info("Create a new service process finished.")
    end

    def update
      logger.info("Starting the process to update service.")

      update_service_params = params.require(:service).permit(:name, :code, :active, locations: [:id, :city, :active])
      Service.transaction do
        if @service.update(update_service_params.except(:locations))
          logger.info("Service details with name #{@service.name} updated successfully. Proceeding to update locations.")

          # Handle locations update
          locations_data = update_service_params[:locations] || []
          locations_data.each do |location_data|
            location = Location.find_by(city: location_data[:city])

            unless location
              logger.warn("Location not found for city: #{location_data[:city]}")
              next
            end

            location_service = LocationService.find_or_initialize_by(location: location, service: @service)
            location_service.active = location_data[:active]

            unless location_service.save
              error_message = location_service.errors.full_messages.to_sentence
              logger.error("Failed to update LocationService for location_id: #{location.id}, service_id: #{@service.id}. Errors: #{error_message}")
              raise ActiveRecord::Rollback, "Failed to update location services."
            end
          end

          success_message = "Successfully updated the service with name #{@service.name}."
          logger.info(success_message)
          redirect_to admin_portal_services_path, notice: success_message
        else
          base_error_message = "Failed to update the service with name #{@service.name}."
          error_message = @service&.errors&.first&.full_message || base_error_message
          logger.error("#{base_error_message} Errors: #{error_message}.")
          flash[:alert] = error_message
          redirect_to admin_portal_services_path(edit: @service.id), inertia: {
            errors: deep_transform_keys_to_camel_case(
              @service.errors.to_hash.merge({full_messages: @service.errors.full_messages})
            )
          }
        end
      end

      logger.info("Update service process finished.")
    end

    def destroy
      logger.info("Starting process to delete the service.")

      @service.destroy
      success_message = "Successfully to delete the service with name: #{@service.name}."
      logger.info(success_message)
      redirect_to admin_portal_services_path, notice: success_message

      logger.info("Delete the service process finished.")
    end

    def update_status
      logger.info("Starting the process to update service status.")

      # toggle the service status
      if @service.update(active: !@service.is_active?)
        success_message = "Successfully to #{@service.is_active? ? "activate" : "inactive"} the service with name #{@service.name}."
        logger.info(success_message)
        redirect_to admin_portal_services_path, notice: success_message
      else
        base_error_message = "Failed to #{@service.is_active? ? "activate" : "inactive"} the service with name #{@service.name}."
        error_message = @service&.errors&.first&.full_message || base_error_message
        logger.error("#{base_error_message} Errors: #{error_message}.")
        flash[:alert] = error_message
        redirect_to admin_portal_services_path(update_status: @service.id), inertia: {
          errors: deep_transform_keys_to_camel_case(
            @service.errors.to_hash.merge({full_messages: @service.errors.full_messages})
          )
        }
      end
      logger.info("Update service status process finished.")
    end

    private

    def get_service
      @service = Service.find(params[:id])

      # error if not found existing service
      unless @service
        error_message = "The existing service could not be found."
        logger.error(error_message)
        flash[:alert] = error_message
        redirect_to admin_portal_services_path
      end
    end

    def serialize_service(service)
      service.as_json.tap do |serialized_service|
        # flatten the location_services and their associated locations
        serialized_service["locations"] = service.location_services.map do |location_service|
          location_service.location.attributes.merge(active: location_service.active)
        end
      end
    end

    def service_params
      params.require(:service).permit(:name, :code, :active)
    end
  end
end
