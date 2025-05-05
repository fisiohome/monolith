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

      Rails.logger.info "Brands & packages sync successfully."
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
        puts row["Harga/Visit"]

        package_attrs = {
          name: package_name,
          number_of_visit: row["Jumlah Visit"]&.to_i || 1,
          price_per_visit: row["Harga/Visit"]&.to_s&.delete(",").to_d || 0,
          discount: row["Diskon RO/FUM"]&.to_s&.delete(",").to_d || 0,
          total_price: row["Total Harga"]&.to_s&.delete(",").to_d || 0,
          fee_per_visit: row["Fee Flat/Visit"]&.to_s&.delete(",").to_d || 0,
          total_fee: row["Total Fee"]&.to_s&.delete(",").to_d || 0,
          currency: row["Currency"],
          active: true
        }
        package = Package.find_or_initialize_by(service_id: service.id, name: package_name)
        package.assign_attributes(package_attrs)
        package.save! if package.changed?
      end
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
