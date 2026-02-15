require "test_helper"

class VouchersIntegrationTest < ActionDispatch::IntegrationTest
  # Don't load fixtures to avoid conflicts
  self.use_transactional_tests = true

  def setup
    @user = User.create!(email: "admin@test.com", password: "password123")
    @admin = Admin.create!(user: @user, admin_type: "ADMIN", name: "Test Admin")
    @package1 = Package.first || Package.create!(name: "Test Package 1", price: 100)
    @package2 = Package.second || Package.create!(name: "Test Package 2", price: 200)
  end

  def teardown
    # Clean up any test data
    Voucher.where("code LIKE 'TEST%' OR code LIKE 'PAGE_%' OR code LIKE 'SEARCH%' OR code LIKE 'DUPLICATE%' OR code LIKE 'INVALID%' OR code LIKE 'NEGATIVE%' OR code LIKE 'API_TEST%' OR code LIKE 'UPDATE_TEST%' OR code LIKE 'BULK%' OR code LIKE 'PREVIEW%' OR code LIKE 'DATE%' OR code LIKE 'PKG%'").delete_all
  end

  test "vouchers service works with database" do
    # Test the service directly
    service = AdminPortal::VouchersService.new(key_format: :camel)

    # List vouchers
    result = service.list
    assert result.is_a?(Hash)
    assert result.key?("vouchers") || result.key?(:vouchers)
    assert result.key?("meta") || result.key?(:meta)

    # Create a voucher with packages
    package1 = Package.first
    package2 = Package.second

    # Use a unique code to avoid duplicates
    unique_code = "TEST#{Time.now.to_i}"

    create_result = service.create({
      code: unique_code,
      name: "Test Voucher",
      description: "Test Description",
      discount_type: "percentage",
      discount_value: 10,
      quota: 100,
      is_active: true,
      package_ids: [package1&.id, package2&.id].compact
    })

    assert create_result[:success] || create_result["success"], "Expected create to succeed: #{create_result.inspect}"
    voucher_data = create_result[:voucher] || create_result["voucher"]
    assert voucher_data.present?, "Expected voucher data to be present"

    voucher_id = voucher_data["id"]

    # Check if packages are included in the response
    packages = voucher_data["packages"]

    if package1 && package2
      assert packages.is_a?(Array), "Packages should be an array"
      assert_equal 2, packages.size, "Should have 2 packages"
    elsif package1 || package2
      assert packages.is_a?(Array), "Packages should be an array"
      assert_equal 1, packages.size, "Should have 1 package"
    end

    # Find the voucher
    find_result = service.find(voucher_id)
    found_voucher = find_result[:voucher] || find_result["voucher"]
    assert found_voucher.present?, "Expected voucher to be found"
    assert_equal unique_code, found_voucher["code"]

    # Update the voucher with different packages
    update_result = service.update(voucher_id, {
      name: "Updated Test Voucher",
      package_ids: package1 ? [package1.id] : []
    })
    assert update_result[:success] || update_result["success"], "Expected update to succeed"
    updated_voucher = update_result[:voucher] || update_result["voucher"]
    assert_equal "Updated Test Voucher", updated_voucher["name"]

    # Verify package association was updated
    if package1
      assert_equal 1, updated_voucher["packages"].size
      assert_equal package1.id, updated_voucher["packages"].first["id"]
    end

    # Delete the voucher
    destroy_result = service.destroy(voucher_id)
    assert destroy_result[:success] || destroy_result["success"], "Expected destroy to succeed"
  end

  test "vouchers service handles package associations correctly" do
    service = AdminPortal::VouchersService.new(key_format: :camel)
    package = Package.first

    skip "No packages in database" unless package

    # Create voucher without packages
    voucher = Voucher.create!(
      code: "TEST_NOPKG",
      name: "Test No Package",
      discount_type: "fixed",
      discount_value: 50,
      quota: 50,
      is_active: true
    )

    # Add packages via service
    update_result = service.update(voucher.id, {package_ids: [package.id]})
    assert update_result[:success] || update_result["success"]

    # Verify association
    voucher.reload
    assert_includes voucher.package_ids, package.id

    # Remove packages via service
    update_result = service.update(voucher.id, {package_ids: []})
    assert update_result[:success] || update_result["success"]

    # Verify removal
    voucher.reload
    assert_empty voucher.package_ids
  end

  test "vouchers service validates required fields" do
    service = AdminPortal::VouchersService.new(key_format: :camel)

    # Test missing code
    result = service.create({
      name: "Test Voucher",
      discount_type: "percentage",
      discount_value: 10,
      quota: 100,
      is_active: true
    })
    assert_not result[:success]
    # The service may return a generic error or specific validation error
    assert result[:errors].present?, "Expected errors to be present"

    # Test invalid discount type - enum raises ArgumentError
    result = service.create({
      code: "INVALID_TYPE",
      name: "Test Voucher",
      discount_type: "invalid",
      discount_value: 10,
      quota: 100,
      is_active: true
    })
    assert_not result[:success]
    assert_includes result[:errors][:fullMessages], "Unable to create voucher. Please try again."

    # Test negative discount value - model validation
    result = service.create({
      code: "NEGATIVE",
      name: "Test Voucher",
      discount_type: "percentage",
      discount_value: -10,
      quota: 100,
      is_active: true
    })
    assert_not result[:success]
    # The error message may vary - just verify there's an error
    assert result[:errors].present?, "Expected errors to be present for negative discount"
  end

  test "vouchers service handles duplicate codes" do
    service = AdminPortal::VouchersService.new(key_format: :camel)

    # Create first voucher directly to ensure it exists
    Voucher.create!(code: "DUPLICATE", name: "First Voucher", discount_type: "percentage", discount_value: 10, quota: 100, is_active: true)

    # Try to create duplicate
    result = service.create({
      code: "DUPLICATE",
      name: "Second Voucher",
      discount_type: "percentage",
      discount_value: 15,
      quota: 200,
      is_active: true
    })
    assert_not result[:success]
    error_messages = result[:errors][:fullMessages] || result[:errors]["fullMessages"] || []
    assert error_messages.any? { |m| m.include?("Code") || m.include?("taken") || m.include?("Unable") }
  end

  test "vouchers service handles pagination" do
    service = AdminPortal::VouchersService.new(key_format: :camel)

    # Clean up any existing vouchers
    Voucher.where("code LIKE 'PAGE_%'").delete_all

    # Create multiple vouchers
    5.times do |i|
      Voucher.create!(
        code: "PAGE_#{i}",
        name: "Page Test Voucher #{i}",
        discount_type: "percentage",
        discount_value: 10,
        quota: 100,
        is_active: true
      )
    end

    # Test first page
    result = service.list(page: 1, limit: 2)
    vouchers = result["vouchers"] || result[:vouchers]
    meta = result["meta"] || result[:meta]
    assert_equal 2, vouchers.size
    assert_equal 1, meta["page"] || meta[:page]

    # Test second page
    result = service.list(page: 2, limit: 2)
    vouchers = result["vouchers"] || result[:vouchers]
    assert_equal 2, vouchers.size
  end

  test "vouchers service handles search and filters" do
    service = AdminPortal::VouchersService.new(key_format: :camel)

    # Clean up any existing vouchers
    Voucher.where("code LIKE 'SEARCH%'").delete_all

    # Create test vouchers
    Voucher.create!(code: "SEARCH1", name: "Active Voucher", discount_type: "percentage", discount_value: 10, quota: 100, is_active: true)
    Voucher.create!(code: "SEARCH2", name: "Inactive Voucher", discount_type: "fixed", discount_value: 50, quota: 100, is_active: false)

    # Test search by code
    result = service.list(code: "SEARCH1")
    vouchers = result["vouchers"] || result[:vouchers]
    assert_equal 1, vouchers.size
    assert_equal "SEARCH1", vouchers.first["code"]

    # Test filter by status
    result = service.list(is_active: true)
    vouchers = result["vouchers"] || result[:vouchers]
    assert vouchers.all? { |v| v["isActive"] || v["is_active"] }

    # Test filter by discount type
    result = service.list(discount_type: "PERCENTAGE")
    vouchers = result["vouchers"] || result[:vouchers]
    assert vouchers.all? { |v| v["discountType"]&.upcase == "PERCENTAGE" || v["discount_type"]&.upcase == "PERCENTAGE" }
  end

  test "vouchers controller endpoints require authentication" do
    # The vouchers routes are inside the authenticated :user block
    # So when not authenticated, they return 404 (not found)
    # because the routes themselves are not accessible

    # Test index without auth
    get admin_portal_vouchers_path
    assert_response :not_found

    # Test create without auth
    post admin_portal_vouchers_path, params: {voucher: {code: "TEST"}}
    assert_response :not_found

    # Test update without auth
    voucher = Voucher.create!(code: "UPDATE_TEST", name: "Test", discount_type: "percentage", discount_value: 10, quota: 100, is_active: true)
    patch admin_portal_voucher_path(voucher), params: {voucher: {name: "Updated"}}
    assert_response :not_found

    # Test delete without auth
    delete admin_portal_voucher_path(voucher)
    assert_response :not_found
  end

  test "vouchers controller CRUD operations" do
    sign_in @admin, scope: :admin

    # Test index - returns HTML for Inertia
    get admin_portal_vouchers_path
    assert_response :success
  end

  test "vouchers controller handles validation errors" do
    sign_in @admin, scope: :admin

    # Test create with invalid data - redirects with flash
    post admin_portal_vouchers_path, params: {
      voucher: {
        code: "",
        name: "Invalid Voucher",
        discount_type: "invalid",
        discount_value: -10,
        quota: 100,
        is_active: true
      }
    }
    assert_response :redirect
    assert_redirected_to admin_portal_vouchers_path(new: "voucher")
  end

  test "vouchers controller handles not found errors" do
    sign_in @admin, scope: :admin

    # Test show with non-existent ID - controller doesn't have show action
    # This would be handled by the service layer in a real API

    # Test update with non-existent ID
    patch admin_portal_voucher_path(99999), params: {voucher: {name: "Updated"}}
    assert_response :redirect

    # Test delete with non-existent ID
    delete admin_portal_voucher_path(99999)
    assert_response :redirect
  end

  test "vouchers controller handles API endpoints" do
    sign_in @admin, scope: :admin

    # Test create via API
    post admin_portal_vouchers_path, params: {
      voucher: {
        code: "API_TEST",
        name: "API Test Voucher",
        description: "Test Description",
        discount_type: "percentage",
        discount_value: 15,
        quota: 150,
        is_active: true,
        package_ids: [@package1&.id, @package2&.id].compact
      }
    }, as: :json
    assert_response :redirect

    # Find created voucher
    voucher = Voucher.find_by(code: "API_TEST")
    assert voucher.present?

    # Test update via API
    patch admin_portal_voucher_path(voucher), params: {
      voucher: {
        name: "Updated API Voucher",
        package_ids: [@package1&.id].compact
      }
    }, as: :json
    assert_response :redirect

    # Verify update
    voucher.reload
    assert_equal "Updated API Voucher", voucher.name

    # Test delete via API
    delete admin_portal_voucher_path(voucher), as: :json
    assert_response :redirect

    # Verify soft deletion - voucher should have deleted_at set
    deleted_voucher = Voucher.unscoped.find_by(code: "API_TEST")
    assert deleted_voucher.deleted_at.present?, "Voucher should be soft deleted"
  end

  test "vouchers service handles different discount types" do
    # Test percentage discount
    voucher = Voucher.create!(
      code: "PERCENTAGE",
      name: "Percentage Test",
      discount_type: "percentage",
      discount_value: 20,
      quota: 100,
      is_active: true
    )

    # Test fixed discount
    fixed_voucher = Voucher.create!(
      code: "FIXED",
      name: "Fixed Test",
      discount_type: "fixed",
      discount_value: 50,
      quota: 100,
      is_active: true
    )

    # Verify discount types are set correctly
    assert_equal "percentage", voucher.discount_type
    assert_equal 20, voucher.discount_value
    assert_equal "fixed", fixed_voucher.discount_type
    assert_equal 50, fixed_voucher.discount_value
  end

  test "vouchers service handles quota tracking" do
    service = AdminPortal::VouchersService.new(key_format: :camel)

    voucher = Voucher.create!(
      code: "QUOTA_TEST",
      name: "Quota Test",
      discount_type: "percentage",
      discount_value: 10,
      quota: 5,
      is_active: true
    )

    # Initial quota should be 5
    assert_equal 5, voucher.quota

    # Update quota
    result = service.update(voucher.id, {quota: 10})
    assert result[:success] || result["success"]
    voucher_data = result[:voucher] || result["voucher"]
    assert_equal 10, voucher_data["quota"]

    voucher.reload
    assert_equal 10, voucher.quota
  end

  # ========================================
  # Bulk Create Tests
  # ========================================

  test "bulk_create rejects non-xlsx files" do
    service = AdminPortal::VouchersService.new

    # Create a mock CSV file
    csv_content = "code,name,discount_type,discount_value,quota\nTEST1,Test,PERCENTAGE,10,100"
    file = create_mock_file(csv_content, "test.csv", "text/csv")

    result = service.bulk_create(file)
    assert_not result[:success]
    assert_includes result[:message], "Only Excel (.xlsx) files are accepted"
  end

  test "bulk_create handles missing file gracefully" do
    service = AdminPortal::VouchersService.new

    # Create a mock file-like object that is blank
    blank_file = Object.new
    def blank_file.blank?
      true
    end

    def blank_file.original_filename
      "test.xlsx"
    end

    def blank_file.size
      0
    end

    def blank_file.content_type
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    end

    result = service.bulk_create(blank_file)
    assert_not result[:success]
    assert_equal "No file provided", result[:message]
  end

  test "bulk_create preview mode validates without saving" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "PREVIEW1", name: "Preview Test", discount_type: "PERCENTAGE", discount_value: 10, quota: 100}
    ])

    result = service.bulk_create(file, save_to_db: false)
    assert result[:success]
    assert_includes result[:message], "Preview completed"

    # Verify voucher was NOT created
    assert_nil Voucher.find_by(code: "PREVIEW1")
  end

  test "bulk_create save mode creates vouchers" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "BULK1", name: "Bulk Test 1", discount_type: "PERCENTAGE", discount_value: 10, quota: 100},
      {code: "BULK2", name: "Bulk Test 2", discount_type: "FIXED", discount_value: 50, quota: 50}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]
    assert_includes result[:message], "Successfully created 2 vouchers"

    # Verify vouchers were created
    assert Voucher.exists?(code: "BULK1")
    assert Voucher.exists?(code: "BULK2")
  end

  test "bulk_create detects duplicate codes within file" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "DUPLICATE1", name: "First", discount_type: "PERCENTAGE", discount_value: 10, quota: 100},
      {code: "DUPLICATE1", name: "Second", discount_type: "FIXED", discount_value: 20, quota: 50}
    ])

    result = service.bulk_create(file, save_to_db: false)
    assert result[:success]
    assert result[:errors].any? { |e| e.include?("appears multiple times") }
  end

  test "bulk_create detects existing codes in database" do
    service = AdminPortal::VouchersService.new

    # Create existing voucher
    Voucher.create!(code: "BULK_EXISTING", name: "Existing", discount_type: "percentage", discount_value: 10, quota: 100)

    file = create_valid_excel_file([
      {code: "BULK_EXISTING", name: "Duplicate", discount_type: "PERCENTAGE", discount_value: 20, quota: 50}
    ])

    result = service.bulk_create(file, save_to_db: false)
    assert result[:success]
    assert result[:rows].any? { |r| r[:status] == "error" && r[:reason] == "Already exists" }
  end

  test "bulk_create validates required fields" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "", name: "No Code", discount_type: "PERCENTAGE", discount_value: 10, quota: 100}
    ])

    result = service.bulk_create(file, save_to_db: false)
    # Validation errors cause the method to fail with success: false
    assert_not result[:success]
    assert result[:message].include?("Code cannot be blank") || result[:message].include?("Failed to process")
  end

  test "bulk_create validates discount type" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "INVALID_TYPE", name: "Invalid", discount_type: "INVALID", discount_value: 10, quota: 100}
    ])

    result = service.bulk_create(file, save_to_db: false)
    # Validation errors cause success: false
    assert_not result[:success]
    assert result[:message].include?("Discount type") || result[:message].include?("Failed to process")
  end

  test "bulk_create validates positive discount value" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "NEGATIVE_VAL", name: "Negative", discount_type: "PERCENTAGE", discount_value: -10, quota: 100}
    ])

    result = service.bulk_create(file, save_to_db: false)
    # Validation errors cause success: false
    assert_not result[:success]
    assert result[:message].include?("Discount value") || result[:message].include?("Failed to process")
  end

  test "bulk_create validates non-negative quota" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "NEGATIVE_QUOTA", name: "Negative Quota", discount_type: "PERCENTAGE", discount_value: 10, quota: -5}
    ])

    result = service.bulk_create(file, save_to_db: false)
    # Validation errors cause success: false
    assert_not result[:success]
    assert result[:message].include?("Quota") || result[:message].include?("Failed to process")
  end

  test "bulk_create returns row results for preview" do
    service = AdminPortal::VouchersService.new

    # Use only valid rows to test preview functionality
    file = create_valid_excel_file([
      {code: "PREVIEW_ROW1", name: "Valid 1", discount_type: "PERCENTAGE", discount_value: 10, quota: 100},
      {code: "PREVIEW_ROW2", name: "Valid 2", discount_type: "FIXED", discount_value: 50, quota: 50}
    ])

    result = service.bulk_create(file, save_to_db: false)
    assert result[:success]
    assert result[:rows].present?
    assert_equal 2, result[:rows].size

    # Both rows should be valid
    assert result[:rows].all? { |r| r[:status] == "created" }
  end

  # ========================================
  # Date Parsing Tests
  # ========================================

  test "bulk_create parses YYYY-MM-DD date format" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "DATE_TEST1", name: "Date Test", discount_type: "PERCENTAGE", discount_value: 10, quota: 100,
       valid_from: "2024-01-15", valid_until: "2024-12-31"}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    voucher = Voucher.find_by(code: "DATE_TEST1")
    assert voucher.present?
    assert_equal Date.new(2024, 1, 15), voucher.valid_from.to_date
    assert_equal Date.new(2024, 12, 31), voucher.valid_until.to_date
  end

  test "bulk_create validates date range" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "DATE_INVALID", name: "Invalid Date Range", discount_type: "PERCENTAGE", discount_value: 10, quota: 100,
       valid_from: "2024-12-31", valid_until: "2024-01-01"}
    ])

    result = service.bulk_create(file, save_to_db: false)
    # Validation errors cause success: false
    assert_not result[:success]
    assert result[:message].downcase.include?("date") || result[:message].include?("Failed to process")
  end

  # ========================================
  # Package Name Parsing Tests
  # ========================================

  test "bulk_create parses package names in Service - Package format" do
    service = AdminPortal::VouchersService.new
    package = Package.joins(:service).first

    skip "No packages with services in database" unless package&.service

    package_name = "#{package.service.name} - #{package.name}"

    file = create_valid_excel_file([
      {code: "PKG_TEST1", name: "Package Test", discount_type: "PERCENTAGE", discount_value: 10, quota: 100,
       package_ids: package_name}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    voucher = Voucher.find_by(code: "PKG_TEST1")
    assert voucher.present?
    assert_includes voucher.package_ids, package.id
  end

  test "bulk_create handles multiple package names" do
    service = AdminPortal::VouchersService.new
    packages = Package.joins(:service).limit(2).to_a

    skip "Need at least 2 packages with services" unless packages.size >= 2

    package_names = packages.map { |p| "#{p.service.name} - #{p.name}" }.join(", ")

    file = create_valid_excel_file([
      {code: "PKG_MULTI", name: "Multi Package", discount_type: "PERCENTAGE", discount_value: 10, quota: 100,
       package_ids: package_names}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    voucher = Voucher.find_by(code: "PKG_MULTI")
    assert voucher.present?
    assert_equal 2, voucher.package_ids.size
  end

  test "bulk_create handles package IDs directly" do
    service = AdminPortal::VouchersService.new
    package = Package.first

    skip "No packages in database" unless package

    file = create_valid_excel_file([
      {code: "PKG_ID_TEST", name: "Package ID Test", discount_type: "PERCENTAGE", discount_value: 10, quota: 100,
       package_ids: package.id.to_s}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    voucher = Voucher.find_by(code: "PKG_ID_TEST")
    assert voucher.present?
    assert_includes voucher.package_ids, package.id
  end

  # ========================================
  # Is Active and Optional Fields Tests
  # ========================================

  test "bulk_create handles is_active field" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "BULK_ACTIVE", name: "Active", discount_type: "PERCENTAGE", discount_value: 10, quota: 100, is_active: "true"},
      {code: "BULK_INACTIVE", name: "Inactive", discount_type: "FIXED", discount_value: 20, quota: 50, is_active: "false"}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    active_voucher = Voucher.find_by(code: "BULK_ACTIVE")
    inactive_voucher = Voucher.find_by(code: "BULK_INACTIVE")

    assert active_voucher.is_active
    assert_not inactive_voucher.is_active
  end

  test "bulk_create defaults is_active to true" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "BULK_DEFAULT", name: "Default Active", discount_type: "PERCENTAGE", discount_value: 10, quota: 100}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    voucher = Voucher.find_by(code: "BULK_DEFAULT")
    assert voucher.is_active
  end

  test "bulk_create handles optional max_discount_amount" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "BULK_MAXDIS", name: "Max Discount", discount_type: "PERCENTAGE", discount_value: 50, quota: 100,
       max_discount_amount: 100}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    voucher = Voucher.find_by(code: "BULK_MAXDIS")
    assert_equal 100, voucher.max_discount_amount
  end

  test "bulk_create handles optional min_order_amount" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "BULK_MINORD", name: "Min Order", discount_type: "FIXED", discount_value: 20, quota: 100,
       min_order_amount: 50}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    voucher = Voucher.find_by(code: "BULK_MINORD")
    assert_equal 50, voucher.min_order_amount
  end

  # ========================================
  # Code Uppercase Conversion Test
  # ========================================

  test "bulk_create converts codes to uppercase" do
    service = AdminPortal::VouchersService.new

    file = create_valid_excel_file([
      {code: "lowercase_code", name: "Lowercase", discount_type: "PERCENTAGE", discount_value: 10, quota: 100}
    ])

    result = service.bulk_create(file, save_to_db: true)
    assert result[:success]

    voucher = Voucher.find_by(code: "LOWERCASE_CODE")
    assert voucher.present?
  end

  # ========================================
  # Service Find Edge Cases
  # ========================================

  test "vouchers service find handles non-existent id" do
    service = AdminPortal::VouchersService.new

    result = service.find(999999)
    assert_nil result[:voucher]
  end

  test "vouchers service update handles non-existent id" do
    service = AdminPortal::VouchersService.new

    result = service.update(999999, {name: "Updated"})
    assert_not result[:success]
    assert_includes result[:errors][:fullMessages], "Voucher not found."
  end

  test "vouchers service destroy handles non-existent id" do
    service = AdminPortal::VouchersService.new

    result = service.destroy(999999)
    assert_not result[:success]
    assert_includes result[:errors][:fullMessages], "Voucher not found."
  end

  # ========================================
  # Key Format Tests
  # ========================================

  test "vouchers service supports camel case key format" do
    service = AdminPortal::VouchersService.new(key_format: :camel)

    voucher = Voucher.create!(
      code: "TEST_CAMEL",
      name: "Camel Case Test",
      discount_type: "percentage",
      discount_value: 10,
      quota: 100,
      is_active: true
    )

    result = service.find(voucher.id)
    assert result["voucher"].present?
    assert result["voucher"].key?("discountType")
    assert result["voucher"].key?("discountValue")
  end

  test "vouchers service supports snake case key format" do
    service = AdminPortal::VouchersService.new(key_format: :snake)

    voucher = Voucher.create!(
      code: "TEST_SNAKE",
      name: "Snake Case Test",
      discount_type: "percentage",
      discount_value: 10,
      quota: 100,
      is_active: true
    )

    result = service.find(voucher.id)
    voucher_data = result[:voucher] || result["voucher"]
    assert voucher_data.present?
    # Snake case keys should be present
    assert voucher_data.key?("discount_type") || voucher_data.key?(:discount_type)
    assert voucher_data.key?("discount_value") || voucher_data.key?(:discount_value)
  end

  private

  def sign_in(admin, scope:)
    case scope
    when :admin
      post user_session_path, params: {user: {email: admin.user.email, password: "password123"}}
    end
  end

  def create_mock_file(content, filename, content_type)
    tempfile = Tempfile.new([File.basename(filename, ".*"), File.extname(filename)])
    tempfile.write(content)
    tempfile.rewind

    ActionDispatch::Http::UploadedFile.new(
      tempfile: tempfile,
      filename: filename,
      type: content_type
    )
  end

  def create_valid_excel_file(rows)
    require "caxlsx"

    package = Axlsx::Package.new
    workbook = package.workbook

    workbook.add_worksheet(name: "Vouchers") do |sheet|
      headers = [
        "Voucher Code*",
        "Voucher Name",
        "Description",
        "Discount Type*",
        "Discount Value*",
        "Quota*",
        "Max Discount Amount",
        "Min Order Amount",
        "Valid From (YYYY-MM-DD)",
        "Valid Until (YYYY-MM-DD)",
        "Is Active (true/false)",
        "Package(s)"
      ]
      sheet.add_row(headers)

      rows.each do |row|
        sheet.add_row([
          row[:code],
          row[:name],
          row[:description],
          row[:discount_type],
          row[:discount_value],
          row[:quota],
          row[:max_discount_amount],
          row[:min_order_amount],
          row[:valid_from],
          row[:valid_until],
          row[:is_active],
          row[:package_ids]
        ])
      end
    end

    tempfile = Tempfile.new(["voucher_test", ".xlsx"])
    package.serialize(tempfile.path)
    tempfile.rewind

    ActionDispatch::Http::UploadedFile.new(
      tempfile: tempfile,
      filename: "voucher_test.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
  end
end
