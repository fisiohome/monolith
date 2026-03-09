# frozen_string_literal: true

module AdminPortal
  # Shared service to resolve SPECIAL_TIER service logic across different contexts
  # Eliminates code duplication between MasterDataSyncService and therapist search logic
  class SpecialTierServiceResolver
    # Brands that support SPECIAL_TIER services
    SPECIAL_TIER_BRANDS = ["FISIOHOME", "WICARAKU"].freeze

    class << self
      # Determine appropriate service name for location based on SPECIAL_TIER logic
      #
      # @param location [Location] The location object
      # @param original_service_name [String] The originally requested service name
      # @param location_services_cache [Hash, nil] Optional cache of location services (for sync operations)
      # @return [String] The appropriate service name to use
      def resolve_service_name_for_location(location:, original_service_name:, location_services_cache: nil)
        # Extract base brand name from service (remove _SPECIAL_TIER suffix if present)
        base_brand = extract_base_brand(original_service_name)

        return original_service_name unless SPECIAL_TIER_BRANDS.include?(base_brand)

        # Check if location has special tier service
        special_tier_service_name = "#{base_brand}_SPECIAL_TIER"

        # Use cache if provided (for sync operations), otherwise query directly
        location_service_names = if location_services_cache
          location_services_cache[location.id] || Set.new
        else
          location.services.pluck(:name).to_set
        end

        if location_service_names.include?(special_tier_service_name)
          # Use special tier service if location has it, regardless of original service
          return special_tier_service_name
        end

        # Return original service name if no special tier logic applies
        original_service_name
      end

      # Determine appropriate service for location based on SPECIAL_TIER logic
      # For therapist search operations that need Service object
      #
      # @param location [Location] The location object
      # @param original_service [Service] The originally requested service
      # @param location_services_cache [Hash, nil] Optional cache of location services (for sync operations)
      # @return [Service] The appropriate service to use
      def resolve_service_for_location(location:, original_service:, location_services_cache: nil)
        # Get the service name using the resolver logic
        service_name = resolve_service_name_for_location(
          location: location,
          original_service_name: original_service.name,
          location_services_cache: location_services_cache
        )

        # Find and return the Service object
        find_service_by_name(service_name) || original_service
      end

      # Extract base brand name from service name
      # Examples: "FISIOHOME_SPECIAL_TIER" -> "FISIOHOME", "FISIOHOME" -> "FISIOHOME"
      #
      # @param service_name [String] The service name
      # @return [String] The base brand name
      def extract_base_brand(service_name)
        # Remove _SPECIAL_TIER suffix if present
        base_brand = service_name.gsub("_SPECIAL_TIER", "")
        # Further extract just the brand name (FISIOHOME, WICARAKU) by splitting on underscore
        base_brand.split("_").first
      end

      # Check if a brand supports SPECIAL_TIER
      #
      # @param brand [String] The brand name to check
      # @return [Boolean] True if brand supports SPECIAL_TIER
      def special_tier_brand?(brand)
        base_brand = extract_base_brand(brand)
        SPECIAL_TIER_BRANDS.include?(base_brand)
      end

      # Get special tier service name for a brand
      #
      # @param brand [String] The base brand name
      # @return [String, nil] The special tier service name or nil if not supported
      def special_tier_service_name(brand)
        base_brand = extract_base_brand(brand)
        return nil unless SPECIAL_TIER_BRANDS.include?(base_brand)

        "#{base_brand}_SPECIAL_TIER"
      end

      private

      # Find service by name with active check
      # Can be overridden in different contexts (sync vs search)
      #
      # @param service_name [String] The service name to find
      # @return [Service, nil] The found service or nil
      def find_service_by_name(service_name)
        Service.find_by(name: service_name, active: true)
      end
    end
  end
end
