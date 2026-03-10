module AdminPortal
  module Therapists
    module BatchQueryHelper
      # Constants for bypassing specific filters
      ENABLE_SERVICE_FILTERING = false
      ENABLE_LOCATION_FILTERING = false
      ENABLE_AVAILABILITY_RULES_FILTERING = false

      # Fetch therapists in batches to improve performance
      #
      # IMPORTANT: There are TWO different appointment data usages:
      # 1. AVAILABILITY CHECKING (here): All appointments on date for conflict detection
      # 2. SUGGESTED THERAPISTS (in serialize): Only appointments from same series
      #
      # @param location [Location] The appointment location
      # @param service [Service] The service type
      # @param params [Hash] Query parameters (date/time, gender, employment_type, etc.)
      #   - :is_rescheduling [Boolean] Whether this is a rescheduling operation
      #   - :appointment_lat [Float] Appointment latitude for coordinate filtering
      #   - :appointment_lng [Float] Appointment longitude for coordinate filtering
      # @param formatter [Proc] Method to format therapist data
      # @param batch_size [Integer] Number of therapists to process per batch
      # @param current_appointment_id [Integer] Current appointment ID for updates
      # @return [Array] Formatted therapist data
      def filtered_therapists_in_batches(location:, service:, params:, formatter:, current_appointment_id: nil, batch_size: 100)
        # * Resolve location IDs - special case for Jakarta Pusat to allow all DKI Jakarta therapists
        # * This implements the business rule: "Allow Jakarta Pusat therapists for any DKI Jakarta location"
        location_ids =
          if ENABLE_LOCATION_FILTERING
            if location.city == "KOTA ADM. JAKARTA PUSAT"
              # When user requests Jakarta Pusat, include all DKI Jakarta locations
              # This allows therapists from any DKI Jakarta city to serve Jakarta Pusat appointments
              Location.where(state: "DKI JAKARTA").pluck(:id)
            else
              # For other locations, only use the specific location
              [location.id]
            end
          else
            # Location filtering disabled - include all locations
            nil
          end

        # Build base scope with necessary joins
        base_scope = Therapist
          .joins(:service, active_therapist_address: {address: :location})
          .joins("LEFT JOIN therapist_appointment_schedules ON therapists.id = therapist_appointment_schedules.therapist_id")
          .where(employment_status: "ACTIVE")

        # Apply gender filtering early at database level
        if params[:preferred_therapist_gender].present? && params[:preferred_therapist_gender] != "NO PREFERENCE"
          base_scope = base_scope.where(gender: params[:preferred_therapist_gender])
        end

        # Apply service filtering with SPECIAL_TIER logic using shared resolver
        if ENABLE_SERVICE_FILTERING
          original_service = service
          service = AdminPortal::SpecialTierServiceResolver.resolve_service_for_location(
            location: location,
            original_service: service
          )

          # Log if service was changed due to SPECIAL_TIER logic
          if service.id != original_service.id
            Rails.logger.info "[BatchQueryHelper] SPECIAL_TIER: Using service '#{service.name}' instead of '#{original_service.name}' for location '#{location.city}'"
          end

          base_scope = base_scope.where(services: {id: service.id})
        end

        # Apply employment type filter if specified
        base_scope = if params[:employment_type].present? && params[:employment_type] != "ALL"
          # When filtering by specific employment type, only apply that filter
          base_scope.where(employment_type: params[:employment_type])
        else
          # Check if this is rescheduling with coordinates 0,0
          is_rescheduling_with_zero_coords = params[:is_rescheduling] == true &&
            params[:appointment_lat]&.to_f == 0 &&
            params[:appointment_lng]&.to_f == 0

          if is_rescheduling_with_zero_coords
            # Saat rescheduling dengan koordinat 0,0, tampilkan SEMUA terapis aktif
            # Tanpa filter koordinat untuk FLAT atau KARPIS
            Rails.logger.info "[BatchQueryHelper] Rescheduling with 0,0 coords - showing ALL active therapists regardless of coordinates"
            base_scope
          else
            # Default behavior: show FLAT type OR therapists with coordinates
            base_scope.where(
              "therapists.employment_type = :flat OR (addresses.latitude <> 0 AND addresses.longitude <> 0)",
              flat: "FLAT"
            )
          end
        end

        # Filter therapists based on their availability rules and location
        if ENABLE_AVAILABILITY_RULES_FILTERING && ENABLE_LOCATION_FILTERING
          # Check if this is a Jabodetabek location to apply appropriate filtering rules
          # Jabodetabek includes: Jakarta, Bogor, Depok, Tangerang, Bekasi, Kepulauan Seribu
          jabodetabek_keywords = ["JAKARTA", "BOGOR", "DEPOK", "TANGERANG", "BEKASI", "KEPULAUAN SERIBU"]
          is_jabodetabek_location = jabodetabek_keywords.any? { |kw| location.city&.include?(kw) }

          # Get all Jabodetabek location IDs for filtering logic
          # Used to exclude Jabodetabek therapists when serving non-Jabodetabek locations
          jabodetabek_location_ids = Location.where(
            "city LIKE ANY (ARRAY[?])",
            jabodetabek_keywords.map { |kw| "%#{kw}%" }
          ).pluck(:id)

          # Filter therapists based on their availability rules and location
          base_scope = if is_jabodetabek_location
            # FOR JABODETABEK LOCATIONS: More permissive filtering
            # Business rule: Jabodetabek therapists can serve any Jabodetabek location
            # This SQL filter handles the following cases:
            # 1. No availability rules defined (NULL) - therapist is available everywhere
            # 2. Empty availability rules array ('[]') - therapist is available everywhere
            # 3. No location-specific rules exist in the array - therapist is available everywhere
            # 4. Therapist's address location matches one of the target location IDs (including Jakarta Pusat → all DKI Jakarta)
            # This ensures we only include therapists who can serve the requested Jabodetabek location
            base_scope.where(
              "(therapist_appointment_schedules.availability_rules IS NULL OR " \
              "therapist_appointment_schedules.availability_rules::text = '[]' OR " \
              "NOT EXISTS (SELECT 1 FROM json_array_elements(therapist_appointment_schedules.availability_rules) " \
              "WHERE value->>'location' = 'true') OR " \
              "addresses.location_id IN (?))",
              location_ids
            )
          else
            # FOR NON-JABODETABEK LOCATIONS: Stricter filtering
            # Business rule: Jabodetabek therapists should NOT serve non-Jabodetabek locations unless explicitly allowed
            # This ensures:
            # 1. Non-Jabodetabek therapists without location rules can serve any location
            # 2. Jabodetabek therapists are excluded UNLESS they have location rules that specifically include this location
            # 3. Therapists with address in the target location are always included
            base_scope.where(
              "(" \
              "  (addresses.location_id NOT IN (?) AND " \
              "   (therapist_appointment_schedules.availability_rules IS NULL OR " \
              "    therapist_appointment_schedules.availability_rules::text = '[]' OR " \
              "    NOT EXISTS (SELECT 1 FROM json_array_elements(therapist_appointment_schedules.availability_rules) " \
              "                WHERE value->>'location' = 'true'))) OR " \
              "  addresses.location_id IN (?)" \
              ")",
              jabodetabek_location_ids,
              location_ids
            )
          end
        end

        # Get total count for progress tracking
        total_count = base_scope.count
        results = []

        # Log initial batch processing info
        Rails.logger.info "[BatchQueryHelper] Starting batch processing - total_count: #{total_count}, batch_size: #{batch_size}"
        Rails.logger.info "[BatchQueryHelper] Location: #{location.city}, Service: #{ENABLE_SERVICE_FILTERING ? service.name : "All Services (filter disabled)"}"

        # Process in batches to reduce memory usage
        batch_offset = 0

        loop do
          # Get batch of therapist IDs
          therapist_ids = base_scope.limit(batch_size).offset(batch_offset).pluck(:id)
          break if therapist_ids.empty?

          # Load full therapist records for this batch with minimal includes
          # (schedules will be preloaded separately for availability checking)
          batch_therapists = Therapist
            .includes(
              active_address: :location
            )
            .where(id: therapist_ids)
            .to_a

          # Gender filtering already applied at database level, no need to filter here

          # Apply availability filtering if date/time specified
          batch_results = if params[:appointment_date_time].present?
            process_availability_for_batch(
              batch_therapists,
              params,
              formatter,
              current_appointment_id
            )
          else
            # If no date/time, just format all therapists
            batch_therapists.map { |therapist| formatter.call(therapist) }
          end

          results.concat(batch_results)

          # Log progress for large datasets
          Rails.logger.info "Processed #{batch_offset + therapist_ids.size}/#{total_count} therapists" if total_count > 500

          batch_offset += batch_size
        end

        # Log final results
        Rails.logger.info "[BatchQueryHelper] Completed batch processing - final results count: #{results.length}"
        Rails.logger.info "[BatchQueryHelper] Processed #{total_count} total therapists in #{(batch_offset.to_f / batch_size).ceil} batches"

        results
      end

      # Admin-specific therapist search - shows ALL active therapists with active users
      # This method bypasses coordinate filtering and other restrictions for admin internal use
      #
      # Usage Example:
      #   extend AdminPortal::Therapists::BatchQueryHelper
      #   filtered_therapists_for_admin(
      #     location: location,
      #     service: service,
      #     params: params.merge(
      #       employment_type: "ALL",
      #       preferred_therapist_gender: "NO PREFERENCE"
      #     ),
      #     formatter: method(:format_therapist),
      #     batch_size: 50
      #   )
      #
      # Key Features:
      # - Shows ALL active therapists with active users (no coordinate filtering)
      # - Bypasses location and availability rules filtering
      # - Gets availability details for slot information (but doesn't filter by availability)
      # - Still respects gender, service, and employment type filters
      # - Optimized batch processing for large datasets
      #
      # @param location [Location] The appointment location
      # @param service [Service] The service type
      # @param params [Hash] Query parameters (date/time, gender, employment_type, etc.)
      # @param formatter [Proc] Method to format therapist data
      # @param batch_size [Integer] Number of therapists to process per batch
      # @param current_appointment_id [Integer] Current appointment ID for updates
      # @return [Array] Formatted therapist data
      def filtered_therapists_for_admin(location:, service:, params:, formatter:, current_appointment_id: nil, batch_size: 100)
        Rails.logger.info "[BatchQueryHelper] Admin mode - showing ALL active therapists with active users"

        # Build base scope with necessary joins - include user status check
        base_scope = Therapist
          .joins(:service, :user, active_therapist_address: {address: :location})
          .joins("LEFT JOIN therapist_appointment_schedules ON therapists.id = therapist_appointment_schedules.therapist_id")
          .where(employment_status: "ACTIVE")
          .where("(users.suspend_at IS NULL OR users.suspend_at > NOW() OR (users.suspend_end IS NOT NULL AND users.suspend_end < NOW()))") # Only therapists with active users (not suspended)

        # Apply gender filtering early at database level
        if params[:preferred_therapist_gender].present? && params[:preferred_therapist_gender] != "NO PREFERENCE"
          base_scope = base_scope.where(gender: params[:preferred_therapist_gender])
        end

        # Apply service filtering with SPECIAL_TIER logic using shared resolver
        if ENABLE_SERVICE_FILTERING
          original_service = service
          service = AdminPortal::SpecialTierServiceResolver.resolve_service_for_location(
            location: location,
            original_service: service
          )

          # Log if service was changed due to SPECIAL_TIER logic
          if service.id != original_service.id
            Rails.logger.info "[BatchQueryHelper] Admin SPECIAL_TIER: Using service '#{service.name}' instead of '#{original_service.name}' for location '#{location.city}'"
          end

          base_scope = base_scope.where(services: {id: service.id})
        end

        # Apply employment type filter if specified
        if params[:employment_type].present? && params[:employment_type] != "ALL"
          base_scope = base_scope.where(employment_type: params[:employment_type])
        end

        # Skip location and availability rules filtering for admin mode
        # Admin can see all therapists regardless of location rules

        # Get total count for progress tracking
        total_count = base_scope.count
        results = []

        # Log initial batch processing info
        Rails.logger.info "[BatchQueryHelper] Admin mode - Starting batch processing - total_count: #{total_count}, batch_size: #{batch_size}"
        Rails.logger.info "[BatchQueryHelper] Admin mode - Location: #{location.city}, Service: #{ENABLE_SERVICE_FILTERING ? service.name : "All Services (filter disabled)"}"

        # Process in batches to reduce memory usage
        batch_offset = 0

        loop do
          # Get batch of therapist IDs
          therapist_ids = base_scope.limit(batch_size).offset(batch_offset).pluck(:id)
          break if therapist_ids.empty?

          # Load full therapist records for this batch with minimal includes
          batch_therapists = Therapist
            .includes(
              active_address: :location
            )
            .where(id: therapist_ids)
            .to_a

          # Apply availability filtering - REMOVED for admin mode
          # Admin should see all therapists regardless of availability
          # But we still need to get availability details for slot information
          batch_results = batch_therapists.map do |therapist|
            # Get availability details for slot information if date/time specified
            if params[:appointment_date_time].present?
              # Parse the appointment date/time
              appointment_date_time = if params[:appointment_date_time].is_a?(String)
                begin
                  Time.zone.parse(params[:appointment_date_time])
                rescue
                  params[:appointment_date_time].in_time_zone(Time.zone.name)
                end
              else
                params[:appointment_date_time]
              end

              # Get availability details for slot information
              details = therapist.availability_details(
                appointment_date_time_server_time: appointment_date_time,
                current_appointment_id: current_appointment_id,
                is_all_of_day: params[:is_all_of_day] || false
              )

              formatter.call(therapist, details)
            else
              # If no date/time, just format therapist without availability details
              formatter.call(therapist)
            end
          end

          results.concat(batch_results)

          # Log progress for large datasets
          Rails.logger.info "[BatchQueryHelper] Admin mode - Processed #{batch_offset + therapist_ids.size}/#{total_count} therapists" if total_count > 500

          batch_offset += batch_size
        end

        # Log final results
        Rails.logger.info "[BatchQueryHelper] Admin mode - Completed batch processing - final results count: #{results.length}"
        Rails.logger.info "[BatchQueryHelper] Admin mode - Processed #{total_count} total therapists in #{(batch_offset.to_f / batch_size).ceil} batches"

        results
      end

      private

      # Process availability checking for a batch of therapists
      def process_availability_for_batch(therapists, params, formatter, current_appointment_id)
        selected_appointment_date_time = params[:appointment_date_time]
        is_all_of_day = params[:is_all_of_day] || false

        # Parse the appointment date/time
        appointment_date_time =
          if selected_appointment_date_time.is_a?(String)
            begin
              Time.zone.parse(selected_appointment_date_time)
            rescue
              selected_appointment_date_time.in_time_zone(Time.zone.name)
            end
          else
            selected_appointment_date_time
          end

        # Preload appointments for all therapists in this batch with optimized query
        # Note: This is for AVAILABILITY CHECKING, not for suggested therapists
        # We need all appointments on this date to check for conflicts
        appointment_date = appointment_date_time.to_date
        therapist_ids = therapists.map(&:id)

        # Single query to get all relevant appointments with location data
        # Only include essential fields for availability checking
        all_appointments = Appointment
          .where(therapist_id: therapist_ids)
          .where(appointment_date_time: appointment_date.all_day)
          .where.not(status: ["CANCELLED", "UNSCHEDULED", "ON HOLD", "PENDING THERAPIST ASSIGNMENT"])
          .where.not(id: current_appointment_id)
          .select(:id, :therapist_id, :appointment_date_time, :status, :location_id, :registration_number, :visit_number) # Include visit_number for progress calculation
          .includes(:location)
          .group_by(&:therapist_id)

        # Preload therapist schedules to avoid N+1 queries
        therapist_schedules = TherapistAppointmentSchedule
          .where(therapist_id: therapist_ids)
          .includes(
            :therapist_weekly_availabilities,
            :therapist_adjusted_availabilities
          )
          .index_by(&:therapist_id)

        # Memoization cache for this batch
        availability_cache = {}

        therapists.filter_map do |therapist|
          cache_key = [therapist.id, appointment_date_time.to_s, is_all_of_day.to_s, current_appointment_id].join(":")

          # Use cached result or compute availability
          details = availability_cache[cache_key] ||= begin
            # Get preloaded appointments for this therapist
            therapist_appointments = all_appointments[therapist.id] || []

            # Get preloaded schedule for this therapist
            therapist_schedule = therapist_schedules[therapist.id]

            # Create singleton methods to access preloaded data
            therapist.define_singleton_method(:preloaded_appointments) { therapist_appointments }
            therapist.define_singleton_method(:therapist_appointment_schedule) { therapist_schedule }

            therapist.availability_details(
              appointment_date_time_server_time: appointment_date_time,
              current_appointment_id: current_appointment_id,
              is_all_of_day: is_all_of_day
            )
          end

          # Only include if available
          formatter.call(therapist, details) if details[:available]
        end
      end
    end
  end
end
