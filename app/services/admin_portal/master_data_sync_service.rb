module AdminPortal
  class MasterDataSyncService
    MASTER_DATA_URL = "https://docs.google.com/spreadsheets/d/1gERBdLgZPWrOF-rl5pXCx6mIyKOYi64KKbxjmxpTbvM/export?format=csv"

    def location
      gid = "0"
      csv = fetch_and_parse_csv(gid:)
      headers = ["Country", "Country Code", "State/Province", "City"]
      required_headers = headers.dup

      # validate headers
      unless (required_headers - csv.headers).empty?
        return {success: false, error: "CSV headers are incorrect."}
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

    def admin_data
      gid = "1493117737"
      csv = fetch_and_parse_csv(gid:)
      headers = ["Name",	"Email", "Type"]
      required_headers = headers.dup

      # validate headers
      unless (required_headers - csv.headers).empty?
        return {success: false, error: "CSV headers are incorrect."}
      end

      csv.each do |row|
        name, email, admin_type = headers.map { |key| row[key]&.strip }

        next if [name, email, admin_type].any?(&:blank?)

        # Create or update user
        user = User.find_or_initialize_by(email:)
        if user.new_record?
          user.password = "Fisiohome123!"
        end
        user.save!

        # Create or update admin
        admin = Admin.find_or_initialize_by(user_id: user.id)
        admin.name = name
        admin.admin_type = admin_type.tr(" ", "_")
        admin.save!
      end

      Rails.logger.info "Admins sync successfully."
      {success: true, message: "Synchronized with master data successfully."}
    rescue => e
      Rails.logger.error "Error syncing data: #{e.class} - #{e.message}"
      {success: false, error: "An error occurred while syncing data."}
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
