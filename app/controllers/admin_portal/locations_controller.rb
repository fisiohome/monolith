module AdminPortal
  class LocationsController < ApplicationController
    def index
      # define the query params default values
      page = params.fetch(:page, 1)
      limit = params.fetch(:limit, 10)
      filter_by_country = params[:country]
      filter_by_state = params[:state]
      filter_by_city = params[:city]
      selected_param = params[:edit] || params[:delete]

      # get the location collections
      location_collections = Location
        .where(filter_by_country.present? ? ["country ILIKE ?", "%#{filter_by_country}%"] : nil)
        .where(filter_by_state.present? ? ["state ILIKE ?", "%#{filter_by_state}%"] : nil)
        .where(filter_by_city.present? ? ["city ILIKE ?", "%#{filter_by_city}%"] : nil)

      @pagy, @locations = pagy_array(location_collections, page: page, limit: limit)

      # get the selected location
      selected_locations_lambda = lambda do
        return nil unless selected_param

        location_ids = selected_param.split(",")
        selected_locations = Location.where(id: location_ids)
        selected_locations.map { |location| deep_transform_keys_to_camel_case(serialize_location(location)) }
      end

      # get the indonesian provinces
      get_indonesian_areas_lambda = lambda do
        provinces = IndonesianArea.provinces.map { |province| deep_transform_keys_to_camel_case(province.as_json) }
        cities = IndonesianArea.cities.map { |city| deep_transform_keys_to_camel_case(city.as_json) }

        {provinces:, cities:}
      end

      render inertia: "AdminPortal/Location/Index", props: deep_transform_keys_to_camel_case({
        locations: {
          metadata: pagy_metadata(@pagy),
          data: @locations.map do |location|
            serialize_location(location)
          end
        },
        selected_locations: -> { selected_locations_lambda.call },
        options_data: InertiaRails.defer { get_indonesian_areas_lambda.call }
      })
    end

    def create_bulk
      logger.info("Starting the process to create a new location in a bulk.")

      locations_params = location_list_params
      errors = []

      Location.transaction do
        # bulk create locations
        locations_params.each_with_index do |location_param, index|
          location = Location.new(location_param)
          logger.info("Saving the location with city name: #{location_param[:city]}.")

          unless location.save
            logger.error("Error saving location with city name: #{location_param[:city]}, cause: #{location.errors.full_messages.to_sentence}.")
            errors << {index:, messages: location.errors.to_hash}
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

    def update_bulk
      logger.info("Start the process of updating location details in a bulk.")

      locations_params = location_list_params
      errors = []

      Location.transaction do
        locations_params.each_with_index do |location_params, index|
          location = Location.find_by(id: location_params[:id])

          # skip if the location doesn't exist
          next unless location

          logger.info("Updating the location with id: #{location[:id]}, and current name: #{location[:city]}.")

          # update attributes and save
          unless location.update(location_params)
            # raise an exception if validation fails
            logger.error("Error updating the location with id: #{location[:id]}, cause: #{location.errors.full_messages.to_sentence}.")
            errors << {index:, messages: location.errors.to_hash}
          end
        end

        raise ActiveRecord::Rollback if errors.any?
      end

      if errors.any?
        # handle validation errors and respond with meaningful error messages
        base_error_message = "Failed to update locations"
        logger.error(base_error_message)
        flash[:alert] = base_error_message

        selected_ids = locations_params.pluck("id").join(",")
        redirect_to admin_portal_locations_path(edit: selected_ids), inertia: {
          errors: {
            locations: errors.map { |error| deep_transform_keys_to_camel_case(error) }
          }
        }
      else
        # if the transaction is successful, respond with success
        success_message = "Locations updated successfully."
        logger.info(success_message)
        redirect_to admin_portal_locations_path, notice: success_message
      end
    ensure
      logger.info("Process for updating the locations is finished.")
    end

    def destroy_bulk
      logger.info("Start the process for delete the locations in a bulk.")

      location_ids = location_list_params.pluck("id")
      Location.transaction do
        logger.info("Deleting #{location_ids.size} locations.")
        Location.where(id: location_ids).delete_all
      end

      success_message = "Locations deleted successfully."
      logger.info(success_message)
      redirect_to admin_portal_locations_path, notice: success_message
    rescue => error
      base_error_message = "Failed to delete the locations."
      logger.error("#{base_error_message}: #{error&.message}")
      flash[:alert] = base_error_message

      redirect_to admin_portal_locations_path(delete: location_ids.join(","))
    ensure
      logger.info("Process for delete the locations is finished.")
    end

    def sync_data_master
      # Enqueue background job
      MasterDataSyncJob.perform_later(:locations, current_user&.id)

      redirect_to admin_portal_locations_path, notice: "Data sync is running in the background. You'll be notified when it's complete."
    end

    def sync_status
      # Ensure user is authenticated
      unless current_user
        render json: {status: :error, error: "Authentication required"}, status: :unauthorized
        return
      end

      status = SyncStatusService.get_latest_sync_status(:locations)

      if status
        # Clear the status after retrieving it to prevent repeated notifications
        # but only after successfully sending the response
        SyncStatusService.clear_sync_status(:locations)

        render json: {
          status: status[:status],
          message: status[:result][:message] || status[:result][:error],
          completed_at: status[:completed_at]
        }
      elsif SolidQueue::Job.where("job_class_name = ? AND finished_at IS NULL", "MasterDataSyncJob").exists?
        # Check if there are any jobs in the queue
        render json: {status: :running}
      else
        render json: {status: :idle}
      end
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
        location.permit(:id, :country, :country_code, :state, :city)
      end
    end
  end
end
