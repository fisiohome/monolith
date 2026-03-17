#!/usr/bin/env ruby

# Test script for appointment draft expiration functionality
# Usage: rails runner scripts/test_draft_expiration.rb

require "json"

class DraftExpirationTest
  def initialize
    @test_admin = Admin.first
    @test_patient = Patient.first
    raise "No admin found for testing" unless @test_admin
    raise "No patient found for testing" unless @test_patient

    puts "=== Draft Expiration Test Script ==="
    puts "Test Admin: #{@test_admin.name} (ID: #{@test_admin.id})"
    puts "Test User: #{@test_admin.user&.email} (ID: #{@test_admin.user&.id})"
    puts "Test Patient: #{@test_patient.name} (ID: #{@test_patient.id})"
    puts
  end

  def run_all_tests
    puts "Running all draft expiration tests..."
    puts "=" * 50

    test_draft_creation
    test_manual_expiration
    test_service_based_expiration
    test_error_handling

    puts "=" * 50
    puts "All tests completed!"
  end

  private

  def test_draft_creation
    puts "\n1. Testing Draft Creation"
    puts "-" * 30

    # Create a test draft
    draft = create_test_draft

    if draft.persisted? && draft.active?
      puts "✅ Draft created successfully (ID: #{draft.id})"
      puts "   Status: #{draft.status}"
      puts "   Current step: #{draft.current_step}"
    else
      puts "❌ Draft creation failed"
      return
    end

    # Clean up
    draft.destroy
    puts "✅ Draft cleaned up"
  end

  def test_manual_expiration
    puts "\n2. Testing Manual Draft Expiration"
    puts "-" * 30

    draft = create_test_draft
    appointment = create_test_appointment

    puts "Before expiration:"
    puts "  Draft status: #{draft.status}"
    puts "  Appointment ID: #{draft.appointment_id}"

    # Test manual expiration
    draft.expire_with_appointment!(appointment)

    puts "After expiration:"
    puts "  Draft status: #{draft.status}"
    puts "  Appointment ID: #{draft.appointment_id}"

    if draft.expired? && draft.appointment_id == appointment.id
      puts "✅ Manual expiration works correctly"
    else
      puts "❌ Manual expiration failed"
    end

    # Clean up
    draft.destroy
    appointment.destroy
  end

  def test_service_based_expiration
    puts "\n3. Testing Service-Based Draft Expiration"
    puts "-" * 30

    draft = create_test_draft
    draft_id = draft.id

    puts "Testing with draft_id: #{draft_id}"

    # Create service parameters that will pass permitted_params
    params = ActionController::Parameters.new({
      appointment: {
        service_id: Service.first.id,
        package_id: Package.first.id,
        location_id: Location.first.id,
        patient: {
          name: @test_patient.name,
          date_of_birth: @test_patient.date_of_birth,
          gender: @test_patient.gender
        },
        patient_contact: {
          contact_name: @test_patient.name,
          contact_phone: @test_patient.patient_contact&.contact_phone,
          email: @test_patient.patient_contact&.email
        },
        patient_address: {
          location_id: Location.first.id,
          address: "Test Address"
        },
        appointment: {
          appointment_date_time: 1.day.from_now,
          preferred_therapist_gender: "NO PREFERENCE"
        },
        draft_id: draft_id
      },
      draft_id: draft_id  # Also at root level for flexibility
    })

    puts "  Created service parameters"

    # Create service instance with proper params
    service = AdminPortal::CreateAppointmentServiceExternalApi.new(params, @test_admin.user)

    # Mock the external API call to avoid network dependency
    mock_appointment = create_test_appointment

    # Test the expire_draft method directly
    service.send(:expire_draft, draft_id, mock_appointment)

    # Check if draft was expired
    draft.reload
    if draft.expired? && draft.appointment_id == mock_appointment.id
      puts "✅ Service-based expiration works correctly"
    else
      puts "❌ Service-based expiration failed"
      puts "   Draft status: #{draft.status}"
      puts "   Appointment ID: #{draft.appointment_id}"
    end

    # Clean up
    draft.destroy
    mock_appointment.destroy
  end

  def test_error_handling
    puts "\n4. Testing Error Handling"
    puts "-" * 30

    # Test with non-existent draft - just test the model directly
    begin
      draft = AppointmentDraft.find_by(id: 99999)
      if draft.nil?
        puts "✅ Handled non-existent draft gracefully"
      else
        puts "⚠️  Unexpectedly found draft with ID 99999"
      end
    rescue => e
      puts "⚠️  Error with non-existent draft: #{e.message}"
    end

    # Test with nil appointment - just test the model method
    draft = create_test_draft
    begin
      # This should fail gracefully
      draft.expire_with_appointment!(nil)
      puts "✅ Handled nil appointment gracefully"
    rescue => e
      puts "⚠️  Error with nil appointment: #{e.message}"
    end

    draft.destroy
  end

  def create_test_draft
    form_data = {
      "patientDetails" => {
        "name" => "Test Patient",
        "phone" => "+628123456789",
        "email" => "test@example.com"
      },
      "appointmentScheduling" => {
        "date" => Date.current.to_s,
        "time" => "10:00"
      },
      "additionalSettings" => {
        "notes" => "Test draft"
      }
    }

    draft = AppointmentDraft.create!(
      current_step: "patient_details",
      form_data: form_data,
      created_by_admin: @test_admin,
      admin_pic: @test_admin  # Add this to satisfy the constraint
    )

    # Add the admin to the draft admins as well
    draft.add_admin(@test_admin, is_primary: true)
    draft
  end

  def create_test_appointment
    Appointment.create!(
      patient: @test_patient,
      status: "pending_payment",
      appointment_date_time: 1.day.from_now,
      service: Service.first,
      package: Package.first,
      location: Location.first,
      preferred_therapist_gender: "NO PREFERENCE"
    )
  end
end

# Run the tests
begin
  test_runner = DraftExpirationTest.new
  test_runner.run_all_tests
rescue => e
  puts "❌ Test execution failed: #{e.message}"
  puts e.backtrace.first(5)
end
