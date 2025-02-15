module Api
  module V1
    class ServicesController < ApplicationController
      include ServicesHelper

      # GET /api/v1/services
      def index
        # Start with all services
        services = Service.all

        # Optionally filter by active status if provided (expects "active" or "inactive")
        filter_by_status = params[:status]
        if filter_by_status.present?
          services = services.where(
            if filter_by_status == "active"
              ["active IS NOT NULL AND active IS true"]
            else
              (filter_by_status == "inactive") ? ["active IS NULL OR active IS false"] : nil
            end
          )
        end

        # Optionally filter by a search query on the service name (case-insensitive)
        filter_by_query = params[:query]
        if filter_by_query.present?
          services = services.where("name ILIKE ?", "%#{filter_by_query}%")
        end

        # Filter by associated location ID
        if params[:location_id].present?
          # Assumes Service has_many :locations through location_services
          services = services.joins(:locations)
            .where(locations: {id: params[:location_id]})
        end

        # Filter by associated location city (case-insensitive)
        if params[:location_city].present?
          services = services.joins(:locations)
            .where("locations.city ILIKE ?", "%#{params[:location_city]}%")
        end

        # Check if pagination parameters are provided.
        page = params[:page]
        per_page = params[:per_page]
        if page.present? || per_page.present?
          per_page = per_page.present? ? per_page.to_i : 10

          # Paginate the services
          pagy, services = pagy(services.distinct, page:, limit: per_page)
          json_data = {data: mapping_services(services), meta: pagy_metadata(pagy)}
        else
          json_data = {data: mapping_services(services.distinct)}
        end

        # Render the JSON response
        render json: json_data
      end

      private

      # Map services to a structured format for JSON response
      def mapping_services(services)
        # Pass include_packages=true to include packages,
        # and include_locations=true to include location details.
        # and include_total_package_prices=true to include total package prices.
        include_locations = ActiveModel::Type::Boolean.new.cast(params[:include_locations])
        include_packages = ActiveModel::Type::Boolean.new.cast(params[:include_packages])
        include_total_package_prices = ActiveModel::Type::Boolean.new.cast(params[:include_total_package_prices])

        services.map do |service|
          deep_transform_keys_to_camel_case(serialize_service(service, {
            only: %i[id code active description name],
            include_locations:,
            only_location_services: %i[id country country_code state city],
            include_packages:,
            include_total_package_prices:
          }))
        end
      end
    end
  end
end
