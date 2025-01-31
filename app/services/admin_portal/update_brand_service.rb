module AdminPortal
  class UpdateBrandService
    def initialize(service, params)
      @service = service
      @params = params
    end

    def call
      ActiveRecord::Base.transaction do
        update_service_details
        update_locations
        update_packages
      end
      true
    rescue => e
      @service.errors.add(:base, e.message)
      Rails.logger.error("Brand update failed: #{e.message}")
      false
    end

    private

    def update_service_details
      unless @service.update(service_params)
        raise ActiveRecord::Rollback, @service.errors.full_messages.to_sentence
      end
    end

    def update_locations
      locations_data = @params[:locations] || []
      updated_location_ids = locations_data.pluck(:id).compact

      # Remove locations not included in the update
      @service.location_services.where.not(location_id: updated_location_ids).destroy_all

      locations_data.each do |location_data|
        location = Location.find_by(city: location_data[:city])
        next unless location

        location_service = LocationService.find_or_initialize_by(location: location, service: @service)
        location_service.active = location_data[:active]
        unless location_service.save
          raise ActiveRecord::Rollback, "Failed to update locations: #{location_service.errors.full_messages.to_sentence}"
        end
      end
    end

    def update_packages
      packages_data = @params[:packages] || []
      updated_package_ids = packages_data.pluck(:id).compact

      # Remove packages not included in the update
      @service.packages.where.not(id: updated_package_ids).destroy_all

      packages_data.each do |package_data|
        package = @service.packages.find_or_initialize_by(id: package_data[:id])
        package.assign_attributes(package_data.except(:id))
        unless package.save
          raise ActiveRecord::Rollback, "Failed to update packages: #{package.errors.full_messages.to_sentence}"
        end
      end
    end

    def service_params
      @params.except(:locations, :packages)
    end
  end
end
