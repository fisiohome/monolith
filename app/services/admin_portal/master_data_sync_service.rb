# * PLEASE NOTE:
# * if sync data on admin portal data master spreadsheet
#  * must set general access spreadsheet file to "Anyone with the link" with permission "Editor".
#  * test file: test/services/admin_portal/master_data_sync_service_test.rb

module AdminPortal
  class MasterDataSyncService
    MASTER_DATA_URL = "https://docs.google.com/spreadsheets/d/1gERBdLgZPWrOF-rl5pXCx6mIyKOYi64KKbxjmxpTbvM/export?format=csv"
    LOCATION_GID = "0"
    ADMIN_GID = "1493117737"
    BRAND_GID = "2090364532"
    PACKAGE_GID = "872007576"
    THERAPIST_GID = Rails.env.development? ? "1510199675" : "887408989"
    THERAPIST_SCHEDULES_GID = "1843613331"
    THERAPIST_LEAVES_GID = "261776844"
    APPOINTMENT_GID = "350823925"

    def initialize(user = nil)
      @current_user = user
    end

    def locations
      csv = fetch_and_parse_csv(gid: LOCATION_GID)
      headers = ["Country", "Country Code", "State/Province", "City"]
      required_headers = headers.dup

      # Validate headers
      missing_headers = required_headers - csv.headers
      unless missing_headers.empty?
        return {success: false, error: "CSV headers are incorrect. Missing: #{missing_headers.join(", ")}"}
      end

      # Track results
      results = {created: [], updated: [], unchanged: [], skipped: [], failed: []}

      # Process locations in batches
      total_rows = csv.count
      processed_rows = 0
      batch_count = 0

      csv.each_slice(SyncConfig::BATCH_SIZE) do |batch_rows|
        batch_count += 1

        # Monitor memory usage if enabled
        check_memory_usage if SyncConfig::ENABLE_MEMORY_MONITORING

        ActiveRecord::Base.transaction do
          batch_rows.each do |row|
            country, country_code, state, city = headers.map { |key| row[key]&.strip }

            if [country, country_code, state, city].any?(&:blank?)
              results[:skipped] << {city: city || "blank", reason: "Missing required fields"}
              next
            end

            begin
              # Create or find location
              location = Location.create_or_find_by(city:, state:, country_code:) do |loc|
                loc.country = country
              end

              # Track if it was created or found
              if location.previously_new_record?
                results[:created] << {city:, state:, country:}
              elsif location.saved_change_to_country?
                # Check if it was updated
                changes = format_changes([location])
                results[:updated] << {city:, state:, country:, changes: changes}
              else
                results[:unchanged] << {city:, state:}
              end
            rescue => e
              results[:failed] << {city:, state:, error: e.message}
              Rails.logger.error "Failed to sync location '#{city}, #{state}': #{e.message}"
            end
          end # end batch_rows.each
        end # end transaction

        processed_rows += batch_rows.count

        # Log progress if enabled
        if SyncConfig::ENABLE_PROGRESS_LOGGING && batch_count % SyncConfig::PROGRESS_LOG_INTERVAL == 0
          progress = (processed_rows.to_f / total_rows * 100).round(1)
          Rails.logger.info "Locations sync progress: #{processed_rows}/#{total_rows} (#{progress}%) - Batch #{batch_count}"
        end

        # Small delay between batches to prevent overwhelming the server
        sleep(SyncConfig::BATCH_DELAY) if SyncConfig::BATCH_DELAY > 0
      end # end each_slice batch

      # Build detailed message
      created_count = results[:created].count
      updated_count = results[:updated].count
      unchanged_count = results[:unchanged].count
      skipped_count = results[:skipped].count
      failed_count = results[:failed].count

      log_message = "Processed #{csv.count} locations: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."
      if created_count > 0
        created_reasons = results[:created].map { |c| "#{c[:city] || c[:state]} (#{c[:country]})" }.join(", ")
        log_message += " Created: #{created_reasons}."
      end
      if updated_count > 0
        updated_details = results[:updated].map do |u|
          changes_str = format_changes_for_log(u[:changes])
          "#{u[:city] || u[:state]} (#{changes_str})"
        end.join(", ")
        log_message += " Updated: #{updated_details}."
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].map { |s| "#{s[:city] || s[:state]} (#{s[:reason]})" }.join(", ")
        log_message += " Skipped: #{skip_reasons}."
      end
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:city] || f[:state]} (#{f[:error]})" }.join(", ")
        log_message += " Failed: #{failure_reasons}."
      end

      message = "Processed #{csv.count} locations: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing locations: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results: {}}
    end

    def admins_data
      csv = fetch_and_parse_csv(gid: ADMIN_GID)
      headers = ["Name",	"Email", "Type"]
      required_headers = headers.dup

      # Validate headers
      missing_headers = required_headers - csv.headers
      unless missing_headers.empty?
        return {success: false, error: "CSV headers are incorrect. Missing: #{missing_headers.join(", ")}"}
      end

      # Track results
      results = {created: [], updated: [], unchanged: [], skipped: [], failed: []}

      # Process admins in batches
      total_rows = csv.count
      processed_rows = 0
      batch_count = 0

      csv.each_slice(SyncConfig::BATCH_SIZE) do |batch_rows|
        batch_count += 1

        # Monitor memory usage if enabled
        check_memory_usage if SyncConfig::ENABLE_MEMORY_MONITORING

        ActiveRecord::Base.transaction do
          batch_rows.each do |row|
            name, email, admin_type = headers.map { |key| row[key]&.strip }
            email = email.downcase
            status = row["Status"]&.strip&.upcase.presence || "INACTIVE"

            if [name, email, admin_type].any?(&:blank?)
              results[:skipped] << {email: email || "blank", reason: "Missing required fields"}
              next
            end

            begin
              # Create or update user
              user = User.find_or_initialize_by(email:)
              user_created = user.new_record?
              user.password = "Fisiohome123!" if user.new_record?

              # Handle suspension based on Status column
              if status == "ACTIVE"
                user.suspend_at = nil
                user.suspend_end = nil
              elsif user.suspend_at.nil?
                user.suspend_at = Time.current
              end
              # Suspend user if not already suspended

              user.save! if user.changed?

              # Create or update admin
              admin = Admin.find_or_initialize_by(user_id: user.id)
              admin_created = admin.new_record?
              admin.name = name
              admin.admin_type = admin_type.tr(" ", "_")
              admin.save! if admin.changed?

              # Track successful operations
              if admin_created || user_created
                results[:created] << {name:, email:, admin_type:, status:}
              elsif admin.changed? || user.changed?
                # Collect all changes
                changes = format_changes([user, admin])
                results[:updated] << {name:, email:, admin_type:, status:, changes: changes}
              else
                results[:unchanged] << {name:, email:}
              end
            rescue => e
              results[:failed] << {name:, email:, error: e.message}
              Rails.logger.error "Failed to sync admin '#{email}': #{e.message}"
            end
          end # end batch_rows.each
        end # end transaction

        processed_rows += batch_rows.count

        # Log progress if enabled
        if SyncConfig::ENABLE_PROGRESS_LOGGING && batch_count % SyncConfig::PROGRESS_LOG_INTERVAL == 0
          progress = (processed_rows.to_f / total_rows * 100).round(1)
          Rails.logger.info "Admins sync progress: #{processed_rows}/#{total_rows} (#{progress}%) - Batch #{batch_count}"
        end

        # Small delay between batches to prevent overwhelming the server
        sleep(SyncConfig::BATCH_DELAY) if SyncConfig::BATCH_DELAY > 0
      end # end each_slice batch

      # Build detailed message
      created_count = results[:created].count
      updated_count = results[:updated].count
      unchanged_count = results[:unchanged].count
      skipped_count = results[:skipped].count
      failed_count = results[:failed].count

      log_message = "Processed #{csv.count} admins: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."
      if created_count > 0
        created_reasons = results[:created].map { |c| "#{c[:name]} (#{c[:email]})" }.join(", ")
        log_message += " Created: #{created_reasons}."
      end
      if updated_count > 0
        updated_details = results[:updated].map do |u|
          changes_str = format_changes_for_log(u[:changes])
          "#{u[:name]} (#{changes_str})"
        end.join(", ")
        log_message += " Updated: #{updated_details}."
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].group_by { |s| s[:reason] }
          .map { |reason, items|
            emails = items.map(&->(i) { i[:email] })
            "#{items.count} #{reason}: #{emails.join(", ")}"
          }.join(", ")
        log_message += " Skipped: #{skip_reasons}."
      end
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:email]} (#{f[:error]})" }.join(", ")
        log_message += " Failed: #{failure_reasons}."
      end

      message = "Processed #{csv.count} admins: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing admins: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results: {}}
    end

    def brands_and_packages
      brands_result = brands
      return brands_result unless brands_result[:success]

      packages_result = packages
      return packages_result unless packages_result[:success]

      # Extract counts from results
      brands_created = brands_result.dig(:results, :created)&.count || 0
      brands_updated = brands_result.dig(:results, :updated)&.count || 0
      brands_unchanged = brands_result.dig(:results, :unchanged)&.count || 0
      brands_skipped = brands_result.dig(:results, :skipped)&.count || 0
      brands_failed = brands_result.dig(:results, :failed)&.count || 0
      brands_total = brands_created + brands_updated + brands_unchanged + brands_skipped + brands_failed

      packages_created = packages_result.dig(:results, :created)&.count || 0
      packages_updated = packages_result.dig(:results, :updated)&.count || 0
      packages_unchanged = packages_result.dig(:results, :unchanged)&.count || 0
      packages_skipped = packages_result.dig(:results, :skipped)&.count || 0
      packages_failed = packages_result.dig(:results, :failed)&.count || 0
      packages_total = packages_created + packages_updated + packages_unchanged + packages_skipped + packages_failed

      # Build comprehensive UI message with row counts
      message = "Processed #{brands_total} brands: #{brands_created} created, #{brands_updated} updated, #{brands_unchanged} unchanged, #{brands_skipped} skipped, #{brands_failed} failed. "
      message += "Processed #{packages_total} packages: #{packages_created} created, #{packages_updated} updated, #{packages_unchanged} unchanged, #{packages_skipped} skipped, #{packages_failed} failed."

      # Combine messages for logging (with full details)
      log_message = "#{brands_result[:log_message]} #{packages_result[:log_message]}"

      # Combine results
      combined_results = {
        brands: brands_result[:results] || {},
        packages: packages_result[:results] || {}
      }

      Rails.logger.info "Brands and packages sync completed. #{log_message}"
      {success: true, message:, results: combined_results}
    rescue => e
      {success: false, error: "Sync failed: #{e.message}"}
    end

    def brands
      csv = fetch_and_parse_csv(gid: BRAND_GID)
      headers = ["Name", "Code", "Description", "Locations"]
      required_headers = headers.dup

      # Validate headers
      missing_headers = required_headers - csv.headers
      unless missing_headers.empty?
        return {success: false, error: "CSV headers are incorrect. Missing: #{missing_headers.join(", ")}"}
      end

      # Track results
      results = {created: [], updated: [], unchanged: [], skipped: [], failed: []}

      # Process brands in batches
      total_rows = csv.count
      processed_rows = 0
      batch_count = 0

      csv.each_slice(SyncConfig::BATCH_SIZE) do |batch_rows|
        batch_count += 1

        # Monitor memory usage if enabled
        check_memory_usage if SyncConfig::ENABLE_MEMORY_MONITORING

        ActiveRecord::Base.transaction do
          batch_rows.each do |row|
            name, code, description, locations = headers.map { |key| row[key]&.strip }
            next if [name, code].any?(&:blank?)

            begin
              normalized_name = name.upcase.tr(" ", "_")
              service = Service.find_or_initialize_by(name: normalized_name)
              is_new = service.new_record?
              service.description = description if service.new_record?
              service.save! if service.changed?

              # Sync associated locations
              location_names = locations.to_s.split(",").map(&:strip).compact_blank

              location_names.each do |city_name|
                location = Location.find_by(city: city_name)
                unless location
                  Rails.logger.warn "Location '#{city_name}' not found, skipping."
                  next
                end

                location_service = LocationService.find_or_initialize_by(service_id: service.id, location_id: location.id)
                location_service.active = true if location_service.new_record?
                location_service.save! if location_service.changed?
              end

              # Track successful operations
              if is_new
                results[:created] << {name:, code:}
              elsif service.saved_changes.any?
                changes = format_changes([service])
                results[:updated] << {name:, code:, changes: changes}
              else
                results[:unchanged] << {name:, code:}
              end
            rescue => e
              results[:failed] << {name:, code:, error: e.message}
              Rails.logger.error "Failed to sync brand '#{name}': #{e.message}"
            end
          end # end batch_rows.each
        end # end transaction

        processed_rows += batch_rows.count

        # Log progress if enabled
        if SyncConfig::ENABLE_PROGRESS_LOGGING && batch_count % SyncConfig::PROGRESS_LOG_INTERVAL == 0
          progress = (processed_rows.to_f / total_rows * 100).round(1)
          Rails.logger.info "Brands sync progress: #{processed_rows}/#{total_rows} (#{progress}%) - Batch #{batch_count}"
        end

        # Small delay between batches to prevent overwhelming the server
        sleep(SyncConfig::BATCH_DELAY) if SyncConfig::BATCH_DELAY > 0
      end # end each_slice batch

      # Build detailed message
      created_count = results[:created].count
      updated_count = results[:updated].count
      unchanged_count = results[:unchanged].count
      skipped_count = results[:skipped].count
      failed_count = results[:failed].count

      log_message = "Processed #{csv.count} brands: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."
      if created_count > 0
        created_reasons = results[:created].map { |c| "#{c[:name]} (#{c[:code]})" }.join(", ")
        log_message += " Created: #{created_reasons}."
      end
      if updated_count > 0
        updated_details = results[:updated].map do |u|
          changes_str = format_changes_for_log(u[:changes])
          "#{u[:name]} (#{changes_str})"
        end.join(", ")
        log_message += " Updated: #{updated_details}."
      end
      if skipped_count > 0
        skipped_reasons = results[:skipped].map { |s| "#{s[:name]} (#{s[:reason]})" }.join(", ")
        log_message += " Skipped: #{skipped_reasons}."
      end
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:name]} (#{f[:error]})" }.join(", ")
        log_message += " Failed: #{failure_reasons}."
      end

      message = "Processed #{csv.count} brands: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing brands: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message}
    end

    def packages
      csv = fetch_and_parse_csv(gid: PACKAGE_GID)
      required_headers = ["Brand", "Nama Product/Paket"]
      headers = required_headers.dup + ["Jumlah Visit",	"Harga/Visit",	"Total Harga",	"Diskon RO/FUM",	"Harga setelah discount",	"Fee Flat/Visit", "Total Fee", "Currency"]

      # Validate headers
      missing_headers = required_headers - csv.headers
      unless missing_headers.empty?
        return {success: false, error: "CSV headers are incorrect. Missing: #{missing_headers.join(", ")}"}
      end

      # Track results
      results = {created: [], updated: [], unchanged: [], skipped: [], failed: []}

      # Process packages in batches
      total_rows = csv.count
      processed_rows = 0
      batch_count = 0

      csv.each_slice(SyncConfig::BATCH_SIZE) do |batch_rows|
        batch_count += 1

        # Monitor memory usage if enabled
        check_memory_usage if SyncConfig::ENABLE_MEMORY_MONITORING

        ActiveRecord::Base.transaction do
          batch_rows.each do |row|
            brand_name, package_name = headers.map { |key| row[key]&.strip }
            next if [brand_name, package_name].any?(&:blank?)

            begin
              normalized_name = brand_name&.upcase&.tr(" ", "_")
              service = Service.find_by(name: normalized_name)

              unless service
                Rails.logger.warn "Service for brand '#{brand_name}' not found, skipping."
                next
              end

              package_attrs = {
                name: package_name,
                number_of_visit: row["Jumlah Visit"]&.strip&.to_i || 1,
                price_per_visit: row["Harga/Visit"]&.strip&.to_s&.delete(",").to_d || 0,
                discount: row["Diskon RO/FUM"]&.strip&.to_s&.delete(",").to_d || 0,
                total_price: row["Total Harga"]&.strip&.to_s&.delete(",").to_d || 0,
                fee_per_visit: row["Fee Flat/Visit"]&.strip&.to_s&.delete(",").to_d || 0,
                total_fee: row["Total Fee"]&.strip&.to_s&.delete(",").to_d || 0,
                currency: row["Currency"]&.strip,
                active: true
              }
              package = Package.find_or_initialize_by(service_id: service.id, name: package_name)
              is_new = package.new_record?
              package.assign_attributes(package_attrs)
              package.save! if package.changed?

              # Track successful operations
              if is_new
                results[:created] << {brand: brand_name, package: package_name}
              elsif package.saved_changes.any?
                changes = format_changes([package])
                results[:updated] << {brand: brand_name, package: package_name, changes: changes}
              else
                results[:unchanged] << {brand: brand_name, package: package_name}
              end
            rescue => e
              results[:failed] << {brand: brand_name, package: package_name, error: e.message}
              Rails.logger.error "Failed to sync package '#{package_name}' for brand '#{brand_name}': #{e.message}"
            end
          end # end batch_rows.each
        end # end transaction

        processed_rows += batch_rows.count

        # Log progress if enabled
        if SyncConfig::ENABLE_PROGRESS_LOGGING && batch_count % SyncConfig::PROGRESS_LOG_INTERVAL == 0
          progress = (processed_rows.to_f / total_rows * 100).round(1)
          Rails.logger.info "Packages sync progress: #{processed_rows}/#{total_rows} (#{progress}%) - Batch #{batch_count}"
        end

        # Small delay between batches to prevent overwhelming the server
        sleep(SyncConfig::BATCH_DELAY) if SyncConfig::BATCH_DELAY > 0
      end # end each_slice batch

      # Build detailed message
      created_count = results[:created].count
      updated_count = results[:updated].count
      unchanged_count = results[:unchanged].count
      skipped_count = results[:skipped].count
      failed_count = results[:failed].count

      log_message = "Processed #{csv.count} packages: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."
      if created_count > 0
        created_reasons = results[:created].map { |c| "#{c[:brand]} - #{c[:package]}" }.join(", ")
        log_message += " Created: #{created_reasons}."
      end
      if updated_count > 0
        updated_details = results[:updated].map do |u|
          changes_str = format_changes_for_log(u[:changes])
          "#{u[:brand]} - #{u[:package]} (#{changes_str})"
        end.join(", ")
        log_message += " Updated: #{updated_details}."
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].group_by { |s| s[:reason] }
          .map { |reason, items| "#{items.count} #{reason}" }
          .join(", ")
        log_message += " Skipped: #{skip_reasons}."
      end
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:package]} (#{f[:error]})" }.join(", ")
        log_message += " Failed: #{failure_reasons}."
      end

      message = "Processed #{csv.count} packages: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing packages: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message}
    end

    def therapists(employment_type_filter: "KARPIS")
      # Process therapists CSV
      csv = fetch_and_parse_csv(gid: THERAPIST_GID)
      required_therapist_headers = ["Name", "Email", "Phone Number", "Gender", "Employment Type", "City", "Address Line", "Brand"]
      validate_headers(csv, required_therapist_headers)

      # Build ignoring_loc_rules map for use in therapist_schedules
      @ignoring_loc_rules_map = csv.each_with_object({}) do |row, hash|
        name = row["Name"]&.strip
        ignoring_loc_rules = normalize_boolean(row["Ignoring Location Rules"])
        hash[name] = ignoring_loc_rules if name.present?
      end

      # Track results
      results = {created: [], updated: [], unchanged: [], skipped: [], skipped_other_type: [], failed: []}

      # Pre-load frequently accessed data to reduce queries
      services = Service.all.index_by(&:name)
      locations = Location.all.index_by(&:city)

      # Pre-load location-services mapping for special tier detection
      location_services = LocationService.joins(:service)
        .pluck(:location_id, "services.name")
        .group_by(&:first)
        .transform_values { |pairs| Set.new(pairs.map(&:last)) }

      # Process therapists in batches to manage memory usage
      total_rows = csv.count
      processed_rows = 0
      batch_count = 0

      csv.each_slice(SyncConfig::BATCH_SIZE) do |batch_rows|
        batch_count += 1

        # Monitor memory usage if enabled
        check_memory_usage if SyncConfig::ENABLE_MEMORY_MONITORING

        batch_rows.each do |row|
          name = row["Name"]&.strip
          email = row["Email"]&.strip&.downcase
          employment_type = row["Employment Type"]&.strip&.upcase

          # Skip therapists with employment types other than the filter
          if employment_type != employment_type_filter
            results[:skipped_other_type] << {name:, email:, reason: "#{employment_type} employment type (filtering for #{employment_type_filter})"}
            next
          end

          # validate the therapist basic information data
          if [name, email].any?(&:blank?)
            results[:skipped] << {name:, email:, reason: "Blank name and email"}
            next
          end

          city = row["City"]&.strip
          location = locations[city]
          unless location
            results[:skipped] << {name:, email:, reason: "Location for city '#{city}' not found"}
            next
          end

          # Determine service based on location's service relationships
          brand = row["Brand"]&.strip&.upcase&.tr(" ", "_")
          service = nil

          # Extract base brand name (remove _SPECIAL_TIER suffix if present)
          base_brand = brand.gsub("_SPECIAL_TIER", "")
          # Further extract just the brand name (FISIOHOME, WICARAKU) by splitting on underscore
          base_brand = base_brand.split("_").first

          if ["FISIOHOME", "WICARAKU"].include?(base_brand)
            # Check if location has special tier service
            special_tier_service_name = "#{base_brand}_SPECIAL_TIER"
            location_service_names = location_services[location.id] || Set.new

            if location_service_names.include?(special_tier_service_name)
              # Use special tier service if location has it, regardless of CSV brand value
              service = services[special_tier_service_name]
              unless service
                results[:skipped] << {name:, email:, reason: "Special tier service '#{special_tier_service_name}' not found for location '#{city}'"}
                next
              end
            else
              # Location doesn't have special tier, use basic service
              service = services[base_brand]
              unless service
                results[:skipped] << {name:, email:, reason: "Basic service for brand '#{base_brand}' not found for location '#{city}'"}
                next
              end
            end
          else
            # For other brands, use their basic service
            service = services[base_brand]
            unless service
              results[:skipped] << {name:, email:, reason: "Service for brand '#{base_brand}' not found"}
              next
            end
          end

          # define the coordinates
          lat_raw = row["Latitude"]&.strip&.tr(",", ".")
          lng_raw = row["Longitude"]&.strip&.tr(",", ".")
          latitude = Float(lat_raw.presence || 0)
          longitude = Float(lng_raw.presence || 0)

          # Parse bank details for later use (uppercase to match DB storage)
          bank_name = row["Bank Name"]&.strip&.to_s&.upcase
          account_number = row["Account Number"]&.strip&.to_s
          account_holder_name = row["Account Holder Name"]&.strip&.to_s&.upcase

          begin
            action = :updated

            ActiveRecord::Base.transaction do
              # Create or update User
              user = User.find_or_initialize_by(email:)
              if user.new_record?
                user.password = "Fisiohome123!"
                user.save!
              end

              # Create or update Address
              address_line = row["Address Line"]&.strip&.to_s
              postal_code = row["Postal Code"]&.strip.presence
              address = Address.find_or_initialize_by(location:, address: address_line)
              address_attrs = {latitude:, longitude:}
              address_attrs[:postal_code] = postal_code if postal_code
              address.assign_attributes(address_attrs)
              address.save! if address.changed? || address.new_record?

              # Create or update BankDetail
              bank_detail = nil
              if bank_name.present? && account_number.present?
                bank_detail = BankDetail.find_or_create_by!(bank_name:, account_number:) do |bd|
                  bd.account_holder_name = account_holder_name
                end
                # Update account holder name if it changed
                if bank_detail.account_holder_name != account_holder_name
                  bank_detail.update!(account_holder_name:)
                end
              end

              # Create or update Therapist
              phone_number = "+#{row["Phone Number"]&.strip&.to_s}"
              gender = (row["Gender"]&.strip&.upcase == "L") ? "MALE" : "FEMALE"
              batch = row["Batch"]&.strip&.to_i
              modalities = row["Modalities"]&.strip&.to_s&.split(/\s*(?:dan|,)\s*/i)&.map(&:strip)&.compact_blank || []
              specializations = row["Specializations"]&.strip&.to_s&.split(/\s*(?:dan|,)\s*/i)&.map(&:strip)&.compact_blank || []
              employment_status = normalize_status(row["Status"])

              # Normalize Telegram ID
              telegram_id_raw = row["Telegram ID"]&.strip
              telegram_id = normalize_telegram_id(telegram_id_raw) if telegram_id_raw.present?
              # Ensure empty telegram_id is nil, not empty string
              telegram_id = nil if telegram_id.blank?

              # Parse contract period
              contract_start_date = nil
              contract_end_date = nil
              contract_period = row["Contract Period"]&.strip

              if contract_period.present?
                # Handle both single date and date range (with or without spaces)
                if contract_period.include?("-")
                  # Date range: "02/04/2026 - 02/04/2027" or "02/04/2026-02/04/2027"
                  start_date_str, end_date_str = contract_period.split(/-\s*/).map(&:strip)
                  begin
                    contract_start_date = Date.strptime(start_date_str, "%d/%m/%Y") if start_date_str.present?
                    contract_end_date = Date.strptime(end_date_str, "%d/%m/%Y") if end_date_str.present?
                  rescue => e
                    Rails.logger.warn "Invalid date format in Contract Period '#{contract_period}' for #{name}: #{e.message}"
                  end
                else
                  # Single date: "02/04/2026"
                  begin
                    contract_start_date = Date.strptime(contract_period, "%d/%m/%Y")
                  rescue => e
                    Rails.logger.warn "Invalid date format in Contract Period '#{contract_period}' for #{name}: #{e.message}"
                  end
                end
              end

              therapist = Therapist.find_or_initialize_by(name:, gender:)
              therapist.assign_attributes(
                employment_type:,
                employment_status:,
                batch:,
                modalities:,
                specializations:,
                service:,
                user:,
                phone_number:,
                telegram_id:,
                contract_start_date:,
                contract_end_date:
              )
              if therapist.new_record?
                action = :created
                therapist.save!
              elsif therapist.changed?
                therapist.save!
              else
                action = :unchanged
              end

              # Link or create TherapistAddress (one active per therapist)
              therapist_address = TherapistAddress.find_or_initialize_by(therapist:, address:)
              therapist_address.active = true if therapist_address.new_record?
              therapist_address.save! if therapist_address.changed?

              # Link or create TherapistBankDetail (one active per therapist)
              therapist_bank_detail = TherapistBankDetail.find_or_initialize_by(therapist:, bank_detail:)
              therapist_bank_detail.active = true if therapist_bank_detail.new_record?
              therapist_bank_detail.save! if therapist_bank_detail.changed?

              # Track successful operations
              if action == :created
                results[:created] << {name:, email:}
              elsif action == :updated
                # Collect all changes from therapist and associated records
                changes = format_changes([therapist, user, therapist_address, address, bank_detail, therapist_bank_detail])
                results[:updated] << {name:, email:, changes: changes}
              elsif action == :unchanged
                results[:unchanged] << {name:, email:}
              end
            end
          rescue ActiveRecord::Rollback
            # Rollback is expected for skipped records, don't add to failed
            next
          rescue => e
            results[:failed] << {name:, email:, error: e.message}
            next
          end
        end # end batch_rows.each

        processed_rows += batch_rows.count

        # Log progress if enabled
        if SyncConfig::ENABLE_PROGRESS_LOGGING && batch_count % SyncConfig::PROGRESS_LOG_INTERVAL == 0
          progress = (processed_rows.to_f / total_rows * 100).round(1)
          Rails.logger.info "Sync progress: #{processed_rows}/#{total_rows} (#{progress}%) - Batch #{batch_count}"
        end

        # Small delay between batches to prevent overwhelming the server
        sleep(SyncConfig::BATCH_DELAY) if SyncConfig::BATCH_DELAY > 0
      end # end each_slice batch

      # build results summary
      created_count = results[:created].count
      updated_count = results[:updated].count
      unchanged_count = results[:unchanged].count
      skipped_count = results[:skipped].count
      skipped_other_type_count = results[:skipped_other_type].count
      failed_count = results[:failed].count
      # Total count is all rows of the filtered employment type (excludes other employment types)
      total_count = csv.count - skipped_other_type_count

      type_label = (employment_type_filter == "FLAT") ? Therapist::EMPLOYMENT_TYPE_LABELS.find { |t| t.key == "FLAT" }&.title_id : Therapist::EMPLOYMENT_TYPE_LABELS.find { |t| t.key == "KARPIS" }&.title_id
      log_message = "Processed #{total_count} #{type_label} therapists: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."
      if created_count > 0
        created_reasons = results[:created].map { |c| "#{c[:name]} (#{c[:email]})" }.join(", ")
        log_message += " Created: #{created_reasons}."
      end
      if updated_count > 0
        updated_details = results[:updated].map do |u|
          changes_str = format_changes_for_log(u[:changes])
          "#{u[:name]} (#{changes_str})"
        end.join(", ")
        log_message += " Updated: #{updated_details}."
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].group_by { |s| s[:reason] }
          .map { |reason, items| "#{items.count} #{reason}" }
          .join(", ")
        log_message += " Skipped: #{skip_reasons}."
      end
      if skipped_other_type_count > 0
        log_message += " Skipped (other employment type): #{skipped_other_type_count}."
      end
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:name]} (#{f[:error]})" }.join(", ")
        log_message += " Failed: #{failure_reasons}."
      end

      message = "Processed #{total_count} #{type_label} therapists: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:, total_count:}
    rescue => e
      error_message = "Error syncing therapists: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results:}
    end

    def therapist_schedules(employment_type_filter: nil, use_ramadan_time: false)
      # Process therapist_schedules CSV
      schedules_csv = fetch_and_parse_csv(gid: THERAPIST_SCHEDULES_GID)
      required_schedule_headers = ["Therapist", "Day of Week", "Start Time", "End Time"]
      validate_headers(schedules_csv, required_schedule_headers)

      # Pre-group schedules by therapist name for faster lookup
      grouped_schedules = schedules_csv.group_by { |row| row["Therapist"]&.strip }

      # Use ignoring_loc_rules_map from therapists method if available, otherwise fetch
      ignoring_loc_rules_map = @ignoring_loc_rules_map || begin
        therapist_csv = fetch_and_parse_csv(gid: THERAPIST_GID)
        therapist_csv.each_with_object({}) do |row, hash|
          name = row["Name"]&.strip
          ignoring_loc_rules = normalize_boolean(row["Ignoring Location Rules"])
          hash[name] = ignoring_loc_rules if name.present?
        end
      end

      # Track results
      results = {schedule_updated: [], unchanged: [], skipped: [], failed: [], schedules_created: []}

      # Get all therapists (including those without schedules)
      all_therapists = Therapist.includes(:user, active_address: :location)
      all_therapists = all_therapists.where(employment_type: employment_type_filter) if employment_type_filter.present?

      jabodetabek_keywords = ["JAKARTA", "BOGOR", "DEPOK", "TANGERANG", "BEKASI", "KEPULAUAN SERIBU"]

      # Process therapists in batches
      total_rows = all_therapists.count
      processed_rows = 0
      batch_count = 0

      all_therapists.each_slice(SyncConfig::BATCH_SIZE) do |batch_therapists|
        batch_count += 1

        # Monitor memory usage if enabled
        check_memory_usage if SyncConfig::ENABLE_MEMORY_MONITORING

        ActiveRecord::Base.transaction do
          batch_therapists.each do |therapist|
            name = therapist.name
            email = therapist.user&.email

            # Skip only inactive therapists
            skip_reason = "Inactive therapist, schedule removed" if therapist.employment_status == "INACTIVE"

            # Get or create schedule
            schedule_record = TherapistAppointmentSchedule.find_or_initialize_by(therapist:)

            # If skip reason, remove schedule if it exists
            if skip_reason
              if schedule_record.persisted?
                schedule_record.destroy
                results[:schedule_updated] << {name:, email:, reason: skip_reason}
              else
                results[:skipped] << {name:, email:, reason: skip_reason}
              end
              next
            end

            therapist_location = therapist.active_address&.location
            is_in_jabodetabek = jabodetabek_keywords.any? { |kw| therapist_location&.city&.include?(kw) }
            is_flat_jabodetabek = therapist.employment_type == "FLAT" && is_in_jabodetabek

            # Create new schedule if it doesn't exist
            if schedule_record.new_record?
              schedule_record.assign_attributes(
                appointment_duration_in_minutes: 90,
                buffer_time_in_minutes: 30,
                max_advance_booking_in_days: 60,
                min_booking_before_in_hours: 24,
                available_now: true
              )
              # Set default rules if not present
              if schedule_record.availability_rules.blank? || schedule_record.availability_rules == {}
                # Start with default rules
                rules = TherapistAppointmentSchedule::DEFAULT_AVAILABILITY_RULES.dup

                if is_flat_jabodetabek
                  rules = []
                elsif therapist.employment_type == "FLAT"
                  # Always remove distance and duration rules for FLAT outside Jabodetabek
                  rules = rules.reject { |rule|
                    rule.key?("distance_in_meters") || rule.key?(:distance_in_meters) ||
                      rule.key?("duration_in_minutes") || rule.key?(:duration_in_minutes)
                  }
                end

                # Apply ignoring_loc_rules_map for location rule
                if !is_flat_jabodetabek && ignoring_loc_rules_map[name]
                  # Remove location rule if ignoring
                  rules = rules.reject { |rule| rule.key?("location") || rule.key?(:location) }
                end

                schedule_record.availability_rules = rules
              end
              schedule_record.save!
              results[:schedules_created] << {name:, email:}
            end

            begin
              schedule_updated = false
              ActiveRecord::Base.transaction do
                # Update availability_rules based on employment type and ignoring_loc_rules flag for existing schedules
                should_ignore_location = ignoring_loc_rules_map[name]
                current_rules = schedule_record.availability_rules || []
                has_location_rule = current_rules.any? { |rule| rule.key?("location") || rule.key?(:location) }
                has_distance_rule = current_rules.any? { |rule| rule.key?("distance_in_meters") || rule.key?(:distance_in_meters) }
                has_duration_rule = current_rules.any? { |rule| rule.key?("duration_in_minutes") || rule.key?(:duration_in_minutes) }

                rules_updated = false
                new_rules = current_rules.dup

                if is_flat_jabodetabek
                  if new_rules.present?
                    new_rules = []
                    rules_updated = true
                  end
                elsif therapist.employment_type == "FLAT"
                  if has_distance_rule || has_duration_rule
                    new_rules = new_rules.reject { |rule|
                      rule.key?("distance_in_meters") || rule.key?(:distance_in_meters) ||
                        rule.key?("duration_in_minutes") || rule.key?(:duration_in_minutes)
                    }
                    rules_updated = true
                  end
                end

                # Apply ignoring_loc_rules_map for location rule
                unless is_flat_jabodetabek
                  if should_ignore_location && has_location_rule
                    # Remove location rule if ignoring
                    new_rules = new_rules.reject { |rule| rule.key?("location") || rule.key?(:location) }
                    rules_updated = true
                  elsif !should_ignore_location && !has_location_rule && new_rules.present?
                    # Add location rule back if not ignoring and it's missing
                    new_rules += [{"location" => true}]
                    rules_updated = true
                  end
                end

                if rules_updated
                  schedule_record.availability_rules = new_rules
                  schedule_record.save! if schedule_record.changed?
                  schedule_updated = true
                end

                # Apply custom schedule or default
                existing_availabilities_scope = TherapistWeeklyAvailability.where(therapist_appointment_schedule_id: schedule_record.id)
                if grouped_schedules.key?(name)
                  # Group by day first
                  grouped_schedules[name].group_by { |r| r["Day of Week"]&.strip }.each do |day, rows|
                    # Get existing schedule for this day
                    day_scope = existing_availabilities_scope.where(day_of_week: day)

                    # Check for OFF day
                    is_off_day = rows.any? { |row| row["Start Time"]&.strip&.upcase == "OFF" || row["End Time"]&.strip&.upcase == "OFF" }
                    if is_off_day
                      # Only destroy if slots exist
                      if day_scope.exists?
                        day_scope.destroy_all
                        schedule_updated = true
                      end
                      next
                    end

                    # Prepare new schedule data
                    new_slots = rows.map do |row|
                      start = row["Start Time"]&.strip
                      end_time = row["End Time"]&.strip
                      next if start.blank? || end_time.blank?
                      next if start.casecmp("OFF").zero? || end_time.casecmp("OFF").zero?

                      {
                        start_time: start.in_time_zone(Time.zone),
                        end_time: end_time.in_time_zone(Time.zone)
                      }
                    end.compact

                    # Compare with existing schedule for comparing changes of the schedule
                    existing_set = day_scope.pluck(:start_time, :end_time).map { |start_time, end_time|
                      [start_time.strftime("%H:%M").in_time_zone(Time.zone), end_time.strftime("%H:%M").in_time_zone(Time.zone)]
                    }.to_set
                    new_set = new_slots.map { |a| [a[:start_time], a[:end_time]] }.to_set

                    # Check if schedule has changed
                    if existing_set != new_set
                      # Destroy existing and create new slots
                      day_scope.destroy_all
                      new_slots.each do |slot|
                        TherapistWeeklyAvailability.create!(
                          therapist_appointment_schedule_id: schedule_record.id,
                          day_of_week: day,
                          start_time: slot[:start_time],
                          end_time: slot[:end_time]
                        )
                      end
                      schedule_updated = true
                    end
                  end
                else
                  # Reset existing weekday availabilities (if any)
                  weekdays = %w[Monday Tuesday Wednesday Thursday Friday]
                  if therapist.employment_type == "FLAT"
                    default_start_time = "05:00".in_time_zone(Time.zone)
                    default_end_time = "22:00".in_time_zone(Time.zone)
                  elsif use_ramadan_time
                    default_start_time = "08:00".in_time_zone(Time.zone)
                    default_end_time = "17:00".in_time_zone(Time.zone)
                  else
                    default_start_time = "09:00".in_time_zone(Time.zone)
                    default_end_time = "18:00".in_time_zone(Time.zone)
                  end

                  # Fetch existing weekday availabilities
                  existing_weekday_availabilities = existing_availabilities_scope.where(day_of_week: weekdays)

                  # Build sets for comparison
                  existing_set = existing_weekday_availabilities.pluck(:day_of_week, :start_time, :end_time).map { |day, start_time, end_time|
                    [day, start_time.strftime("%H:%M"), end_time.strftime("%H:%M")]
                  }.to_set
                  default_set = weekdays.map { |day|
                    [day, default_start_time.strftime("%H:%M"), default_end_time.strftime("%H:%M")]
                  }.to_set

                  # Only reset if there's a difference
                  if existing_set != default_set
                    # Remove old records
                    existing_weekday_availabilities.destroy_all

                    # Create default records
                    weekdays.each do |day|
                      TherapistWeeklyAvailability.create!(
                        therapist_appointment_schedule_id: schedule_record.id,
                        day_of_week: day,
                        start_time: default_start_time,
                        end_time: default_end_time
                      )
                    end

                    schedule_updated = true
                  end
                end
              end

              # Track schedule updates
              if schedule_updated
                changes = format_changes([schedule_record])
                results[:schedule_updated] << {name:, email:, changes: changes}
              else
                results[:unchanged] << {name:, email:}
              end
            rescue => e
              results[:failed] << {name:, email:, error: e.message}
            end
          end # end batch_therapists.each
        end # end transaction

        processed_rows += batch_therapists.count

        # Log progress if enabled
        if SyncConfig::ENABLE_PROGRESS_LOGGING && batch_count % SyncConfig::PROGRESS_LOG_INTERVAL == 0
          progress = (processed_rows.to_f / total_rows * 100).round(1)
          Rails.logger.info "Therapist schedules sync progress: #{processed_rows}/#{total_rows} (#{progress}%) - Batch #{batch_count}"
        end

        # Small delay between batches to prevent overwhelming the server
        sleep(SyncConfig::BATCH_DELAY) if SyncConfig::BATCH_DELAY > 0
      end # end each_slice batch

      # Return results
      schedule_updated_count = results[:schedule_updated].count
      unchanged_count = results[:unchanged].count
      skipped_count = results[:skipped].count
      failed_count = results[:failed].count
      schedules_created_count = results[:schedules_created].count

      # Total count is all therapists processed (from database query)
      total_count = total_rows
      log_message = "Processed #{total_count} therapist schedules: #{schedules_created_count} created, #{schedule_updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."
      if schedules_created_count > 0
        created_reasons = results[:schedules_created].map { |c| c[:name].to_s }.join(", ")
        log_message += " Created: #{created_reasons}."
      end
      if schedule_updated_count > 0
        updated_details = results[:schedule_updated].map do |u|
          changes_str = format_changes_for_log(u[:changes])
          "#{u[:name]} (#{changes_str})"
        end.join(", ")
        log_message += " Updated: #{updated_details}."
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].group_by { |s| s[:reason] }
          .map { |reason, items| "#{items.count} #{reason}" }
          .join(", ")
        log_message += " Skipped: #{skip_reasons}."
      end
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:name]} (#{f[:error]})" }.join(", ")
        log_message += " Failed: #{failure_reasons}."
      end

      message = "Processed #{total_count} therapist schedules: #{schedules_created_count} created, #{schedule_updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:, total_count:}
    rescue => e
      error_message = "Error syncing therapist schedules: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results:}
    end

    def therapists_and_schedules(employment_type_filter: "KARPIS", use_ramadan_time: false)
      # First sync therapists (this builds @ignoring_loc_rules_map)
      therapist_result = therapists(employment_type_filter:)
      return therapist_result unless therapist_result[:success]

      # Then sync schedules for the requested employment type (uses @ignoring_loc_rules_map)
      schedule_result = therapist_schedules(employment_type_filter:, use_ramadan_time:)
      return schedule_result unless schedule_result[:success]

      # Extract counts from results
      therapists_created = therapist_result.dig(:results, :created)&.count || 0
      therapists_updated = therapist_result.dig(:results, :updated)&.count || 0
      therapists_unchanged = therapist_result.dig(:results, :unchanged)&.count || 0
      therapists_failed = therapist_result.dig(:results, :failed)&.count || 0
      therapists_skipped = therapist_result.dig(:results, :skipped)&.count || 0
      therapists_total = therapist_result[:total_count] || 0

      type_label = (employment_type_filter == "FLAT") ? Therapist::EMPLOYMENT_TYPE_LABELS.find { |t| t.key == "FLAT" }&.title_id : Therapist::EMPLOYMENT_TYPE_LABELS.find { |t| t.key == "KARPIS" }&.title_id

      schedules_created = schedule_result.dig(:results, :schedules_created)&.count || 0
      schedules_updated = schedule_result.dig(:results, :schedule_updated)&.count || 0
      schedules_unchanged = schedule_result.dig(:results, :unchanged)&.count || 0
      schedules_failed = schedule_result.dig(:results, :failed)&.count || 0
      schedules_skipped = schedule_result.dig(:results, :skipped)&.count || 0
      schedules_total = schedule_result[:total_count] || 0

      # Build comprehensive UI message with row counts
      message = "Processed #{therapists_total} #{type_label} therapists: #{therapists_created} created, #{therapists_updated} updated, #{therapists_unchanged} unchanged, #{therapists_skipped} skipped, #{therapists_failed} failed. "
      message += "Processed #{schedules_total} schedules: #{schedules_created} created, #{schedules_updated} updated, #{schedules_unchanged} unchanged, #{schedules_skipped} skipped, #{schedules_failed} failed."

      # Combine messages for logging (with full details)
      log_message = therapist_result[:log_message].to_s
      log_message += " #{schedule_result[:log_message]}"

      # Combine results
      combined_results = {
        therapists: therapist_result[:results] || {},
        schedules: schedule_result[:results] || {}
      }

      Rails.logger.info "#{type_label} therapists sync completed. #{log_message}"
      {success: true, message:, log_message:, results: combined_results}
    rescue => e
      error_message = "Error syncing therapists and schedules: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results:}
    end

    def therapist_leaves
      # Process therapist leaves CSV
      csv = fetch_and_parse_csv(gid: THERAPIST_LEAVES_GID)
      required_headers = ["Therapist", "Leave Date"]
      validate_headers(csv, required_headers)

      # Track results
      results = {created: [], updated: [], unchanged: [], skipped: [], failed: []}

      # Process leaves in batches
      total_rows = csv.count
      processed_rows = 0
      batch_count = 0

      csv.each_slice(SyncConfig::BATCH_SIZE) do |batch_rows|
        batch_count += 1

        # Monitor memory usage if enabled
        check_memory_usage if SyncConfig::ENABLE_MEMORY_MONITORING

        ActiveRecord::Base.transaction do
          batch_rows.each do |row|
            therapist_name = row["Therapist"]&.strip
            leave_date_raw = row["Leave Date"]&.strip
            reason = row["Reason"]&.strip

            # Skip rows without therapist name or leave date
            if therapist_name.blank? || leave_date_raw.blank?
              results[:skipped] << {name: therapist_name, reason: "Missing therapist name or leave date"}
              next
            end

            begin
              # Parse the leave date
              leave_date = begin
                Date.strptime(leave_date_raw, "%d-%m-%Y")
              rescue Date::Error
                nil
              end

              unless leave_date
                results[:skipped] << {name: therapist_name, date: leave_date_raw, reason: "Invalid date format (expected DD-MM-YYYY)"}
                next
              end

              # Skip past dates
              if leave_date < Date.current
                results[:skipped] << {name: therapist_name, date: leave_date_raw, reason: "Past date"}
                next
              end

              # Find the therapist
              therapist = Therapist.find_by(name: therapist_name)
              unless therapist
                results[:skipped] << {name: therapist_name, date: leave_date_raw, reason: "Therapist not found"}
                next
              end

              # Find the therapist's schedule
              schedule = TherapistAppointmentSchedule.find_by(therapist: therapist)
              unless schedule
                results[:skipped] << {name: therapist_name, date: leave_date_raw, reason: "Therapist has no appointment schedule"}
                next
              end

              # Always full-day leave (start_time and end_time are nil)
              ActiveRecord::Base.transaction do
                adjusted = TherapistAdjustedAvailability.find_or_initialize_by(
                  therapist_appointment_schedule: schedule,
                  specific_date: leave_date,
                  start_time: nil,
                  end_time: nil
                )

                adjusted.reason = reason if reason.present?
                action = adjusted.new_record? ? :created : :updated

                if adjusted.new_record? || adjusted.changed?
                  adjusted.save!
                  changes = format_changes([adjusted])
                  results[action] << {name: therapist_name, date: leave_date_raw, reason: reason, changes: changes}
                else
                  results[:unchanged] << {name: therapist_name, date: leave_date_raw}
                end
              end
            rescue => e
              results[:failed] << {name: therapist_name, date: leave_date_raw, error: e.message}
            end
          end # end batch_rows.each
        end # end transaction

        processed_rows += batch_rows.count

        # Log progress if enabled
        if SyncConfig::ENABLE_PROGRESS_LOGGING && batch_count % SyncConfig::PROGRESS_LOG_INTERVAL == 0
          progress = (processed_rows.to_f / total_rows * 100).round(1)
          Rails.logger.info "Therapist leaves sync progress: #{processed_rows}/#{total_rows} (#{progress}%) - Batch #{batch_count}"
        end

        # Small delay between batches to prevent overwhelming the server
        sleep(SyncConfig::BATCH_DELAY) if SyncConfig::BATCH_DELAY > 0
      end # end each_slice batch

      # Build results summary
      created_count = results[:created].count
      updated_count = results[:updated].count
      unchanged_count = results[:unchanged].count
      skipped_count = results[:skipped].count
      failed_count = results[:failed].count

      log_message = "Processed #{csv.count} therapist leaves: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."
      if created_count > 0
        created_reasons = results[:created].map { |c| "#{c[:name]} (#{c[:date]})" }.join(", ")
        log_message += " Created: #{created_reasons}."
      end
      if updated_count > 0
        updated_details = results[:updated].map do |u|
          changes_str = format_changes_for_log(u[:changes])
          "#{u[:name]} (#{u[:date]}) - #{changes_str}"
        end.join(", ")
        log_message += " Updated: #{updated_details}."
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].group_by { |s| s[:reason] }
          .map { |reason, items|
            items.map { |s| "#{s[:name]} (#{reason})" }.join(", ")
          }
          .join(", ")
        log_message += " Skipped: #{skip_reasons}."
      end
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:name]} (#{f[:error]})" }.join(", ")
        log_message += " Failed: #{failure_reasons}."
      end

      message = "Processed #{csv.count} therapist leaves: #{created_count} created, #{updated_count} updated, #{unchanged_count} unchanged, #{skipped_count} skipped, #{failed_count} failed."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing therapist leaves: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results:}
    end

    def appointments
      # process appointments csv
      csv = fetch_and_parse_csv(gid: APPOINTMENT_GID)
      required_headers = [
        "Contact Name", "Contact Number", "Email", "Patient Full Name", "DOB", "Age",
        "Gender", "Condition", "Complaint Description", "Region", "Address Line", "Latitude",	"Longitude",
        "Brand",	"Package",	"Preferred Therapist Gender", "Visit Date", "Visit Time",	"Therapist", "PIC"
      ]
      validate_headers(csv, required_headers)

      # Pre-load all lookup data to avoid N+1 queries
      services = Service.all.index_by(&:name)
      packages = Package.includes(:service).index_by { |p| "#{p.service.name}_#{p.name}" }
      therapists = Therapist.all.index_by(&:name)
      locations = Location.all.index_by(&:city)
      admins = Admin.all.index_by { |a| a.name.downcase }

      # Create a composite key for lookup
      composite_keys = csv.map do |r|
        [r["Reg Number"]&.strip, r["Visit Number"]&.strip&.to_i]
      end.compact.uniq

      # Fetch existing appointments using composite keys
      existing_appointments = Appointment.where("(registration_number, visit_number) IN (?)", composite_keys)
        .index_by { |a| [a.registration_number, a.visit_number] }

      # track results
      results = {created: [], updated: [], skipped: [], failed: [], unchanged: []}

      # Group and sort once
      grouped_batch = csv.group_by { |row| row["Batch Number"]&.strip }

      batch_first_appointment_ids = {}

      # Process in batches to manage memory
      total_rows = csv.count
      processed_rows = 0
      batch_count = 0

      grouped_batch.each_slice(SyncConfig::BATCH_SIZE) do |batch_groups|
        batch_count += 1

        # Monitor memory usage if enabled
        check_memory_usage if SyncConfig::ENABLE_MEMORY_MONITORING

        ActiveRecord::Base.transaction do
          batch_groups.each do |batch_number, rows|
            sorted_rows = rows.sort_by { |r| r["Visit Number"]&.strip&.to_i || 0 }

            sorted_rows.each do |row|
              registration_number = row["Reg Number"]&.strip

              # validate service
              brand = row["Brand"]&.strip&.upcase&.tr(" ", "_")
              service = services[brand]
              unless service
                results[:skipped] << {
                  registration_number: registration_number,
                  reason: "Service for brand '#{brand}' not found"
                }
                next
              end

              # validate package
              package_key = "#{brand}_#{row["Package"]&.strip}"
              package = packages[package_key]
              unless package
                results[:skipped] << {
                  registration_number: registration_number,
                  reason: "Package '#{row["Package"]&.strip}' not found for brand '#{brand}'"
                }
                next
              end

              # validate therapist
              therapist_name = row["Therapist"]&.strip
              therapist = therapists[therapist_name] if therapist_name.present?
              if therapist.blank? && therapist_name.present?
                results[:skipped] << {
                  registration_number: registration_number,
                  reason: "Therapist '#{therapist_name}' not found"
                }
                next
              end

              # validate admin
              admin_name = row["PIC"]&.strip&.downcase
              admin = admins[admin_name] if admin_name.present?
              if admin.blank? && admin_name.present?
                results[:skipped] << {
                  registration_number: registration_number,
                  reason: "Admin with name '#{admin_name}' not found"
                }
                next
              end

              # validate location
              city = row["Region"]&.strip
              location = locations[city]
              unless location
                results[:skipped] << {
                  registration_number: registration_number,
                  reason: "Location for city '#{city}' not found"
                }
                next
              end

              # validate coordinates
              lat_raw = row["Latitude"]&.strip&.tr(",", ".")
              lng_raw = row["Longitude"]&.strip&.tr(",", ".")
              latitude = Float(lat_raw.presence || 0)
              longitude = Float(lng_raw.presence || 0)
              coordinates_valid = !(latitude.abs > 90 || longitude.abs > 180 || [latitude, longitude].all?(&:zero?))
              unless coordinates_valid
                results[:skipped] << {
                  registration_number: registration_number,
                  reason: "Invalid coordinates"
                }
                next
              end

              # validate date/time
              visit_date = row["Visit Date"]&.strip
              visit_time = row["Visit Time"]&.strip
              appointment_date_time = begin
                Time.zone.strptime("#{visit_date} #{visit_time}", "%m/%d/%Y %H:%M:%S")
              rescue
                nil
              end
              unless appointment_date_time
                results[:skipped] << {
                  registration_number:,
                  reason: "Invalid Visit Date or Visit Time format"
                }
                next
              end

              # parse DOB
              dob_str = row["DOB"]&.strip
              dob = dob_str.present? ? Date.strptime(dob_str, "%m-%d-%Y") : nil

              visit_number = row["Visit Number"]&.strip&.to_i
              fisiohome_partner_name = row["Partner Booking (Optional)"]&.strip
              extracted_data = {
                service:,
                package:,
                therapist:,
                admin:,
                location:,
                visit_number:,
                contact_data: {
                  email: row["Email"]&.strip&.downcase,
                  contact_phone: row["Contact Number"]&.strip,
                  contact_name: row["Contact Name"]&.strip,
                  miitel_link: row["MiiTel Link (Optional)"]&.strip
                },
                patient_data: {
                  name: row["Patient Full Name"]&.strip,
                  date_of_birth: dob,
                  gender: row["Gender"]&.strip
                },
                address_data: {
                  location:,
                  latitude:,
                  longitude:,
                  postal_code: row["Postal Code (Optional)"]&.strip,
                  address: row["Address Line"]&.strip,
                  notes: row["Address Notes (Optional)"]&.strip
                },
                appointment_data: {
                  visit_number:,
                  appointment_date_time:,
                  # status: row["Status"]&.strip,
                  preferred_therapist_gender: row["Preferred Therapist Gender"]&.strip,
                  referral_source: row["Referral Source (Optional)"]&.strip,
                  fisiohome_partner_booking: fisiohome_partner_name.present?,
                  fisiohome_partner_name:,
                  voucher_code: row["Voucher Code (Optional)"]&.strip,
                  notes: row["Notes (Optional)"]&.strip,
                  status_reason: "FROM MATERI MITRA SPREADSHEET"
                },
                medical_data: {
                  condition: row["Condition"]&.strip,
                  complaint_description: row["Complaint Description"]&.strip,
                  illness_onset_date: row["Illness Onset Date (Optional)"]&.strip,
                  medical_history: row["Medical History (Optional)"]&.strip
                }
              }

              begin
                ActiveRecord::Base.transaction do
                  # * process patient contact
                  contact_data = extracted_data[:contact_data]
                  contact_attrs_prior = {email: contact_data[:email], contact_phone: contact_data[:contact_phone]}
                  contact_attrs = {contact_name: contact_data[:contact_name], miitel_link: contact_data[:miitel_link]}
                  contact = PatientContact.find_or_initialize_by(contact_attrs_prior)
                  contact.assign_attributes(contact_attrs)
                  unless contact.valid?
                    raise ActiveRecord::Rollback, contact.errors.full_messages.join(", ")
                  end
                  contact.save! if contact.new_record? || contact.changed?

                  # * process patient profile
                  patient_data = extracted_data[:patient_data].merge(patient_contact: contact)
                  patient_attrs_prior = {
                    name: patient_data[:name],
                    date_of_birth: patient_data[:date_of_birth],
                    gender: patient_data[:gender]
                  }
                  patient = Patient.find_or_initialize_by(patient_attrs_prior)
                  patient.assign_attributes(patient_contact: patient_data[:patient_contact])
                  unless patient.valid?
                    raise ActiveRecord::Rollback, patient.errors.full_messages.join(", ")
                  end
                  patient.save! if patient.new_record? || patient.changed?

                  # * process address
                  address_data = extracted_data[:address_data]
                  address = Address.find_or_initialize_by(
                    location: address_data[:location],
                    latitude: address_data[:latitude],
                    longitude: address_data[:longitude]
                  )
                  address.assign_attributes(
                    postal_code: address_data[:postal_code],
                    address: address_data[:address],
                    notes: address_data[:notes]
                  )
                  unless address.valid?
                    raise ActiveRecord::Rollback, address.errors.full_messages.join(", ")
                  end
                  address.save! if address.new_record? || address.changed?

                  # * process patient address
                  patient_address = patient.patient_addresses.find_or_initialize_by(address: address)
                  patient_address.assign_attributes(active: true) if patient_address.new_record?
                  patient_address.save! if patient_address.changed?

                  # * process appointment
                  appointment_data = extracted_data[:appointment_data].merge(
                    registration_number: registration_number,
                    patient_id: patient.id,
                    service_id: extracted_data[:service].id,
                    package_id: extracted_data[:package].id,
                    location_id: extracted_data[:location].id,
                    therapist_id: extracted_data[:therapist]&.id
                  )
                  existing_appointment = existing_appointments[[registration_number, visit_number]]
                  # Add reference to first appointment in batch if needed
                  if visit_number > 1 && batch_first_appointment_ids[batch_number].present?
                    appointment_data[:appointment_reference_id] = batch_first_appointment_ids[batch_number]
                  end

                  if existing_appointment
                    # Update existing appointment
                    attrs_to_update = appointment_data.except(:registration_number)

                    # Check if any attributes actually changed
                    attributes_changed = attrs_to_update.any? do |key, value|
                      value = value.downcase.tr(" ", "_") if key == :status
                      existing_appointment.send(key) != value
                    end

                    if attributes_changed
                      existing_appointment.update_columns(attrs_to_update.merge(updated_at: Time.current).compact!)
                      appointment = existing_appointment
                      action = :updated
                    else
                      appointment = existing_appointment
                      action = :unchanged
                    end
                  else
                    # Create new appointment
                    appointment = Appointment.new(appointment_data.merge(
                      created_at: Time.current,
                      updated_at: Time.current
                    ))

                    Appointment.insert_all([appointment.attributes.compact])
                    created_appointment = Appointment.find_by(registration_number: appointment_data[:registration_number])

                    appointment = created_appointment
                    action = :created
                  end

                  # Store first appointment ID for batch reference
                  if extracted_data[:visit_number] == 1
                    batch_first_appointment_ids[batch_number] = appointment.id
                  end

                  # * process medical records
                  medical_data = extracted_data[:medical_data]
                  patient_medical = PatientMedicalRecord.find_or_initialize_by(appointment: appointment)
                  patient_medical.assign_attributes(medical_data)
                  unless patient_medical.valid?
                    raise ActiveRecord::Rollback, patient_medical.errors.full_messages.join(", ")
                  end
                  patient_medical.save! if patient_medical.changed? || patient_medical.new_record?

                  # * process admin pics
                  admin_to_assign = extracted_data[:admin] || @current_user.admin
                  admin_pic = AppointmentAdmin.find_or_initialize_by(appointment: appointment)
                  admin_pic.assign_attributes(admin: admin_to_assign)
                  admin_pic.save! if admin_pic.changed? || admin_pic.new_record?

                  # * snapshot the address history
                  appt_address_history = AppointmentAddressHistory.find_or_initialize_by(appointment:)
                  appt_address_history.assign_attributes(
                    location: address_data[:location],
                    latitude: address_data[:latitude],
                    longitude: address_data[:longitude],
                    address_line: address_data[:address],
                    postal_code: address_data[:postal_code],
                    notes: address_data[:notes]
                  )
                  appt_address_history.save! if appt_address_history.changed? || appt_address_history.new_record?

                  # * snapshot the package history
                  appt_package_history = AppointmentPackageHistory.find_or_initialize_by(appointment:)
                  appt_package_history.assign_attributes(
                    package:,
                    name: package.name,
                    currency: package.currency,
                    number_of_visit: package.number_of_visit,
                    price_per_visit: package.price_per_visit,
                    discount: package.discount,
                    total_price: package.total_price,
                    fee_per_visit: package.fee_per_visit,
                    total_fee: package.total_fee
                  )
                  appt_package_history.save! if appt_package_history.changed? || appt_package_history.new_record?

                  # * snapshot the status history
                  appointment.update_column(:status, row["Status"]&.strip)
                  appt_status_history = AppointmentStatusHistory.find_or_initialize_by(appointment:)
                  appt_status_history.assign_attributes(
                    old_status: "UNSCHEDULED",
                    new_status: row["Status"]&.strip,
                    reason: "FROM MATERI MITRA SPREADSHEET",
                    changed_by: @current_user.id
                  )
                  appt_status_history.save! if appt_status_history.changed? || appt_status_history.new_record?

                  results[action] << {registration_number: registration_number}
                end
              rescue => e
                results[:failed] << {registration_number:, error: e.message}
              end
            end
            processed_rows += rows.count
          end # end batch_groups.each
        end # end transaction

        # Log progress if enabled
        if SyncConfig::ENABLE_PROGRESS_LOGGING && batch_count % SyncConfig::PROGRESS_LOG_INTERVAL == 0
          progress = (processed_rows.to_f / total_rows * 100).round(1)
          Rails.logger.info "Appointments sync progress: #{processed_rows}/#{total_rows} (#{progress}%) - Batch #{batch_count}"
        end

        # Small delay between batches to prevent overwhelming the server
        sleep(SyncConfig::BATCH_DELAY) if SyncConfig::BATCH_DELAY > 0
      end # end each_slice batch

      # build results summary
      created_count = results[:created].count
      updated_count = results[:updated].count
      skipped_count = results[:skipped].count
      failed_count = results[:failed].count
      unchanged_count = results[:unchanged].count
      total_count = created_count + updated_count + skipped_count + failed_count + unchanged_count
      message = "Processed #{total_count} appointments: " \
      "#{created_count} created, " \
      "#{updated_count} updated, " \
      "#{skipped_count} skipped, " \
      "#{failed_count} failed, " \
      "#{unchanged_count} unchanged."

      Rails.logger.info message
      {success: true, message:, results:}
    rescue => e
      error_message = "Error syncing appointments: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, results:}
    end

    private

    def format_changes(records)
      changes = {}
      Array(records).compact.each do |record|
        next unless record&.saved_changes

        # Filter out timestamp fields and other auto-managed fields
        filtered_changes = record.saved_changes.reject do |attribute, _|
          %w[created_at updated_at id].include?(attribute.to_s)
        end

        changes.merge!(filtered_changes.transform_values { |old, new| "#{old} → #{new}" })
      end
      changes.empty? ? nil : changes
    end

    def format_changes_for_log(changes)
      return "" unless changes
      changes.map { |field, change| "#{field}: #{change}" }.join(", ")
    end

    def check_memory_usage
      # Get memory usage in MB
      memory_usage = get_memory_usage

      if memory_usage > SyncConfig::MEMORY_THRESHOLD_MB
        Rails.logger.warn "Memory usage high: #{memory_usage}MB. Running garbage collection..."
        GC.start
        memory_usage_after = get_memory_usage
        Rails.logger.info "Memory after GC: #{memory_usage_after}MB"
      end
    end

    def get_memory_usage
      # Get memory usage in MB (works on Linux/Mac)
      if File.exist?("/proc/self/status")
        status = File.read("/proc/self/status")
        if (match = status.match(/VmRSS:\s+(\d+)\s+kB/))
          return match[1].to_i / 1024.0 # Convert to MB
        end
      end

      # Fallback for other systems or if /proc is not available
      GC.stat[:heap_allocated_pages] * GC::INTERNAL_CONSTANTS[:HEAP_PAGE_SIZE] / (1024 * 1024)
    end

    def normalize_status(value)
      normalized = value.to_s.strip
      return nil if normalized.blank?

      upper = normalized.upcase
      case upper
      when "ACTIVE", "HOLD", "INACTIVE"
        upper
      when "TRUE", "YES", "Y", "1"
        "ACTIVE"
      when "FALSE", "NO", "N", "0"
        "INACTIVE"
      else
        upper
      end
    end

    def normalize_boolean(value)
      normalized = value.to_s.strip
      return false if normalized.blank?

      %w[ACTIVE TRUE YES Y 1].include?(normalized.upcase)
    end

    def normalize_telegram_id(value)
      normalized = value.to_s.strip
      return nil if normalized.blank?

      # Add @ if not present
      normalized.start_with?("@") ? normalized : "@#{normalized}"
    end

    def fetch_and_parse_csv(gid:)
      url = URI("#{MASTER_DATA_URL}&gid=#{gid}")
      data = URI.open(url).read # rubocop:disable Security/Open
      CSV.parse(data, headers: true)
    rescue OpenURI::HTTPError, CSV::MalformedCSVError => e
      Rails.logger.error "Failed to fetch or parse CSV: #{e.class} - #{e.message}"
      raise
    end

    def validate_headers(csv, required_headers)
      missing = required_headers - csv.headers
      return if missing.empty?
      raise "CSV headers missing: #{missing.join(", ")}"
    end
  end
end
