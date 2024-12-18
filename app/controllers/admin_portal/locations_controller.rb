module AdminPortal
  class LocationsController < ApplicationController
    def index
      # define the query params default values
      page = params.fetch(:page, 1)
      limit = params.fetch(:limit, 10)
      filter_by_country = params[:country]
      filter_by_state = params[:state]
      filter_by_city = params[:city]

      # get the location collections
      location_collections = Location
        .where(filter_by_country.present? ? ["country ILIKE ?", "%#{filter_by_country}"] : nil)
        .where(filter_by_state.present? ? ["state ILIKE ?", "%#{filter_by_state}"] : nil)
        .where(filter_by_city.present? ? ["city ILIKE ?", "%#{filter_by_city}"] : nil)
        .order(created_at: "DESC")

      @pagy, @locations = pagy_array(location_collections, page: page, limit: limit)

      render inertia: "AdminPortal/Location/Index", props: deep_transform_keys_to_camel_case({
        locations: {
          metadata: pagy_metadata(@pagy),
          data: @locations.map do |location|
            serialize_location(location)
          end
        }
      })
    end

    def create
      logger.info("Starting the process to create a new locations.")

      locations_params = location_list_params
      errors = []

      Location.transaction do
        # bulk create locations
        locations_params.each_with_index do |location_param, index|
          location = Location.new(location_param)

          unless location.save
            logger.error("Error saving location with city name:  #{location_param[:city]}.")
            errors << { index:, messages: location.errors.to_hash }
          end
        end

        raise ActiveRecord::Rollback if errors.any?
      end
      
      if errors.any?
        base_error_message = "Failed to create the location."
        logger.error(base_error_message)
        flash[:alert] = base_error_message
        redirect_to admin_portal_locations_path(new: "location"), inertia: {
          errors: { 
            locations: errors.map { |error| deep_transform_keys_to_camel_case(error) } 
          }
        }
      else
        success_message = "Locations created successfully."
        logger.info(success_message)
        redirect_to admin_portal_locations_path, notice: success_message
      end

      logger.info("Location creation process finished.")
    end

    private

    def serialize_location(location)
      location.as_json
    end

    # strong parameters for single creation
    def location_params
      params.require(:location).permit(:country, :country_code, :state, :city)
    end

    # strong parameters for bulk creation
    def location_list_params
      params.require(:locations).map do |location|
        location.permit(:country, :country_code, :state, :city)
      end
    end
  end
end
