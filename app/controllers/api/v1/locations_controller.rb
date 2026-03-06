module Api
  module V1
    class LocationsController < ApplicationController
      include LocationsHelper

      # Skip authentication for API endpoints
      skip_before_action :authenticate_user!, only: [:index]
      skip_before_action :verify_authenticity_token, if: -> { request.format.json? }

      # Only respond to JSON
      before_action :ensure_json_request, only: [:index]

      # GET /api/v1/locations
      def index
        # Pagination parameters with defaults
        page = params.fetch(:page, 1).to_i
        limit = params.fetch(:limit, 10).to_i

        # Filter parameters
        filter_by_country = params[:country]
        filter_by_state = params[:state]
        filter_by_city = params[:city]

        # Build base query with filters
        locations = Location.all
        locations = locations.where("country ILIKE ?", "%#{filter_by_country}%") if filter_by_country.present?
        locations = locations.where("state ILIKE ?", "%#{filter_by_state}%") if filter_by_state.present?
        locations = locations.where("city ILIKE ?", "%#{filter_by_city}%") if filter_by_city.present?

        # Check if pagination parameters are provided
        if params[:page].present? || params[:limit].present?
          pagy, locations = pagy_array(locations, page: page, limit: limit)
          json_data = {
            data: locations.map { |location| serialize_location(location) },
            meta: pagy_metadata(pagy)
          }
        else
          json_data = {
            data: locations.map { |location| serialize_location(location) }
          }
        end

        # Include Indonesian areas if requested
        if params[:include_indonesian_areas] == "true"
          provinces = IndonesianArea.provinces.map { |province| deep_transform_keys_to_camel_case(province.as_json) }
          cities = IndonesianArea.cities.map { |city| deep_transform_keys_to_camel_case(city.as_json) }
          json_data[:indonesian_areas] = {provinces: provinces, cities: cities}
        end

        render json: json_data
      end

      private

      def ensure_json_request
        unless request.headers["Accept"]&.include?("application/json") || request.format.json?
          render json: {error: "API only accepts JSON requests"}, status: :not_acceptable
        end
      end
    end
  end
end
