require "test_helper"

class AdminPortal::CreateAppointmentServiceExternalApiTest < ActiveSupport::TestCase
  # ---------------------------------------------------------------------------
  # Test Setup
  # ---------------------------------------------------------------------------

  def setup
    @therapist = therapists(:therapist_one)
    @service = services(:fisiohome)
    @package = packages(:basic_fisiohome)
    @location = locations(:jakarta_selatan)
    @current_user = users(:admin_user)
    @admin = admins(:super_admin)

    # Create a patient contact for testing existing patient
    @existing_patient_contact = PatientContact.create!(
      contact_name: "Existing Contact",
      contact_phone: "+6281234567890",
      email: "existing@example.com"
    )

    # Create an existing patient for testing
    @existing_patient = Patient.create!(
      name: "Existing Patient",
      date_of_birth: 30.years.ago.to_date,
      gender: "MALE",
      patient_contact: @existing_patient_contact
    )

    # Create an address for the existing patient
    @existing_address = Address.create!(
      location_id: @location.id,
      latitude: -6.2088,
      longitude: 106.8456,
      postal_code: "12345",
      address: "Test Address"
    )

    @existing_patient_address = @existing_patient.patient_addresses.create!(
      address: @existing_address,
      active: true
    )
  end

  def teardown
    # Clean up test-created records in proper order to respect foreign keys
    test_appointment_ids = Appointment.where("registration_number LIKE ?", "TEST-%").pluck(:id)
    if test_appointment_ids.any?
      # Delete drafts first since they reference appointments
      AppointmentDraft.where(appointment_id: test_appointment_ids).delete_all
      AppointmentAddressHistory.where(appointment_id: test_appointment_ids).delete_all
      AppointmentStatusHistory.where(appointment_id: test_appointment_ids).delete_all
      AppointmentPackageHistory.where(appointment_id: test_appointment_ids).delete_all
      AppointmentAdmin.where(appointment_id: test_appointment_ids).delete_all
      Appointment.where(id: test_appointment_ids).delete_all
    end
    AppointmentDraft.where(created_by_admin_id: @admin&.id).delete_all
  end

  # ---------------------------------------------------------------------------
  # Initialization Tests
  # ---------------------------------------------------------------------------

  test "should initialize with valid params" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    assert_not_nil service
  end

  test "should raise ParameterMissing for missing appointment key" do
    invalid_params = ActionController::Parameters.new({})

    assert_raises(ActionController::ParameterMissing) do
      AdminPortal::CreateAppointmentServiceExternalApi.new(invalid_params, @current_user)
    end
  end

  # ---------------------------------------------------------------------------
  # Patient Finding Tests (unit test find_or_initialize_patient)
  # ---------------------------------------------------------------------------

  test "should find existing patient by attributes" do
    params = build_params(
      patient: {
        name: @existing_patient.name,
        date_of_birth: @existing_patient.date_of_birth,
        gender: @existing_patient.gender
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    initial_count = Patient.count

    service.send(:find_or_initialize_patient)

    assert_equal initial_count, Patient.count
    assert_equal @existing_patient.id, service.instance_variable_get(:@patient).id
  end

  test "should create new patient with contact when patient does not exist" do
    params = build_params(
      patient: {
        name: "Brand New Patient",
        date_of_birth: 25.years.ago.to_date,
        gender: "FEMALE"
      },
      patient_contact: {
        contact_name: "New Contact",
        contact_phone: "+6289876543210",
        email: "brandnew@example.com"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    initial_patient_count = Patient.count
    initial_contact_count = PatientContact.count

    service.send(:find_or_initialize_patient)

    assert_equal initial_patient_count + 1, Patient.count
    assert_equal initial_contact_count + 1, PatientContact.count

    new_patient = service.instance_variable_get(:@patient)
    assert_equal "Brand New Patient", new_patient.name
    assert_equal "FEMALE", new_patient.gender
    assert_not_nil new_patient.patient_contact
    assert_equal "brandnew@example.com", new_patient.patient_contact.email
  end

  test "should find existing contact by email when creating new patient" do
    existing_contact = PatientContact.create!(
      contact_name: "Pre-existing Contact",
      contact_phone: "+6281111111111",
      email: "preexisting@example.com"
    )

    params = build_params(
      patient: {
        name: "Patient Using Existing Contact",
        date_of_birth: 28.years.ago.to_date,
        gender: "MALE"
      },
      patient_contact: {
        contact_name: "Different Name",
        contact_phone: "+6282222222222",
        email: "preexisting@example.com"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    initial_contact_count = PatientContact.count

    service.send(:find_or_initialize_patient)

    # Should not create new contact
    assert_equal initial_contact_count, PatientContact.count

    new_patient = service.instance_variable_get(:@patient)
    assert_equal existing_contact.id, new_patient.patient_contact_id
  end

  test "should find existing contact by phone when creating new patient" do
    # Use SecureRandom for truly unique values
    # The service strips non-digits from phone, so we need to store the stripped version
    unique_suffix = SecureRandom.hex(6)
    unique_phone_digits = "628#{SecureRandom.random_number(10**9).to_s.rjust(9, "0")}"
    unique_email = "phonecontact_#{unique_suffix}@example.com"
    unique_name = "Patient With Phone Match #{unique_suffix}"

    # Create contact with digits-only phone (as the service will search)
    existing_contact = PatientContact.create!(
      contact_name: "Phone Contact",
      contact_phone: unique_phone_digits,
      email: unique_email
    )

    params = build_params(
      patient: {
        name: unique_name,
        date_of_birth: 35.years.ago.to_date,
        gender: "FEMALE"
      },
      patient_contact: {
        contact_name: "Different Name",
        contact_phone: "+#{unique_phone_digits}",  # With + prefix, will be stripped
        email: nil
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    service.send(:find_or_initialize_patient)

    new_patient = service.instance_variable_get(:@patient)
    assert_equal existing_contact.id, new_patient.patient_contact_id
  end

  # ---------------------------------------------------------------------------
  # Patient Contact Upsert Tests
  # ---------------------------------------------------------------------------

  test "should return existing patient contact if already set" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    # Set up patient contact already
    service.instance_variable_set(:@patient_contact, @existing_patient_contact)

    result = service.send(:upsert_patient_contact)

    assert_equal @existing_patient_contact, result
  end

  test "should return patient's existing contact" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)

    result = service.send(:upsert_patient_contact)

    assert_equal @existing_patient.patient_contact, result
  end

  # ---------------------------------------------------------------------------
  # Patient Address Tests
  # ---------------------------------------------------------------------------

  test "should create new address when no matching address exists" do
    params = build_params(
      patient_address: {
        location_id: @location.id,
        latitude: -6.9999,
        longitude: 107.9999,
        postal_code: "99999",
        address: "Brand New Address"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)

    initial_address_count = Address.count

    service.send(:upsert_patient_address)

    assert_equal initial_address_count + 1, Address.count
    patient_address = service.instance_variable_get(:@patient_address)
    assert_not_nil patient_address
    assert patient_address.active?
  end

  test "should reuse existing address when coordinates match" do
    params = build_params(
      patient_address: {
        location_id: @existing_address.location_id,
        latitude: @existing_address.latitude,
        longitude: @existing_address.longitude,
        postal_code: @existing_address.postal_code,
        address: @existing_address.address
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)

    initial_address_count = Address.count

    service.send(:upsert_patient_address)

    assert_equal initial_address_count, Address.count
  end

  test "should update existing address attributes when found" do
    params = build_params(
      patient_address: {
        location_id: @existing_address.location_id,
        latitude: @existing_address.latitude,
        longitude: @existing_address.longitude,
        postal_code: "UPDATED",
        address: "Updated Address Text"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)

    service.send(:upsert_patient_address)

    @existing_address.reload
    assert_equal "UPDATED", @existing_address.postal_code
    assert_equal "Updated Address Text", @existing_address.address
  end

  test "should activate existing patient address if inactive" do
    @existing_patient_address.update!(active: false)

    params = build_params(
      patient_address: {
        location_id: @existing_address.location_id,
        latitude: @existing_address.latitude,
        longitude: @existing_address.longitude,
        postal_code: @existing_address.postal_code,
        address: @existing_address.address
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)

    service.send(:upsert_patient_address)

    @existing_patient_address.reload
    assert @existing_patient_address.active?
  end

  # ---------------------------------------------------------------------------
  # Booking Payload Tests
  # ---------------------------------------------------------------------------

  test "should build payload with all required fields" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    # Set up required instance variables
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal @current_user.id, payload[:user_id]
    assert_equal @existing_patient.id.to_s, payload[:patient_id]
    assert_equal @existing_patient_address.id, payload[:patient_address_id]
    assert_equal @service.id, payload[:service_id]
    assert_equal @package.id, payload[:package_id]
    assert_equal "bank_transfer", payload[:payment_method]
  end

  test "should include optional voucher code in payload" do
    params = build_params(
      appointment: {
        appointment_date_time: 3.days.from_now,
        voucher_code: "TEST123"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal "TEST123", payload[:voucher_code]
  end

  test "should include notes in payload when provided" do
    params = build_params(
      appointment: {
        appointment_date_time: 3.days.from_now,
        notes: "Special instructions"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal "Special instructions", payload[:notes]
  end

  test "should transform NO PREFERENCE to OTHER for preferred therapist gender" do
    params = build_params(
      appointment: {
        appointment_date_time: 3.days.from_now,
        preferred_therapist_gender: "NO PREFERENCE"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal "OTHER", payload[:preferred_therapist_gender]
  end

  test "should keep MALE and FEMALE gender preferences unchanged" do
    params = build_params(
      appointment: {
        appointment_date_time: 3.days.from_now,
        preferred_therapist_gender: "FEMALE"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal "FEMALE", payload[:preferred_therapist_gender]
  end

  test "should include series visits in payload" do
    params = build_params(
      appointment: {
        appointment_date_time: 3.days.from_now,
        series_visits: [
          {visit_number: 2, therapist_id: @therapist.id, appointment_date_time: 5.days.from_now},
          {visit_number: 3, therapist_id: @therapist.id, appointment_date_time: 7.days.from_now}
        ]
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal 3, payload[:visits].size
    assert_equal 1, payload[:visits][0][:visit_number]
    assert_equal 2, payload[:visits][1][:visit_number]
    assert_equal 3, payload[:visits][2][:visit_number]
  end

  test "should include referral source fields in payload" do
    params = build_params(
      appointment: {
        appointment_date_time: 3.days.from_now,
        referral_source: "SOCIAL_MEDIA",
        other_referral_source: "Instagram"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal "SOCIAL_MEDIA", payload[:referral_source]
    assert_equal "Instagram", payload[:other_referral_source]
  end

  test "should include fisiohome partner fields in payload" do
    params = build_params(
      appointment: {
        appointment_date_time: 3.days.from_now,
        fisiohome_partner_booking: true,
        fisiohome_partner_name: "Partner Name",
        other_fisiohome_partner_name: "Other Partner"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal true, payload[:fisiohome_partner_booking]
    assert_equal "Partner Name", payload[:fisiohome_partner_name]
    assert_equal "Other Partner", payload[:other_fisiohome_partner_name]
  end

  test "should include medical record fields in payload" do
    illness_date = 1.week.ago.to_date
    params = build_params(
      appointment: {
        appointment_date_time: 3.days.from_now,
        patient_illness_onset_date: illness_date,
        patient_complaint_description: "Back pain",
        patient_condition: "Moderate",
        patient_medical_history: "No previous issues"
      }
    )

    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)
    service.instance_variable_set(:@patient, @existing_patient)
    service.instance_variable_set(:@patient_address, @existing_patient_address)

    payload = service.send(:build_booking_payload)

    assert_equal illness_date, payload[:illness_onset_date]
    assert_equal "Back pain", payload[:complaint_description]
    assert_equal "Moderate", payload[:condition]
    assert_equal "No previous issues", payload[:medical_history]
  end

  # ---------------------------------------------------------------------------
  # Local Appointment Lookup Tests
  # ---------------------------------------------------------------------------

  test "should find appointment by ID from API response" do
    appointment = create_test_appointment

    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    api_response = {
      "appointments" => [{"appointment_id" => appointment.id}],
      "registration_number" => appointment.registration_number
    }

    found = service.send(:find_or_create_local_appointment, api_response)

    assert_equal appointment.id, found.id
  end

  test "should find appointment by registration number as fallback" do
    appointment = create_test_appointment

    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    api_response = {
      "appointments" => [],
      "registration_number" => appointment.registration_number
    }

    found = service.send(:find_or_create_local_appointment, api_response)

    assert_equal appointment.id, found.id
  end

  test "should return nil when appointment not found" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    api_response = {
      "appointments" => [{"appointment_id" => SecureRandom.uuid}],
      "registration_number" => "NONEXISTENT"
    }

    found = service.send(:find_or_create_local_appointment, api_response)

    assert_nil found
  end

  test "should handle empty appointments array in API response" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    api_response = {
      "appointments" => [],
      "registration_number" => nil
    }

    found = service.send(:find_or_create_local_appointment, api_response)

    assert_nil found
  end

  test "should handle symbol keys in API response" do
    appointment = create_test_appointment

    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    api_response = {
      appointments: [{appointment_id: appointment.id}],
      registration_number: appointment.registration_number
    }

    found = service.send(:find_or_create_local_appointment, api_response)

    assert_equal appointment.id, found.id
  end

  # ---------------------------------------------------------------------------
  # Admin Association Tests
  # ---------------------------------------------------------------------------

  test "should associate admins with appointment" do
    appointment = create_test_appointment

    params = build_params(admin_ids: @admin.id.to_s)
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    service.send(:associate_admins, appointment)

    assert AppointmentAdmin.exists?(appointment: appointment, admin_id: @admin.id)
  end

  test "should associate multiple admins with appointment" do
    appointment = create_test_appointment
    other_admin = admins(:admin)

    params = build_params(admin_ids: "#{@admin.id},#{other_admin.id}")
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    service.send(:associate_admins, appointment)

    assert AppointmentAdmin.exists?(appointment: appointment, admin_id: @admin.id)
    assert AppointmentAdmin.exists?(appointment: appointment, admin_id: other_admin.id)
  end

  test "should not associate admins when admin_ids is blank" do
    appointment = create_test_appointment

    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    initial_count = AppointmentAdmin.count
    service.send(:associate_admins, appointment)

    assert_equal initial_count, AppointmentAdmin.count
  end

  # ---------------------------------------------------------------------------
  # Draft Expiration Tests
  # ---------------------------------------------------------------------------

  test "should expire draft with appointment object" do
    appointment = create_test_appointment

    draft = AppointmentDraft.create!(
      admin_pic_id: @admin.id,
      created_by_admin_id: @admin.id,
      current_step: "patient_details",
      form_data: {test: "data"},
      status: :active
    )

    params = build_params(draft_id: draft.id)
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    service.send(:expire_draft, draft.id, appointment)

    draft.reload
    assert_equal "expired", draft.status
    assert_equal appointment.id, draft.appointment_id
  end

  test "should expire draft with hash data using symbol key" do
    appointment = create_test_appointment

    draft = AppointmentDraft.create!(
      admin_pic_id: @admin.id,
      created_by_admin_id: @admin.id,
      current_step: "patient_details",
      form_data: {test: "data"},
      status: :active
    )

    params = build_params(draft_id: draft.id)
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    service.send(:expire_draft, draft.id, {id: appointment.id})

    draft.reload
    assert_equal "expired", draft.status
  end

  test "should expire draft with hash data using string key" do
    appointment = create_test_appointment

    draft = AppointmentDraft.create!(
      admin_pic_id: @admin.id,
      created_by_admin_id: @admin.id,
      current_step: "patient_details",
      form_data: {test: "data"},
      status: :active
    )

    params = build_params(draft_id: draft.id)
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    service.send(:expire_draft, draft.id, {"id" => appointment.id})

    draft.reload
    assert_equal "expired", draft.status
  end

  test "should gracefully handle non-existent draft" do
    params = build_params(draft_id: SecureRandom.uuid)
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    assert_nothing_raised do
      service.send(:expire_draft, SecureRandom.uuid, {id: SecureRandom.uuid})
    end
  end

  test "should not expire inactive draft" do
    appointment = create_test_appointment

    draft = AppointmentDraft.create!(
      admin_pic_id: @admin.id,
      created_by_admin_id: @admin.id,
      current_step: "patient_details",
      form_data: {test: "data"},
      status: :expired
    )

    params = build_params(draft_id: draft.id)
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    # Should not raise, should just return early
    service.send(:expire_draft, draft.id, appointment)

    draft.reload
    # Should still be expired (not re-expired)
    assert_equal "expired", draft.status
  end

  # ---------------------------------------------------------------------------
  # API Error Parsing Tests
  # ---------------------------------------------------------------------------

  test "should parse error key from API response body hash" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    mock_response = Struct.new(:body).new({"error" => "Custom error message"})
    error = service.send(:parse_api_error, mock_response)

    assert_equal "Custom error message", error
  end

  test "should parse message key from API response body hash" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    mock_response = Struct.new(:body).new({"message" => "Error message"})
    error = service.send(:parse_api_error, mock_response)

    assert_equal "Error message", error
  end

  test "should convert non-hash response body to string" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    mock_response = Struct.new(:body).new("Plain text error")
    error = service.send(:parse_api_error, mock_response)

    assert_equal "Plain text error", error
  end

  # ---------------------------------------------------------------------------
  # Find With Retry Tests
  # ---------------------------------------------------------------------------

  test "should find appointment on first attempt" do
    appointment = create_test_appointment
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    found = service.send(:find_with_retry, appointment.id)

    assert_equal appointment.id, found.id
  end

  test "should return nil after max retry attempts" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    found = service.send(:find_with_retry, SecureRandom.uuid, max_attempts: 2, delay: 0.01)

    assert_nil found
  end

  # ---------------------------------------------------------------------------
  # Logging Tests
  # ---------------------------------------------------------------------------

  test "should log info messages without error" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    assert_nothing_raised do
      service.send(:log_info, "test_event", key: "value")
    end
  end

  test "should log warning messages without error" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    assert_nothing_raised do
      service.send(:log_warn, "test_warning", key: "value")
    end
  end

  test "should log error messages without error" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    assert_nothing_raised do
      service.send(:log_error, "test_error", key: "value")
    end
  end

  test "should log debug messages without error" do
    params = build_params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @current_user)

    assert_nothing_raised do
      service.send(:log_debug, "test_debug", key: "value")
    end
  end

  # ---------------------------------------------------------------------------
  # Constants Tests
  # ---------------------------------------------------------------------------

  test "should have correct BOOKING_ENDPOINT constant" do
    assert_equal "/api/v1/bookings", AdminPortal::CreateAppointmentServiceExternalApi::BOOKING_ENDPOINT
  end

  test "should have correct BANK_PAYMENT constant" do
    assert_equal "bank_transfer", AdminPortal::CreateAppointmentServiceExternalApi::BANK_PAYMENT
  end

  test "should have correct LOG_TAG constant" do
    assert_equal "[BookingAPI]", AdminPortal::CreateAppointmentServiceExternalApi::LOG_TAG
  end

  # ---------------------------------------------------------------------------
  # Private Helper Methods
  # ---------------------------------------------------------------------------

  private

  def build_params(overrides = {})
    defaults = {
      service_id: @service.id,
      package_id: @package.id,
      location_id: @location.id,
      therapist_id: @therapist.id,
      patient: {
        name: @existing_patient.name,
        date_of_birth: @existing_patient.date_of_birth,
        gender: @existing_patient.gender
      },
      patient_contact: {
        contact_name: @existing_patient_contact.contact_name,
        contact_phone: @existing_patient_contact.contact_phone,
        email: @existing_patient_contact.email
      },
      patient_address: {
        location_id: @location.id,
        latitude: @existing_address.latitude,
        longitude: @existing_address.longitude,
        postal_code: @existing_address.postal_code,
        address: @existing_address.address
      },
      appointment: {
        appointment_date_time: 3.days.from_now
      }
    }

    merged = defaults.deep_merge(overrides)

    ActionController::Parameters.new(appointment: merged)
  end

  def create_test_appointment
    Appointment.new(
      patient: @existing_patient,
      therapist: @therapist,
      service: @service,
      package: @package,
      location: @location,
      registration_number: "TEST-#{SecureRandom.hex(4).upcase}",
      appointment_date_time: 3.days.from_now.change(hour: 10, min: 0),
      preferred_therapist_gender: "NO PREFERENCE",
      status: "PENDING PATIENT APPROVAL",
      visit_number: 1,
      skip_auto_series_creation: true
    ).tap { |a| a.save!(validate: false) }
  end
end
