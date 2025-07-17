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

      csv.each do |row|
        country, country_code, state, city = headers.map { |key| row[key]&.strip }

        next if [country, country_code, state, city].any?(&:blank?)

        Location.create_or_find_by(city:, state:, country_code:) do |location|
          location.country = country
        end
      end

      Rails.logger.info "Locations sync successfully."
      {success: true, message: "Synchronized with master data successfully."}
    rescue => e
      Rails.logger.error "Error syncing data: #{e.class} - #{e.message}"
      {success: false, error: "An error occurred while syncing data."}
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

      csv.each do |row|
        name, email, admin_type = headers.map { |key| row[key]&.strip }
        email = email.downcase

        next if [name, email, admin_type].any?(&:blank?)

        # Create or update user
        user = User.find_or_initialize_by(email:)
        user.password = "Fisiohome123!" if user.new_record?
        user.save! if user.changed?

        # Create or update admin
        admin = Admin.find_or_initialize_by(user_id: user.id)
        admin.name = name
        admin.admin_type = admin_type.tr(" ", "_")

        admin.save! if admin.changed?
      end

      Rails.logger.info "Admins sync successfully."
      {success: true, message: "Synchronized with master data successfully."}
    rescue => e
      Rails.logger.error "Error syncing data: #{e.class} - #{e.message}"
      {success: false, error: "An error occurred while syncing data."}
    end

    def brands_and_packages
      result = brands
      return result unless result[:success]

      result = packages
      return result unless result[:success]

      {success: true, message: "Brands and packages synced successfully."}
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

      csv.each do |row|
        name, code, description, locations = headers.map { |key| row[key]&.strip }
        next if [name, code].any?(&:blank?)

        normalized_name = name.upcase.tr(" ", "_")
        location_names = locations.to_s.split(",").map(&:strip).compact_blank

        service = Service.find_or_initialize_by(name: normalized_name)
        service.description = description if service.new_record?
        service.save! if service.changed?

        # Sync associated locations
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
      end

      Rails.logger.info "Brands sync successfully."
      {success: true, message: "Synchronized with master data successfully."}
    rescue => e
      Rails.logger.error "Error syncing data: #{e.class} - #{e.message}"
      {success: false, error: "An error occurred while syncing data."}
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

      csv.each do |row|
        brand_name, package_name = headers.map { |key| row[key]&.strip }
        next if [brand_name, package_name].any?(&:blank?)

        normalized_name = brand_name&.upcase&.tr(" ", "_")
        service = Service.find_by(name: normalized_name)

        unless service
          Rails.logger.warn "Service for brand '#{brand_name}' not found, skipping package '#{package_name}'."
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
        package.assign_attributes(package_attrs)
        package.save! if package.changed?
      end

      Rails.logger.info "Packages sync successfully."
      {success: true, message: "Synchronized with master data successfully."}
    rescue => e
      Rails.logger.error "Error syncing data: #{e.class} - #{e.message}"
      {success: false, error: "An error occurred while syncing data."}
    end

    def therapists_and_schedules
      # Process therapists CSV
      therapists_csv = fetch_and_parse_csv(gid: THERAPIST_GID)
      required_therapist_headers = ["Name", "Email", "Phone Number", "Gender", "Employment Type", "City", "Postal Code", "Address Line", "Brand"]
      validate_headers(therapists_csv, required_therapist_headers)

      # Process therapist_schedules CSV
      schedules_csv = fetch_and_parse_csv(gid: THERAPIST_SCHEDULES_GID)
      required_schedule_headers = ["Therapist", "Day of Week", "Start Time", "End Time"]
      validate_headers(schedules_csv, required_schedule_headers)

      # Pre-group schedules by therapist name for faster lookup
      grouped_schedules = schedules_csv.group_by { |row| row["Therapist"]&.strip }

      # Track results
      results = {created: [], updated: [], skipped: [], skipped_flat: [], failed: [], schedule_updated: []}

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
        coordinates_valid = !(latitude.abs > 90 || longitude.abs > 180 || [latitude, longitude].all?(&:zero?))

        begin
          action = :updated
          therapist = nil
          schedule_updated = false

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

            # Determine reason for skipping schedule
            skip_reason = if !coordinates_valid
              # for invalid coordinates
              "Invalid coordinates, schedule removed"
            elsif therapist.employment_status == "INACTIVE"
              # for the inactive therapists
              "Inactive therapist, schedule removed"
            end

            if skip_reason
              current_schedule = TherapistAppointmentSchedule.where(therapist:)
              if current_schedule.exists?
                current_schedule.destroy_all
                results[:schedule_updated] << {name:, email:, reason: skip_reason}
              end
              next
            end

            schedule = TherapistAppointmentSchedule.find_or_initialize_by(therapist:)
            # all of the default values based on the database default
            schedule.assign_attributes(
              appointment_duration_in_minutes: 90,
              buffer_time_in_minutes: 30,
              max_advance_booking_in_days: 60,
              min_booking_before_in_hours: 24,
              available_now: true
            )
            # Set default rules if not present
            if schedule.availability_rules.blank? || schedule.availability_rules == {}
              schedule.availability_rules = TherapistAppointmentSchedule::DEFAULT_AVAILABILITY_RULES
            end
            schedule.save! if schedule.new_record? || schedule.changed?

            # Apply custom schedule or default
            existing_availabilities_scope = TherapistWeeklyAvailability.where(therapist_appointment_schedule_id: schedule.id)
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
                      therapist_appointment_schedule_id: schedule.id,
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
                    therapist_appointment_schedule_id: schedule.id,
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
      created_count = results[:created].count
      updated_count = results[:updated].count
      skipped_count = results[:skipped].count + results[:skipped_flat].count
      failed_count = results[:failed].count
      schedule_updated_count = results[:schedule_updated].count
      message = "Processed #{created_count + updated_count + skipped_count + failed_count} therapists: " \
      "#{created_count} created, " \
      "#{updated_count} updated, " \
      "#{skipped_count} skipped (#{results[:skipped_flat].count} FLAT), " \
      "#{failed_count} failed, " \
      "#{schedule_updated_count} schedule updates."

      Rails.logger.info message
      {success: true, message:, results:}
    rescue => e
      error_message = "Error syncing therapists and schedules: #{e.class} - #{e.message}"
      Rails.logger.error error_message
      {success: false, error: error_message, results:}
    end

    def therapists
      csv = fetch_and_parse_csv(gid: THERAPIST_GID)
      required_headers = ["Name", "Email", "Phone Number", "Gender", "Employment Type", "City", "Postal Code", "Address Line", "Brand"]
      # headers = required_headers.dup + ["Batch", "Modalities", "Specializations", "Bank Name", "Account Number", "Account Holder Name", "Latitude", "Longitude"] # standard:disable Lint/UselessAssignment

      # Validate headers
      missing_headers = required_headers - csv.headers
      unless missing_headers.empty?
        return {success: false, error: "CSV headers are incorrect. Missing: #{missing_headers.join(", ")}"}
      end

      csv.each do |row|
        # next iterations if name and email are blank or the employment type is "FLAT"
        name = row["Name"]&.strip
        email = row["Email"]&.strip&.downcase
        employment_type = row["Employment Type"]&.strip&.upcase
        next if [name, email, employment_type].any?(&:blank?) || employment_type === "FLAT"

        # check service validation
        brand = row["Brand"]&.strip&.upcase&.tr(" ", "_")
        service = Service.find_by(name: brand)
        unless service
          Rails.logger.warn "Service for brand '#{brand}' not found, skipping therapist '#{name}'."
          next
        end

        # check region validity
        city = row["City"]&.strip
        location = Location.find_by(city:)
        unless location
          Rails.logger.warn "Location for city '#{city}' not found, skipping therapist '#{name}'."
          next
        end

        # check the coordinate validity
        lat_raw = row["Latitude"]&.strip&.tr(",", ".")
        lng_raw = row["Longitude"]&.strip&.tr(",", ".")
        latitude = Float(lat_raw.presence || 0)
        longitude = Float(lng_raw.presence || 0)
        invalid_coordinates = (latitude&.abs&.> 90) || (longitude&.abs&.> 180)
        if invalid_coordinates
          Rails.logger.warn "Invalid coordinates for '#{name}' (lat: #{latitude}, lng: #{longitude})."
        end

        phone_number = "+#{row["Phone Number"]&.strip&.to_s}"
        gender = (row["Gender"]&.strip&.upcase == "L") ? "MALE" : "FEMALE"
        postal_code = row["Postal Code"]&.strip&.to_s
        address_line = row["Address Line"]&.strip&.to_s
        batch = row["Batch"]&.strip&.to_i
        modalities = row["Modalities"]&.strip&.to_s&.split(/\s*(?:dan|,)\s*/i)&.map(&:strip)&.compact_blank || []
        specializations = row["Specializations"]&.strip&.to_s&.split(/\s*(?:dan|,)\s*/i)&.map(&:strip)&.compact_blank || []
        bank_name = row["Bank Name"]&.strip&.to_s
        account_number = row["Account Number"]&.strip&.to_s
        account_holder_name = row["Account Holder Name"]&.strip&.to_s&.upcase
        employment_status = row["Status"]&.strip

        ActiveRecord::Base.transaction do
          # Create or update User
          user = User.find_or_initialize_by(email:)
          user.password ||= "Fisiohome123!" if user.new_record?
          user.save! if user.changed?

          # Create or update Address
          address = Address.find_or_initialize_by(location:, address: address_line)
          address.assign_attributes(postal_code:, latitude:, longitude:)
          address.save! if address.changed?

          # Create or update BankDetail
          bank_detail = BankDetail.find_or_initialize_by(bank_name:, account_number:, account_holder_name:)
          bank_detail.save! if bank_detail.changed?

          # Create or update Therapist
          therapist = Therapist.find_or_initialize_by(name:, gender:)
          therapist.assign_attributes(employment_type:, employment_status:, batch:, modalities:, specializations:, service:, user:, phone_number:)
          therapist.save! if therapist.changed?

          # Link or create TherapistAddress (one active per therapist)
          therapist_address = TherapistAddress.find_or_initialize_by(therapist:, address:)
          therapist_address.active = true if therapist_address.new_record?
          therapist_address.save! if therapist_address.changed?

          # Link or create TherapistBankDetail (one active per therapist)
          therapist_bank_detail = TherapistBankDetail.find_or_initialize_by(therapist:, bank_detail:)
          therapist_bank_detail.active = true if therapist_bank_detail.new_record?
          therapist_bank_detail.save! if therapist_bank_detail.changed?

          # store the therapist availability
          if invalid_coordinates || latitude == 0 || longitude == 0
            # Remove the schedule if it exists but the coordinate are invalid
            Rails.logger.warn "Removing schedule for therapist '#{name}' due to invalid coordinates."
            schedule = TherapistAppointmentSchedule.find_by(therapist:)
            schedule&.destroy
          else
            schedule = TherapistAppointmentSchedule.find_or_initialize_by(therapist:)
            # * all of the default values based on the database default
            schedule.assign_attributes(
              appointment_duration_in_minutes: 90,
              buffer_time_in_minutes: 30,
              max_advance_booking_in_days: 60,
              min_booking_before_in_hours: 24,
              available_now: true
            )
            schedule.save! if schedule.changed?

            weekly_times = %w[Monday Tuesday Wednesday Thursday Friday].map do |day|
              {day_of_week: day, start_time: "09:00".in_time_zone(Time.zone), end_time: "18:00".in_time_zone(Time.zone)}
            end
            # save weekly availability if only the schedule is a new record
            weekly_times.each { |attrs|
              TherapistWeeklyAvailability.find_or_initialize_by(
                therapist_appointment_schedule_id: schedule.id,
                day_of_week: attrs[:day_of_week]
              ).tap { |a|
                a.assign_attributes(start_time: attrs[:start_time], end_time: attrs[:end_time])
                a.save! if a.new_record?
              }
            }
          end
        rescue => e
          Rails.logger.warn "Rolled back therapist #{name} due to error: #{e.message}"
          next
        end
      end

      Rails.logger.info "Therapists sync successfully."
      {success: true, message: "Synchronized with master data successfully."}
    rescue => e
      message = "An error occurred while syncing therapists: #{e.class} - #{e.message}"
      Rails.logger.error message
      {success: false, error: message}
    end

    def therapist_schedules
      csv = fetch_and_parse_csv(gid: THERAPIST_SCHEDULES_GID)
      required_headers = ["Therapist", "Day of Week", "Start Time", "End Time"]

      # Validate headers
      missing_headers = required_headers - csv.headers
      unless missing_headers.empty?
        {success: false, error: "CSV headers are incorrect. Missing: #{missing_headers.join(", ")}"}
      end

      grouped_rows = csv.group_by { |row| [row["Therapist"]&.strip, row["Day of Week"]&.strip] }

      grouped_rows.each do |(therapist_name, day_of_week), rows|
        therapist = Therapist.find_by(name: therapist_name)
        unless therapist
          Rails.logger.warn { "Therapist '#{therapist_name}' not found, skipping schedule." }
          next
        end

        active_address = therapist.active_address
        invalid_coordinates = active_address.nil? || active_address.latitude.abs > 90 || active_address.longitude.abs > 180
        if invalid_coordinates
          Rails.logger.warn { "Invalid coordinates for therapist '#{therapist_name}', skipping schedule." }
          next
        end

        schedule = TherapistAppointmentSchedule.find_by(therapist:)
        unless schedule
          Rails.logger.warn { "Schedule not found for therapist '#{therapist_name}', skipping." }
          next
        end

        # Check if it's an OFF day
        is_off_day = rows.any? { |row| row["Start Time"]&.strip&.upcase == "OFF" || row["End Time"]&.strip&.upcase == "OFF" }

        ActiveRecord::Base.transaction do
          if is_off_day
            # If OFF, remove all existing availabilities for this day
            TherapistWeeklyAvailability.where(
              therapist_appointment_schedule_id: schedule.id,
              day_of_week: day_of_week
            ).delete_all
            next
          end

          # Otherwise, prepare new availabilities
          new_availabilities = rows.map do |row|
            {
              start_time: row["Start Time"]&.strip&.in_time_zone(Time.zone),
              end_time: row["End Time"]&.strip&.in_time_zone(Time.zone)
            }
          end

          # Fetch existing availabilities
          existing = TherapistWeeklyAvailability.where(
            therapist_appointment_schedule_id: schedule.id,
            day_of_week: day_of_week
          ).pluck(:start_time, :end_time)

          # Convert times to string format for comparison (assuming stored as Time objects)
          existing_set = existing.map { |start_time, end_time| [start_time.strftime("%H:%M").in_time_zone(Time.zone), end_time.strftime("%H:%M").in_time_zone(Time.zone)] }.to_set
          new_set = new_availabilities.map { |a| [a[:start_time], a[:end_time]] }.to_set

          # If identical, skip
          next if existing_set == new_set

          # If different, remove old and insert new
          TherapistWeeklyAvailability.where(
            therapist_appointment_schedule_id: schedule.id,
            day_of_week: day_of_week
          ).delete_all

          new_availabilities.each do |avail|
            TherapistWeeklyAvailability.create!(
              therapist_appointment_schedule_id: schedule.id,
              day_of_week: day_of_week,
              start_time: avail[:start_time],
              end_time: avail[:end_time]
            )
          end
        end
      end

      {success: true, message: "Synchronized with master data successfully."}
    rescue => e
      message = "An error occurred while syncing therapist schedules: #{e.class} - #{e.message}"
      Rails.logger.error message
      {success: false, error: message}
    end

    def appointments
      # process appointments csv
      csv = fetch_and_parse_csv(gid: APPOINTMENT_GID)
      required_headers = [
        "Contact Name", "Contact Number", "Email", "Patient Full Name", "DOB", "Age",
        "Gender", "Condition", "Complaint Description", "Region", "Address Line", "Latitude",	"Longitude",
        "Brand",	"Package",	"Preferred Therapist Gender", "Visit Date", "Visit Time",	"Therapist"
      ]
      validate_headers(csv, required_headers)

      # Pre-load all lookup data to avoid N+1 queries
      services = Service.all.index_by(&:name)
      packages = Package.includes(:service).index_by { |p| "#{p.service.name}_#{p.name}" }
      therapists = Therapist.all.index_by(&:name)
      locations = Location.all.index_by(&:city)
      existing_appointments = Appointment.where(registration_number: csv.map { |r| r["Reg Number"]&.strip }.compact)
        .index_by(&:registration_number)

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
              existing_appointment = existing_appointments[registration_number]
              visit_number = extracted_data[:visit_number]
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
              admin = @current_user.admin
              admin_pic = AppointmentAdmin.find_or_initialize_by(appointment: appointment)
              admin_pic.assign_attributes(admin: admin)
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
      data = URI.open(url).read
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
