module AdminPortal
  class ServicesController < ApplicationController
    include ActionView::Helpers::NumberHelper
    before_action :get_service, only: %i[edit update destroy update_status]

    def index
      filter_by_status = params[:filter_by_status]
      filter_by_name = params[:name]
      selected_param = params[:delete] || params[:update_status]

      # get services
      services = Service
        .includes([:location_services, :packages])
        .all
        .where(
          if filter_by_status == "active"
            ["active IS NOT NULL AND active IS true"]
          else
            (filter_by_status == "inactive") ? ["active IS NULL OR active IS false"] :
                        nil
          end
        )
        .where(filter_by_name.present? ? ["name ILIKE ?", "%#{filter_by_name}%"] : nil)
        .sort_by { |item| item.active ? 1 : 0 }
        .reverse

      # get the selected service
      selected_service_lambda = lambda do
        selected_param ? service = Service.includes([:location_services, :packages]).find_by(id: selected_param) : nil
        service ? deep_transform_keys_to_camel_case(serialize_service(service)) : nil
      end

      render inertia: "AdminPortal/Service/Index", props: deep_transform_keys_to_camel_case({
        services: InertiaRails.defer {
          services.map do |service|
            deep_transform_keys_to_camel_case(serialize_service(service))
          end
        },
        selected_service: -> { selected_service_lambda.call }
      })
    end

    def create
      logger.info("Starting the process to create a new brand.")
      new_service = Service.new(create_service_params)
      if new_service.save
        success_message = "New brand with name #{new_service.name}, successfully created."
        logger.info(success_message)
        redirect_to admin_portal_services_path, notice: success_message
      else
        base_error_message = "Failed to create a new brand."
        error_message = new_service&.errors&.first&.full_message || base_error_message
        logger.error("#{base_error_message} Errors: #{error_message}")
        flash[:alert] = error_message
        redirect_to admin_portal_services_path, inertia: {
          errors: deep_transform_keys_to_camel_case(
            new_service.errors.to_hash.merge({full_messages: new_service.errors.full_messages})
          )
        }
      end
      logger.info("Create a new brand process finished.")
    end

    def edit
      # get the selected service
      get_service_lambda = lambda do
        service = Service.includes([:location_services, :packages]).find_by(id: params[:id])
        service ? deep_transform_keys_to_camel_case(serialize_service(service)) : nil
      end

      # get the location collections
      locations_lambda = lambda do
        Location.all.map { |data| deep_transform_keys_to_camel_case(data.as_json) }
      end

      render inertia: "AdminPortal/Service/Edit", props: {
        service: get_service_lambda.call,
        locations: locations_lambda.call
      }
    end

    def update
      logger.info("Starting the process to update brand.")

      update_service = UpdateBrandService.new(@service, update_service_params)

      if update_service.call
        logger.info("Successfully updated the brand with name #{@service.name}.")
        redirect_to admin_portal_services_path, notice: "Brand updated successfully."
      else
        error_messages = @service.errors.to_hash.merge({full_messages: @service.errors.full_messages})
        logger.error("Failed to update the brand with name #{@service.name}. Errors: #{error_messages}")
        flash[:alert] = "Brand update failed."

        redirect_to edit_admin_portal_service_path(@service), inertia: {
          errors: deep_transform_keys_to_camel_case(error_messages)
        }
      end

      logger.info("Update brand process finished.")
    end

    def destroy
      logger.info("Starting process to delete the brand.")

      @service.destroy
      success_message = "Successfully to delete the brand with name: #{@service.name}."
      logger.info(success_message)
      redirect_to admin_portal_services_path, notice: success_message

      logger.info("Delete the brand process finished.")
    end

    def update_status
      logger.info("Starting the process to update brand status.")

      # toggle the service status
      if @service.update(active: !@service.is_active?)
        success_message = "Successfully to #{@service.is_active? ? "activate" : "inactive"} the brand with name #{@service.name}."
        logger.info(success_message)
        redirect_to admin_portal_services_path, notice: success_message
      else
        base_error_message = "Failed to #{@service.is_active? ? "activate" : "inactive"} the brand with name #{@service.name}."
        error_message = @service&.errors&.first&.full_message || base_error_message
        logger.error("#{base_error_message} Errors: #{error_message}.")
        flash[:alert] = error_message
        redirect_to admin_portal_services_path(update_status: @service.id), inertia: {
          errors: deep_transform_keys_to_camel_case(
            @service.errors.to_hash.merge({full_messages: @service.errors.full_messages})
          )
        }
      end
      logger.info("Update brand status process finished.")
    end

    def sync_data_master
      result = MasterDataSyncService.new.brands_and_packages
      if result[:success]
        redirect_to admin_portal_services_path, notice: result[:message]
      else
        redirect_to admin_portal_services_path, alert: result[:error]
      end
    end

    private

    def get_service
      @service = Service.find(params[:id])

      # error if not found existing service
      unless @service
        error_message = "The existing brand could not be found."
        logger.error(error_message)
        flash[:alert] = error_message
        redirect_to admin_portal_services_path
      end
    end

    def serialize_service(service)
      is_admin = current_user&.admin.present?

      service.as_json.tap do |serialized_service|
        # flatten the location_services and their associated locations
        serialized_service["locations"] = service.location_services.map do |location_service|
          location_service.location.attributes.merge(active: location_service.active)
        end

        # include the packages
        packages_data = service.packages.map do |package|
          if is_admin
            package.attributes.merge(
              formatted_price_per_visit: package&.formatted_price_per_visit,
              formatted_total_price: package&.formatted_total_price,
              formatted_fee_per_visit: package&.formatted_fee_per_visit,
              formatted_total_fee: package&.formatted_total_fee,
              formatted_discount: package&.formatted_discount
            )
          else
            package.attributes.merge(
              formatted_price_per_visit: "****",
              formatted_total_price: "****",
              formatted_fee_per_visit: "****",
              formatted_total_fee: "****",
              formatted_discount: "****"
            )
          end
        end

        # get the prices total grouping by currencies
        packages_grouped_by_currency = service.packages.group_by(&:currency)
        total_prices = packages_grouped_by_currency.map do |currency, packages|
          total_price = packages.sum(&:total_price)
          total_fee = packages.sum(&:total_fee)

          if is_admin
            {
              currency: currency,
              total_price: total_price,
              formatted_total_price: number_to_currency(total_price, unit: currency, precision: 2, format: "%u %n"),
              total_fee: total_fee,
              formatted_total_fee: number_to_currency(total_fee, unit: currency, precision: 2, format: "%u %n")
            }
          else
            {
              currency: currency,
              total_price: nil,
              formatted_total_price: "****",
              total_fee: nil,
              formatted_total_fee: "****"
            }
          end
        end
        serialized_service["packages"] = {
          list: packages_data,
          total_prices:
        }
      end
    end

    def create_service_params
      params.require(:service).permit(:name, :description, :code, :active)
    end

    def update_service_params
      params.require(:service).permit(
        :name, :description, :code, :active,
        locations: [:id, :city, :active],
        packages: [:id, :active, :name, :currency, :number_of_visit, :price_per_visit, :fee_per_visit, :discount]
      )
    end
  end
end
