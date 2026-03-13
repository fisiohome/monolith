require "test_helper"

class AdminPortal::UpdatePaymentStatusServiceExternalApiTest < ActiveSupport::TestCase
  def setup
    @user = users(:admin_user)

    # Create minimal test appointment with order association
    @appointment = Appointment.new(
      registration_number: "REG-123456",
      appointment_date_time: 1.day.from_now,
      status: "pending_payment"
    )
    @appointment.save(validate: false)

    # Create order separately and associate through registration_number
    @order = Order.new(
      registration_number: "REG-123456",
      patient_id: SecureRandom.uuid,
      package_id: 1,
      package_base_price: 500000,
      subtotal: 5000000,
      total_amount: 5000000,
      payment_status: "UNPAID",
      status: "CONFIRMED"
    )
    @order.save(validate: false)

    @service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "PAID")
  end

  def teardown
    @appointment&.destroy
    @order&.destroy
  end

  test "should validate payment status as PAID" do
    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "PAID")
    assert service.send(:valid_payment_status?)
  end

  test "should validate payment status as UNPAID" do
    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "UNPAID")
    assert service.send(:valid_payment_status?)
  end

  test "should validate payment status as PARTIALLY_PAID" do
    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "PARTIALLY_PAID")
    assert service.send(:valid_payment_status?)
  end

  test "should validate payment status as OVERPAID" do
    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "OVERPAID")
    assert service.send(:valid_payment_status?)
  end

  test "should validate payment status as REFUNDED" do
    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "REFUNDED")
    assert service.send(:valid_payment_status?)
  end

  test "should reject invalid payment status" do
    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "INVALID")
    assert_not service.send(:valid_payment_status?)
  end

  test "should return error for invalid payment status" do
    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "INVALID")
    result = service.call

    assert_not result[:success]
    assert_includes result[:error], "Invalid payment status. Must be one of:"
    assert_includes result[:error], "UNPAID"
    assert_includes result[:error], "PAID"
    assert_includes result[:error], "PARTIALLY_PAID"
    assert_includes result[:error], "OVERPAID"
    assert_includes result[:error], "REFUNDED"
  end

  test "should construct correct API endpoint path" do
    expected_path = "api/v1/bookings/#{@order.id}/payment-status"

    # Mock the FisiohomeApi::Client to capture the path
    mock_response = OpenStruct.new(success?: true, body: {}, status: 200)
    FisiohomeApi::Client.expects(:put).with(expected_path, body: {payment_status: "PAID"}).returns(mock_response)

    result = @service.call
    assert result[:success]
  end

  test "should construct correct payload" do
    mock_response = OpenStruct.new(success?: true, body: {}, status: 200)
    FisiohomeApi::Client.expects(:put).with(anything, body: {payment_status: "PAID"}).returns(mock_response)

    result = @service.call
    assert result[:success]
  end

  test "should handle successful API response" do
    mock_response = OpenStruct.new(success?: true, body: {status: "updated"}, status: 200)
    FisiohomeApi::Client.stubs(:put).returns(mock_response)

    result = @service.call

    assert result[:success]
    assert_equal "Payment status updated to PAID successfully.", result[:message]
    assert_equal mock_response.body, result[:data]
  end

  test "should handle API error responses" do
    # Test 404 error
    mock_response = OpenStruct.new(success?: false, body: {}, status: 404)
    FisiohomeApi::Client.stubs(:put).returns(mock_response)

    result = @service.call

    assert_not result[:success]
    assert_equal "Order not found", result[:error]
    assert_equal 404, result[:status_code]
  end

  test "should handle validation errors from API" do
    error_body = {
      "errors" => [
        {"message" => "Payment status is invalid"},
        {"message" => "Order already paid"}
      ]
    }
    mock_response = OpenStruct.new(success?: false, body: error_body, status: 422)
    FisiohomeApi::Client.stubs(:put).returns(mock_response)

    result = @service.call

    assert_not result[:success]
    assert_includes result[:error], "Payment status is invalid"
    assert_includes result[:error], "Order already paid"
  end

  test "should update local appointment status when payment status is PAID" do
    @appointment.update!(status: "pending_payment")

    mock_response = OpenStruct.new(success?: true, body: {}, status: 200)
    FisiohomeApi::Client.stubs(:put).returns(mock_response)

    result = @service.call

    assert result[:success]
    @appointment.reload
    assert_equal "paid", @appointment.status
  end

  test "should update local appointment status when payment status is UNPAID" do
    @appointment.update!(status: "paid")

    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "UNPAID")
    mock_response = OpenStruct.new(success?: true, body: {}, status: 200)
    FisiohomeApi::Client.stubs(:put).returns(mock_response)

    result = service.call

    assert result[:success]
    @appointment.reload
    assert_equal "pending_payment", @appointment.status
  end

  test "should not update local status if already correct" do
    @appointment.update!(status: "paid")

    mock_response = OpenStruct.new(success?: true, body: {}, status: 200)
    FisiohomeApi::Client.stubs(:put).returns(mock_response)

    # This should not trigger local status update since it's already paid
    @appointment.expects(:update!).never

    result = @service.call
    assert result[:success]
  end

  test "should handle exceptions gracefully" do
    FisiohomeApi::Client.stubs(:put).raises(StandardError.new("Network error"))

    result = @service.call

    assert_not result[:success]
    assert_includes result[:error], "An unexpected error occurred: Network error"
  end

  test "should extract appropriate error messages for different status codes" do
    service = AdminPortal::UpdatePaymentStatusServiceExternalApi.new(@appointment, @user, "PAID")

    # Test 400 error
    response_400 = OpenStruct.new(success?: false, body: {}, status: 400)
    assert_equal "Bad request: Invalid parameters", service.send(:extract_error_message, response_400)

    # Test 401 error
    response_401 = OpenStruct.new(success?: false, body: {}, status: 401)
    assert_equal "Authentication failed: Invalid API credentials", service.send(:extract_error_message, response_401)

    # Test 403 error
    response_403 = OpenStruct.new(success?: false, body: {}, status: 403)
    assert_equal "Access forbidden: Insufficient permissions", service.send(:extract_error_message, response_403)

    # Test 500 error
    response_500 = OpenStruct.new(success?: false, body: {}, status: 500)
    assert_equal "Server error: Please try again later", service.send(:extract_error_message, response_500)
  end
end
