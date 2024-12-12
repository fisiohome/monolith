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
          end,
        },
      })
    end

    private

    def serialize_location(location)
      location.as_json()
    end
  end
end
