# * PLEASE NOTE:
# * if sync data on admin portal data master spreadsheet
#  * must set general access spreadsheet file to “Anyone with the link” with permission “Editor”.
module AdminPortal
  class MasterDataSyncService
    MASTER_DATA_URL = "https://docs.google.com/spreadsheets/d/1gERBdLgZPWrOF-rl5pXCx6mIyKOYi64KKbxjmxpTbvM/export?format=csv"
    LOCATION_GID = "0"
    ADMIN_GID = "1493117737"
    BRAND_GID = "2090364532"
    PACKAGE_GID = "872007576"
    THERAPIST_GID = "887408989"
    THERAPIST_SCHEDULES_GID = "1843613331"
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
      results = {created: [], updated: [], skipped: [], failed: []}

      csv.each do |row|
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
            results[:updated] << {city:, state:, country:}
          else
            results[:skipped] << {city:, state:, reason: "No changes needed"}
          end
        rescue => e
          results[:failed] << {city:, state:, error: e.message}
          Rails.logger.error "Failed to sync location '#{city}, #{state}': #{e.message}"
        end
      end

      # Build detailed message
      created_count = results[:created].count
      updated_count = results[:updated].count
      failed_count = results[:failed].count
      skipped_count = results[:skipped].count

      log_message = "Processed #{csv.count} locations: #{created_count} created, #{updated_count} updated"
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:city]}, #{f[:state]} (#{f[:error]})" }.join(", ")
        log_message += ", #{failed_count} failed: #{failure_reasons}"
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].map { |s| "#{s[:city] || s[:state]} (#{s[:reason]})" }.join(", ")
        log_message += ", #{skipped_count} skipped: #{skip_reasons}"
      end
      log_message += "."

      message = "Processed #{csv.count} locations: #{created_count} created, #{updated_count} updated"
      message += ", #{failed_count} failed" if failed_count > 0
      message += ", #{skipped_count} skipped" if skipped_count > 0
      message += "."

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
      results = {created: [], updated: [], skipped: [], failed: []}

      csv.each do |row|
        name, email, admin_type = headers.map { |key| row[key]&.strip }
        email = email.downcase

        if [name, email, admin_type].any?(&:blank?)
          results[:skipped] << {email: email || "blank", reason: "Missing required fields"}
          next
        end

        begin
          # Create or update user
          user = User.find_or_initialize_by(email:)
          user_created = user.new_record?
          user.password = "Fisiohome123!" if user.new_record?
          user.save! if user.changed?

          # Create or update admin
          admin = Admin.find_or_initialize_by(user_id: user.id)
          admin_created = admin.new_record?
          admin.name = name
          admin.admin_type = admin_type.tr(" ", "_")
          admin.save! if admin.changed?

          # Track successful operations
          if admin_created || user_created
            results[:created] << {name:, email:, admin_type:}
          elsif admin.changed? || user.changed?
            results[:updated] << {name:, email:, admin_type:}
          else
            results[:skipped] << {name:, email:, reason: "No changes needed"}
          end
        rescue => e
          results[:failed] << {name:, email:, error: e.message}
          Rails.logger.error "Failed to sync admin '#{email}': #{e.message}"
        end
      end

      # Build detailed message
      created_count = results[:created].count
      updated_count = results[:updated].count
      failed_count = results[:failed].count
      skipped_count = results[:skipped].count

      log_message = "Processed #{csv.count} admins: #{created_count} created, #{updated_count} updated"
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:email]} (#{f[:error]})" }.join(", ")
        log_message += ", #{failed_count} failed: #{failure_reasons}"
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].map { |s| "#{s[:email] || s[:name]} (#{s[:reason]})" }.join(", ")
        log_message += ", #{skipped_count} skipped: #{skip_reasons}"
      end
      log_message += "."

      message = "Processed #{csv.count} admins: #{created_count} created, #{updated_count} updated"
      message += ", #{failed_count} failed" if failed_count > 0
      message += ", #{skipped_count} skipped" if skipped_count > 0
      message += "."

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
      brands_failed = brands_result.dig(:results, :failed)&.count || 0
      brands_skipped = brands_result.dig(:results, :skipped)&.count || 0

      packages_created = packages_result.dig(:results, :created)&.count || 0
      packages_updated = packages_result.dig(:results, :updated)&.count || 0
      packages_failed = packages_result.dig(:results, :failed)&.count || 0
      packages_skipped = packages_result.dig(:results, :skipped)&.count || 0

      # Build comprehensive UI message
      message = "Brands: #{brands_created} created, #{brands_updated} updated"
      message += ", #{brands_failed} failed" if brands_failed > 0
      message += ", #{brands_skipped} skipped" if brands_skipped > 0
      message += ". Packages: #{packages_created} created, #{packages_updated} updated"
      message += ", #{packages_failed} failed" if packages_failed > 0
      message += ", #{packages_skipped} skipped" if packages_skipped > 0
      message += "."

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
      results = {created: [], updated: [], skipped: [], failed: []}

      csv.each do |row|
        name, code, description, locations = headers.map { |key| row[key]&.strip }
        next if [name, code].any?(&:blank?)

        begin
          normalized_name = name.upcase.tr(" ", "_")
          service = Service.find_or_initialize_by(name: normalized_name)
          action = service.new_record? ? :created : :updated
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
          if action == :created
            results[:created] << {name:, code:}
          elsif action == :updated
            results[:updated] << {name:, code:}
          end
        rescue => e
          results[:failed] << {name:, code:, error: e.message}
          Rails.logger.error "Failed to sync brand '#{name}': #{e.message}"
        end
      end

      # Build detailed message
      created_count = results[:created].count
      updated_count = results[:updated].count
      failed_count = results[:failed].count
      skipped_count = results[:skipped].count

      log_message = "Processed #{csv.count} brands: #{created_count} created, #{updated_count} updated"
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:name]} (#{f[:error]})" }.join(", ")
        log_message += ", #{failed_count} failed: #{failure_reasons}"
      end
      if skipped_count > 0
        log_message += ", #{skipped_count} skipped"
      end
      log_message += "."

      message = "Processed #{csv.count} brands: #{created_count} created, #{updated_count} updated"
      message += ", #{failed_count} failed" if failed_count > 0
      message += ", #{skipped_count} skipped" if skipped_count > 0
      message += "."

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
      results = {created: [], updated: [], skipped: [], failed: []}

      csv.each do |row|
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
          action = package.new_record? ? :created : :updated
          package.assign_attributes(package_attrs)
          package.save! if package.changed?

          # Track successful operations
          if action == :created
            results[:created] << {brand: brand_name, package: package_name}
          elsif action == :updated
            results[:updated] << {brand: brand_name, package: package_name}
          end
        rescue => e
          results[:failed] << {brand: brand_name, package: package_name, error: e.message}
          Rails.logger.error "Failed to sync package '#{package_name}' for brand '#{brand_name}': #{e.message}"
        end
      end

      # Build detailed message
      created_count = results[:created].count
      updated_count = results[:updated].count
      failed_count = results[:failed].count
      skipped_count = results[:skipped].count

      log_message = "Processed #{csv.count} packages: #{created_count} created, #{updated_count} updated"
      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:package]} (#{f[:error]})" }.join(", ")
        log_message += ", #{failed_count} failed: #{failure_reasons}"
      end
      if skipped_count > 0
        skip_reasons = results[:skipped].group_by { |s| s[:reason] }
          .map { |reason, items| "#{items.count} #{reason}" }
          .join(", ")
        log_message += ", #{skipped_count} skipped: #{skip_reasons}"
      end
      log_message += "."

      message = "Processed #{csv.count} packages: #{created_count} created, #{updated_count} updated"
      message += ", #{failed_count} failed" if failed_count > 0
      message += ", #{skipped_count} skipped" if skipped_count > 0
      message += "."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing packages: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message}
    end

    def therapists
      # Process therapists CSV
      therapists_csv = fetch_and_parse_csv(gid: THERAPIST_GID)
      required_therapist_headers = ["Name", "Email", "Phone Number", "Gender", "Employment Type", "City", "Postal Code", "Address Line", "Brand"]
      validate_headers(therapists_csv, required_therapist_headers)

      # Track results
      results = {created: [], updated: [], skipped: [], skipped_flat: [], failed: []}

      # Process therapists
      therapists_csv.each do |row|
        # skipped for the FLAT employment type therapists
        name = row["Name"]&.strip
        email = row["Email"]&.strip&.downcase
        employment_type = row["Employment Type"]&.strip&.upcase
        if employment_type === "FLAT"
          results[:skipped_flat] << {name:, email:, reason: "FLAT employment type"}
          next
        end

        # validate the therapist basic information data
        if [name, email].any?(&:blank?)
          results[:skipped] << {name:, email:, reason: "Blank name and email"}
          next
        end

        # validate the service and location
        brand = row["Brand"]&.strip&.upcase&.tr(" ", "_")
        service = Service.find_by(name: brand)
        unless service
          results[:skipped] << {name:, email:, reason: "Service for brand '#{brand}' not found"}
          next
        end
        city = row["City"]&.strip
        location = Location.find_by(city: city)
        unless location
          results[:skipped] << {name:, email:, reason: "Location for city '#{city}' not found"}
          next
        end

        # define the coordinates
        lat_raw = row["Latitude"]&.strip&.tr(",", ".")
        lng_raw = row["Longitude"]&.strip&.tr(",", ".")
        latitude = Float(lat_raw.presence || 0)
        longitude = Float(lng_raw.presence || 0)

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
            postal_code = row["Postal Code"]&.strip&.to_s
            address = Address.find_or_initialize_by(location:, address: address_line)
            address.assign_attributes(postal_code:, latitude:, longitude:)
            address.save! if address.changed? || address.new_record?

            # Create or update BankDetail
            bank_name = row["Bank Name"]&.strip&.to_s
            account_number = row["Account Number"]&.strip&.to_s
            account_holder_name = row["Account Holder Name"]&.strip&.to_s&.upcase
            bank_detail = BankDetail.find_or_initialize_by(bank_name:, account_number:, account_holder_name:)
            bank_detail.save! if bank_detail.changed? || bank_detail.new_record?

            # Create or update Therapist
            phone_number = "+#{row["Phone Number"]&.strip&.to_s}"
            gender = (row["Gender"]&.strip&.upcase == "L") ? "MALE" : "FEMALE"
            batch = row["Batch"]&.strip&.to_i
            modalities = row["Modalities"]&.strip&.to_s&.split(/\s*(?:dan|,)\s*/i)&.map(&:strip)&.compact_blank || []
            specializations = row["Specializations"]&.strip&.to_s&.split(/\s*(?:dan|,)\s*/i)&.map(&:strip)&.compact_blank || []
            employment_status = row["Status"]&.strip
            therapist = Therapist.find_or_initialize_by(name:, gender:)
            therapist.assign_attributes(employment_type:, employment_status:, batch:, modalities:, specializations:, service:, user:, phone_number:)
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
              results[:updated] << {name:, email:}
            end
          end
        rescue => e
          results[:failed] << {name:, email:, error: e.message}
          next
        end
      end

      # build results summary
      created_count = results[:created].count
      updated_count = results[:updated].count
      skipped_count = results[:skipped].count
      skipped_flat_count = results[:skipped_flat].count
      failed_count = results[:failed].count
      total_count = created_count + updated_count + skipped_count + skipped_flat_count + failed_count

      log_message = "Processed #{total_count} therapists: #{created_count} created, #{updated_count} updated"
      if skipped_count > 0
        skip_reasons = results[:skipped].group_by { |s| s[:reason] }
          .map { |reason, items| "#{items.count} #{reason}" }
          .join(", ")
        log_message += ", #{skipped_count} skipped: #{skip_reasons}"
      end

      if skipped_flat_count > 0
        log_message += ", #{skipped_flat_count} skipped (FLAT)"
      end

      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:name]} (#{f[:error]})" }.join(", ")
        log_message += ", #{failed_count} failed: #{failure_reasons}"
      end

      log_message += "."

      message = "Processed #{total_count} therapists: #{created_count} created, #{updated_count} updated"
      message += ", #{skipped_count} skipped" if skipped_count > 0
      message += ", #{skipped_flat_count} FLAT skipped" if skipped_flat_count > 0
      message += ", #{failed_count} failed" if failed_count > 0
      message += "."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing therapists: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results:}
    end

    def therapist_schedules
      # Process therapist_schedules CSV
      schedules_csv = fetch_and_parse_csv(gid: THERAPIST_SCHEDULES_GID)
      required_schedule_headers = ["Therapist", "Day of Week", "Start Time", "End Time"]
      validate_headers(schedules_csv, required_schedule_headers)

      # Pre-group schedules by therapist name for faster lookup
      grouped_schedules = schedules_csv.group_by { |row| row["Therapist"]&.strip }

      # Track results
      results = {schedule_updated: [], skipped: [], failed: [], schedules_created: []}

      # Get all therapists (including those without schedules)
      all_therapists = Therapist.includes(:user).all

      all_therapists.each do |therapist|
        name = therapist.name
        email = therapist.user&.email

        # Check if therapist has valid coordinates
        active_address = therapist.active_address
        coordinates_valid = active_address && !(active_address.latitude.abs > 90 || active_address.longitude.abs > 180 || [active_address.latitude, active_address.longitude].all?(&:zero?))

        # Check if therapist is inactive or FLAT
        skip_reason = if !coordinates_valid
          "Invalid coordinates, schedule removed"
        elsif therapist.employment_status == "INACTIVE"
          "Inactive therapist, schedule removed"
        elsif therapist.employment_type == "FLAT"
          "FLAT employment type, no schedule"
        end

        # Get or create schedule
        schedule_record = TherapistAppointmentSchedule.find_or_initialize_by(therapist:)

        # If skip reason, remove schedule if it exists
        if skip_reason
          if schedule_record.persisted?
            schedule_record.destroy
            results[:schedule_updated] << {name:, email:, reason: skip_reason}
          end
          next
        end

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
            schedule_record.availability_rules = TherapistAppointmentSchedule::DEFAULT_AVAILABILITY_RULES
          end
          schedule_record.save!
          results[:schedules_created] << {name:, email:}
        end

        begin
          schedule_updated = false
          ActiveRecord::Base.transaction do
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
              default_start_time = "09:00".in_time_zone(Time.zone)
              default_end_time = "18:00".in_time_zone(Time.zone)

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
          results[:schedule_updated] << {name:, email:} if schedule_updated
        rescue => e
          results[:failed] << {name:, email:, error: e.message}
        end
      end

      # Return results
      schedule_updated_count = results[:schedule_updated].count
      skipped_count = results[:skipped].count
      failed_count = results[:failed].count
      schedules_created_count = results[:schedules_created].count

      log_message = "Processed schedules: #{schedules_created_count} schedules created, #{schedule_updated_count} schedule updates"
      if skipped_count > 0
        skip_reasons = results[:skipped].group_by { |s| s[:reason] }
          .map { |reason, items| "#{items.count} #{reason}" }
          .join(", ")
        log_message += ", #{skipped_count} skipped: #{skip_reasons}"
      end

      if failed_count > 0
        failure_reasons = results[:failed].map { |f| "#{f[:name]} (#{f[:error]})" }.join(", ")
        log_message += ", #{failed_count} failed: #{failure_reasons}"
      end

      log_message += "."

      message = "Processed schedules: #{schedules_created_count} created, #{schedule_updated_count} updated"
      message += ", #{skipped_count} skipped" if skipped_count > 0
      message += ", #{failed_count} failed" if failed_count > 0
      message += "."

      Rails.logger.info log_message
      {success: true, message:, log_message:, results:}
    rescue => e
      error_message = "Error syncing therapist schedules: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, log_message: error_message, results:}
    end

    def therapists_and_schedules
      # First sync therapists
      therapist_result = therapists
      return therapist_result unless therapist_result[:success]

      # Then sync schedules
      schedule_result = therapist_schedules
      return schedule_result unless schedule_result[:success]

      # Extract counts from results
      therapists_created = therapist_result.dig(:results, :created)&.count || 0
      therapists_updated = therapist_result.dig(:results, :updated)&.count || 0
      therapists_failed = therapist_result.dig(:results, :failed)&.count || 0
      therapists_skipped = therapist_result.dig(:results, :skipped)&.count || 0
      therapists_skipped_flat = therapist_result.dig(:results, :skipped_flat)&.count || 0

      schedules_created = schedule_result.dig(:results, :schedules_created)&.count || 0
      schedules_updated = schedule_result.dig(:results, :schedule_updated)&.count || 0
      schedules_failed = schedule_result.dig(:results, :failed)&.count || 0
      schedules_skipped = schedule_result.dig(:results, :skipped)&.count || 0

      # Build comprehensive UI message
      message = "Therapists: #{therapists_created} created, #{therapists_updated} updated"
      message += ", #{therapists_failed} failed" if therapists_failed > 0
      message += ", #{therapists_skipped} skipped" if therapists_skipped > 0
      message += ", #{therapists_skipped_flat} FLAT skipped" if therapists_skipped_flat > 0
      message += ". Schedules: #{schedules_created} created, #{schedules_updated} updated"
      message += ", #{schedules_failed} failed" if schedules_failed > 0
      message += ", #{schedules_skipped} skipped" if schedules_skipped > 0
      message += "."

      # Combine messages for logging (with full details)
      log_message = "#{therapist_result[:log_message]} #{schedule_result[:log_message]}"

      # Combine results
      combined_results = {
        therapists: therapist_result[:results] || {},
        schedules: schedule_result[:results] || {}
      }

      Rails.logger.info "Therapists and schedules sync completed. #{log_message}"
      {success: true, message:, log_message:, results: combined_results}
    rescue => e
      error_message = "Error syncing therapists and schedules: #{e.class} - #{e.message}"
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
      grouped_batch.each do |batch_number, rows|
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
      end

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
