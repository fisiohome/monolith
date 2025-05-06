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
      headers = required_headers.dup + ["Batch", "Modalities", "Specializations", "Bank Name", "Account Number", "Account Holder Name", "Latitude", "Longitude"] # standard:disable Lint/UselessAssignment

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

        latitude = Float(row["Latitude"]&.strip || 0)
        longitude = Float(row["Longitude"]&.strip || 0)
        invalid_coordinates = (latitude&.abs&.> 90) || (longitude&.abs&.> 180)
        if invalid_coordinates
          Rails.logger.warn "Invalid coordinates for '#{name}' (lat: #{latitude}, long: #{longitude}), skipping."
        end

        phone_number = row["Phone Number"]&.strip&.to_s
        gender = (row["Gender"]&.strip&.upcase == "L") ? "MALE" : "FEMALE"
        postal_code = row["Postal Code"]&.strip&.to_s
        address_line = row["Address Line"]&.strip&.to_s
        batch = row["Batch"]&.strip&.to_i
        modalities = row["Modalities"]&.strip&.to_s&.split(/\s*(?:dan|,)\s*/i)&.map(&:strip)&.compact_blank
        specializations = row["Specializations"]&.strip&.to_s&.split(/\s*(?:dan|,)\s*/i)&.map(&:strip)&.compact_blank
        bank_name = row["Bank Name"]&.strip&.to_s
        account_number = row["Account Number"]&.strip&.to_s
        account_holder_name = row["Account Holder Name"]&.strip&.to_s&.upcase

        ActiveRecord::Base.transaction do
          # Create or update User
          user = User.find_or_initialize_by(email:)
          user.password ||= "Fisiohome123!" if user.new_record?
          user.save! if user.changed?

          # Create or update Address (by address_line + postal_code)
          address = Address.find_or_initialize_by(location:, address: address_line, postal_code:, latitude:, longitude:)
          address.save! if address.changed?

          # Create or update BankDetail (by account number)
          bank_detail = BankDetail.find_or_initialize_by(bank_name:, account_number:, account_holder_name:)
          bank_detail.save! if bank_detail.changed?

          # Create or update Therapist
          therapist = Therapist.find_or_initialize_by(name:, phone_number:, gender:)
          therapist.assign_attributes(employment_type:, employment_status: "ACTIVE", batch:, modalities:, specializations:, service:, user:)
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
            # Remove the schedule if it exists
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

            weekly_times.each do |attrs|
              TherapistWeeklyAvailability.find_or_initialize_by(therapist_appointment_schedule_id: schedule.id, day_of_week: attrs[:day_of_week]).tap do |availability|
                availability.assign_attributes(start_time: attrs[:start_time], end_time: attrs[:end_time])
                availability.save! if availability.changed?
              end
            end
          end
        rescue => e
          Rails.logger.warn "Rolled back therapist #{name} due to error: #{e.message}"
          next
        end
      end

      Rails.logger.info "Therapists sync successfully."
      {success: true, message: "Synchronized with master data successfully."}
    rescue => e
      # Rails.logger.error
      {success: false, error: "Error syncing data: #{e.class} - #{e.message}"}
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
