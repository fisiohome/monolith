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

          # Create or update Address (by address_line + postal_code)
          address = Address.find_or_initialize_by(location:, address: address_line)
          address.assign_attributes(postal_code:, latitude:, longitude:)
          address.save! if address.changed?

          # Create or update BankDetail (by account number)
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
            schedule.assign_attributes(appointment_duration_in_minutes: 90, buffer_time_in_minutes: 30, max_advance_booking_in_days: 60, min_booking_before_in_hours: 24, available_now: true)
            schedule.save! if schedule.changed?

            weekly_times = %w[Monday Tuesday Wednesday Thursday Friday].map do |day|
              {day_of_week: day, start_time: "09:00".in_time_zone(Time.zone), end_time: "18:00".in_time_zone(Time.zone)}
            end
            # save weekly availability if only the schedule is a new record
            weekly_times.each { |attrs|
              TherapistWeeklyAvailability.find_or_initialize_by(therapist_appointment_schedule_id: schedule.id, day_of_week: attrs[:day_of_week]).tap { |a|
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

    private

    def fetch_and_parse_csv(gid:)
      url = URI("#{MASTER_DATA_URL}&gid=#{gid}")
      data = URI.open(url).read
      CSV.parse(data, headers: true)
    rescue OpenURI::HTTPError, CSV::MalformedCSVError => e
      Rails.logger.error "Failed to fetch or parse CSV: #{e.class} - #{e.message}"
      raise
    end
  end
end
