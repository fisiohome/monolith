module AdminPortal
  class VouchersService
    # Header mapping for human-readable to system keys
    HEADER_MAPPING = {
      "voucher code*" => :code,
      "voucher name" => :name,
      "description" => :description,
      "discount type*" => :discount_type,
      "discount value*" => :discount_value,
      "quota*" => :quota,
      "max discount amount" => :max_discount_amount,
      "min order amount" => :min_order_amount,
      "valid from (yyyy-mm-dd)" => :valid_from,
      "valid until (yyyy-mm-dd)" => :valid_until,
      "is active (true/false)" => :is_active,
      "package(s)" => :package_ids,
      "package selection helper" => :_package_helper
    }.freeze

    require "roo"

    def initialize(key_format: :camel)
      @key_format = key_format
    end

    # Fetches a list of vouchers from the database
    # @return [Hash] hash containing vouchers array and metadata
    def list(code: nil, is_active: nil, discount_type: nil, page: nil, limit: nil)
      vouchers = Voucher.all

      # Apply filters
      vouchers = vouchers.where("code ILIKE ?", "%#{code}%") if code.present?
      vouchers = vouchers.where(is_active: is_active) if !is_active.nil?
      vouchers = vouchers.where(discount_type: discount_type) if discount_type.present?

      # Include associated packages before pagination
      vouchers = vouchers.includes(:packages)

      # Get total count before pagination
      total_count = vouchers.count

      # Apply pagination
      page = [page.to_i, 1].max if page.present?
      limit = limit.to_i if limit.present?

      # Set default limit to 10 if not provided
      limit ||= 10

      if page && limit
        vouchers = vouchers.limit(limit).offset((page - 1) * limit)
      end

      # Build response
      voucher_list = vouchers.map { |voucher| build_voucher(voucher) }

      response = {
        vouchers: voucher_list,
        meta: {
          totalCount: total_count,
          page: page || 1,
          limit: limit,
          totalPages: limit ? (total_count.to_f / limit).ceil : 1
        }
      }

      deep_transform_keys_format(response, format: @key_format)
    end

    # Fetches a single voucher by ID from the database
    # @param id [String, Integer] the voucher ID to fetch
    # @return [Hash] hash containing the voucher or nil on error
    def find(id)
      voucher = Voucher.includes(:packages).find_by(id: id)

      if voucher
        Rails.logger.debug {
          "[VouchersService] VOUCHER_FOUND: " \
          "id=#{id} " \
          "code='#{voucher.code}' " \
          "is_active=#{voucher.is_active}"
        }
        response = {
          voucher: build_voucher(voucher)
        }
        deep_transform_keys_format(response, format: @key_format)
      else
        {voucher: nil}
      end
    rescue => e
      Rails.logger.error(
        "[VouchersService] FIND_VOUCHER_FAILED: " \
        "id=#{id} " \
        "error='#{e.message}' " \
        "backtrace=#{e.backtrace&.first(3)&.join(", ")}"
      )
      {voucher: nil}
    end

    # Creates a new voucher in the database
    # @param attributes [Hash] voucher attributes to create
    # @return [Hash] hash with :success boolean and either :voucher or :errors
    def create(attributes)
      voucher = Voucher.new(attributes)

      if voucher.save
        Rails.logger.info(
          "[VouchersService] VOUCHER_CREATED: " \
          "id=#{voucher.id} " \
          "code='#{voucher.code}' " \
          "discount_type=#{voucher.discount_type} " \
          "discount_value=#{voucher.discount_value}"
        )
        voucher = Voucher.includes(:packages).find(voucher.id)
        response = {
          success: true,
          voucher: build_voucher(voucher)
        }
        deep_transform_keys_format(response, format: @key_format)
      else
        {
          success: false,
          errors: format_errors(voucher.errors)
        }
      end
    rescue => e
      Rails.logger.error(
        "[VouchersService] CREATE_VOUCHER_FAILED: " \
        "attributes=#{attributes.inspect} " \
        "error='#{e.message}' " \
        "backtrace=#{e.backtrace&.first(3)&.join(", ")}"
      )
      {
        success: false,
        errors: {fullMessages: ["Unable to create voucher. Please try again."]}
      }
    end

    # Updates an existing voucher in the database
    # @param id [String, Integer] the voucher ID to update
    # @param attributes [Hash] voucher attributes to update
    # @return [Hash] hash with :success boolean and either :voucher or :errors
    def update(id, attributes)
      voucher = Voucher.find(id)

      if voucher.update(attributes)
        Rails.logger.info(
          "[VouchersService] VOUCHER_UPDATED: " \
          "id=#{id} " \
          "code='#{voucher.code}' " \
          "changes=#{attributes.keys.join(", ")}"
        )
        voucher = Voucher.includes(:packages).find(voucher.id)
        response = {
          success: true,
          voucher: build_voucher(voucher)
        }
        deep_transform_keys_format(response, format: @key_format)
      else
        {
          success: false,
          errors: format_errors(voucher.errors)
        }
      end
    rescue ActiveRecord::RecordNotFound
      {
        success: false,
        errors: {fullMessages: ["Voucher not found."]}
      }
    rescue => e
      Rails.logger.error(
        "[VouchersService] UPDATE_VOUCHER_FAILED: " \
        "id=#{id} " \
        "attributes=#{attributes.inspect} " \
        "error='#{e.message}' " \
        "backtrace=#{e.backtrace&.first(3)&.join(", ")}"
      )
      {
        success: false,
        errors: {fullMessages: ["Unable to update voucher. Please try again."]}
      }
    end

    # Creates multiple vouchers from uploaded file (CSV or Excel)
    # @param file [ActionDispatch::Http::UploadedFile] the uploaded file
    # @param save_to_db [Boolean] whether to save to database or just validate
    # @return [Hash] hash with :success boolean and :message
    def bulk_create(file, save_to_db: false)
      Rails.logger.info(
        "[VouchersService] BULK_CREATE_STARTED: " \
        "file='#{file.original_filename}' " \
        "file_size=#{file.size} " \
        "content_type='#{file.content_type}' " \
        "save_to_db=#{save_to_db}"
      )

      return {success: false, message: "No file provided"} if file.blank?

      vouchers_data = []
      errors = []
      created_count = 0
      row_results = [] # Track results for each row

      begin
        # Helper method to normalize headers
        normalize_header = lambda do |header|
          header_name = header.to_s.strip.downcase
          HEADER_MAPPING[header_name] || header_name.delete("*").to_sym
        end

        # Only accept Excel files
        unless file.content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.original_filename.end_with?(".xlsx")
          return {success: false, message: "Only Excel (.xlsx) files are accepted. Please download the template."}
        end

        # Parse Excel file
        workbook = Roo::Excelx.new(file.path)
        sheet = workbook.sheet("Vouchers")

        unless sheet
          return {success: false, message: "Excel file must have a 'Vouchers' sheet"}
        end

        # Get headers from first row
        headers = sheet.row(1).map(&normalize_header)

        if headers.blank?
          return {success: false, message: "Excel file has no headers"}
        end

        # Validate required headers
        required_headers = [:code, :discount_type, :discount_value, :quota]
        missing_headers = required_headers - headers
        if missing_headers.any?
          return {success: false, message: "Missing required headers: #{missing_headers.join(", ")}"}
        end

        # Track seen codes to detect duplicates within the file
        seen_codes = {}
        duplicate_codes = []

        # First pass: identify all duplicate codes within the file
        (2..sheet.last_row).each do |row_index|
          row_data = headers.zip(sheet.row(row_index)).to_h
          attributes = prepare_voucher_attributes(row_data, row_index)

          if seen_codes.key?(attributes[:code])
            duplicate_codes << attributes[:code] unless duplicate_codes.include?(attributes[:code])
          else
            seen_codes[attributes[:code]] = row_index
          end
        end

        # Second pass: process rows, skipping any with duplicate codes
        seen_codes = {} # Reset for second pass
        (2..sheet.last_row).each do |row_index|
          row_data = headers.zip(sheet.row(row_index)).to_h
          result = process_voucher_row(row_data, row_index + 1, vouchers_data, errors, seen_codes, duplicate_codes, row_data)
          row_results << result if result
        end

        # Create vouchers in a transaction (only if save_to_db is true)
        if vouchers_data.any? && save_to_db
          Voucher.transaction do
            vouchers_data.each do |attrs|
              Voucher.create!(attrs)
              created_count += 1
            end
          end
        elsif vouchers_data.any? && !save_to_db
          # Just count what would be created
          created_count = vouchers_data.size
        end

        # Build result message
        message_parts = []
        message_parts << if !save_to_db
          "Preview completed. Review the data before saving."
        elsif created_count > 0
          "Successfully created #{created_count} voucher#{"s" if created_count > 1}!"
        elsif errors.any?
          "No vouchers were created. Please review the errors."
        else
          "No valid vouchers found to create."
        end

        if errors.any?
          Rails.logger.error(
            "[VouchersService] BULK_CREATE_VALIDATION_ERRORS: " \
            "error_count=#{errors.size} " \
            "errors='#{errors.join("; ")}' " \
            "file='#{file.original_filename}'"
          )
        end

        message = message_parts.join(", ")

        Rails.logger.info(
          "[VouchersService] BULK_CREATE_COMPLETED: " \
          "file='#{file.original_filename}' " \
          "save_to_db=#{save_to_db} " \
          "created=#{created_count} " \
          "errors=#{errors.size} " \
          "success=#{created_count > 0 || errors.any?}"
        )

        result = {success: true, message: message, errors: errors}
        # Add row results for preview
        result[:rows] = row_results if row_results.any?
        result
      rescue => e
        Rails.logger.error(
          "[VouchersService] BULK_CREATE_FAILED: " \
          "file='#{file&.original_filename}' " \
          "file_size=#{file&.size} " \
          "content_type='#{file&.content_type}' " \
          "save_to_db=#{save_to_db} " \
          "error='#{e.message}' " \
          "backtrace=#{e.backtrace&.first(5)&.join(", ")}"
        )
        {success: false, message: "Failed to process file: #{e.message}"}
      end
    end

    # Processes a single voucher row
    def process_voucher_row(row_data, row_number, vouchers_data, errors, seen_codes, duplicate_codes, original_row_data = nil)
      # Clean and prepare attributes
      attributes = prepare_voucher_attributes(row_data, row_number)

      # Prepare result hash for preview
      result = nil
      if original_row_data
        result = {
          rowNumber: row_number,
          code: attributes[:code],
          name: original_row_data[:name] || "",
          discountType: attributes[:discount_type],
          discountValue: attributes[:discount_value].to_s,
          quota: attributes[:quota].to_s,
          status: nil,
          reason: nil
        }
      end

      # Check if this code has duplicates in the file
      if duplicate_codes.include?(attributes[:code])
        Rails.logger.info(
          "[VouchersService] BULK_CREATE_SKIPPED_HAS_DUPLICATES: " \
          "code='#{attributes[:code]}' " \
          "row=#{row_number}"
        )
        error_msg = "Row #{row_number}: Voucher code '#{attributes[:code]}' appears multiple times in your file. Please ensure each code is unique."
        errors << error_msg
        if result
          result[:status] = "error"
          result[:reason] = "Duplicate code in file"
        end
        return result
      end

      # Check for existing voucher code in database
      if Voucher.exists?(code: attributes[:code], deleted_at: nil)
        Rails.logger.info(
          "[VouchersService] BULK_CREATE_SKIPPED_DB_DUPLICATE: " \
          "code='#{attributes[:code]}' " \
          "row=#{row_number}"
        )
        if result
          result[:status] = "error"
          result[:reason] = "Already exists"
        end
        return result
      end

      voucher = Voucher.new(attributes)
      if voucher.valid?
        vouchers_data << attributes
        if result
          result[:status] = "created"
        end
      else
        error_msg = "Row #{row_number}: #{voucher.errors.full_messages.join(", ")}"
        errors << error_msg
        if result
          result[:status] = "error"
          result[:reason] = voucher.errors.full_messages.join(", ")
        end
      end

      result
    rescue => e
      error_msg = "Row #{row_number}: #{e.message}"
      errors << error_msg
      if result
        result[:status] = "error"
        result[:reason] = e.message
      end
      result
    end

    # Prepares voucher attributes from row data
    # @param row_hash [Hash] the row data from CSV/Excel
    # @param row_number [Integer] the row number for error reporting
    # @return [Hash] prepared attributes
    def prepare_voucher_attributes(row_hash, row_number)
      # Convert string values to appropriate types
      attributes = {}

      # Required fields
      attributes[:code] = row_hash[:code]&.to_s&.strip&.upcase
      raise "Code cannot be blank" if attributes[:code].blank?

      # Discount type
      discount_type = row_hash[:discount_type]&.to_s&.strip&.upcase
      unless ["PERCENTAGE", "FIXED"].include?(discount_type)
        raise "Discount type must be PERCENTAGE or FIXED"
      end
      attributes[:discount_type] = discount_type

      # Discount value
      attributes[:discount_value] = row_hash[:discount_value].to_f
      raise "Discount value must be greater than 0" if attributes[:discount_value] <= 0

      # Quota
      attributes[:quota] = row_hash[:quota].to_i
      raise "Quota must be greater than or equal to 0" if attributes[:quota] < 0

      # Optional fields
      attributes[:name] = row_hash[:name]&.to_s&.strip if row_hash[:name].present?
      attributes[:description] = row_hash[:description]&.to_s&.strip if row_hash[:description].present?

      # Max discount amount (for percentage discounts)
      if row_hash[:max_discount_amount].present?
        attributes[:max_discount_amount] = row_hash[:max_discount_amount].to_f
        raise "Max discount amount must be greater than or equal to 0" if attributes[:max_discount_amount] < 0
      end

      # Min order amount
      if row_hash[:min_order_amount].present?
        attributes[:min_order_amount] = row_hash[:min_order_amount].to_f
        raise "Min order amount must be greater than or equal to 0" if attributes[:min_order_amount] < 0
      end

      # Dates
      if row_hash[:valid_from].present?
        begin
          attributes[:valid_from] = parse_date(row_hash[:valid_from])
        rescue => e
          raise "Invalid valid_from date: #{e.message}"
        end
      end

      if row_hash[:valid_until].present?
        begin
          attributes[:valid_until] = parse_date(row_hash[:valid_until])
        rescue => e
          raise "Invalid valid_until date: #{e.message}"
        end
      end

      # Validate date range if both dates are present
      if attributes[:valid_from] && attributes[:valid_until]
        if attributes[:valid_from] > attributes[:valid_until]
          raise "Valid from date must be before valid until date"
        end
      end

      # Is active (default to true if not specified)
      is_active = row_hash[:is_active]&.to_s&.strip&.downcase
      attributes[:is_active] = is_active.blank? ? true : ["true", "1", "yes", "y"].include?(is_active)

      # Package IDs (comma-separated)
      if row_hash[:package_ids].present?
        package_input = row_hash[:package_ids].to_s.strip

        # Check if it's the "Multiple packages" indicator
        if package_input == "--- Multiple packages (enter IDs manually) ---"
          # User selected the multiple packages option, they should enter IDs manually
          # We'll leave it empty for them to fill in
          attributes[:package_ids] = []
        elsif package_input.match?(/^\d+(,\d+)*$/)
          # Already in ID format (comma-separated numbers)
          package_ids = package_input.split(",").map(&:strip).compact_blank
          attributes[:package_ids] = package_ids.map(&:to_i) if package_ids.any?
        else
          # Try to parse as package names (format: "Service Name - Package Name")
          package_names = package_input.split(",").map(&:strip).compact_blank
          package_ids = []

          package_names.each do |name|
            # Parse the service and package name
            if name =~ /^(.+) - (.+)$/
              service_name = $1.strip
              package_name = $2.strip

              # Find the package
              package = Package.joins(:service)
                .where(services: {name: service_name})
                .where("LOWER(packages.name) = ?", package_name.downcase)
                .first

              package_ids << package.id if package
            end
          end

          attributes[:package_ids] = package_ids if package_ids.any?
        end
      end

      attributes
    end

    # Parses date from various formats
    # @param date_string [String] the date string to parse
    # @return [DateTime] parsed datetime
    def parse_date(date_string)
      # Try different date formats
      formats = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"]

      formats.each do |format|
        return DateTime.strptime(date_string.to_s.strip, format)
      rescue ArgumentError
        # Try next format
      end

      # Try parsing with Ruby's default parser
      DateTime.parse(date_string.to_s)
    end

    # Builds a voucher hash with associated packages
    # @param voucher [Voucher] the voucher model instance
    # @return [Hash] voucher hash with packages
    def build_voucher(voucher)
      voucher_hash = voucher.attributes

      # Include associated packages
      if voucher.packages.loaded?
        voucher_hash[:packages] = voucher.packages.map do |package|
          package.attributes.slice("id", "name", "number_of_visit")
        end
      end

      voucher_hash
    end

    # Deep transforms hash keys based on format
    # @param value [Object] the value to transform
    # @param format [Symbol] the key format (:camel or :snake)
    # @return [Object] transformed value
    def deep_transform_keys_format(value, format:)
      return value unless value.respond_to?(:deep_transform_keys)

      transformer =
        case format&.to_sym
        when :camel
          ->(key) { key.to_s.camelize(:lower) }
        when :snake
          ->(key) { key.to_s.underscore }
        end

      return value unless transformer
      value.deep_transform_keys(&transformer)
    end

    # Soft deletes a voucher by setting deleted_at timestamp
    # @param id [String, Integer] the voucher ID to delete
    # @return [Hash] hash with :success boolean and either :voucher or :errors
    def destroy(id)
      voucher = Voucher.find(id)

      Rails.logger.info(
        "[VouchersService] VOUCHER_DELETED: " \
        "id=#{id} " \
        "code='#{voucher.code}' " \
        "performed_by=current_user"
      )

      voucher.update(deleted_at: Time.current)
      response = {
        success: true,
        voucher: build_voucher(voucher)
      }
      deep_transform_keys_format(response, format: @key_format)
    rescue ActiveRecord::RecordNotFound
      {
        success: false,
        errors: {fullMessages: ["Voucher not found."]}
      }
    rescue => e
      Rails.logger.error(
        "[VouchersService] DELETE_VOUCHER_FAILED: " \
        "id=#{id} " \
        "error='#{e.message}' " \
        "backtrace=#{e.backtrace&.first(3)&.join(", ")}"
      )
      {
        success: false,
        errors: {fullMessages: ["Unable to delete voucher. Please try again."]}
      }
    end
  end
end
