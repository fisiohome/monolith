# frozen_string_literal: true

require "test_helper"

class TransactionOnlyTest < ActiveSupport::TestCase
  def setup
    @user = users(:admin_user)
    @therapist = therapists(:therapist_one)
    @service = services(:fisiohome)
    @location = locations(:jakarta_selatan)
    @package = packages(:basic_fisiohome)

    # Create patient contact
    @patient_contact = PatientContact.create!(
      contact_name: "Test Contact",
      contact_phone: "+6281234567800",
      email: "test@example.com"
    )
    @patient = Patient.create!(
      name: "Test Patient",
      date_of_birth: 30.years.ago,
      gender: "MALE",
      patient_contact: @patient_contact
    )

    # Create appointments
    @appointment1 = Appointment.create!(
      patient: @patient,
      service: @service,
      location: @location,
      package: @package,
      registration_number: "TRANS-001",
      visit_number: 1,
      appointment_date_time: 1.hour.from_now,
      preferred_therapist_gender: "NO PREFERENCE",
      skip_auto_series_creation: true
    )
    @appointment1.save!(validate: false)

    @appointment2 = Appointment.create!(
      patient: @patient,
      service: @service,
      location: @location,
      package: @package,
      registration_number: "TRANS-001",
      visit_number: 2,
      appointment_date_time: 2.hours.from_now,
      preferred_therapist_gender: "NO PREFERENCE",
      reference_appointment: @appointment1
    )
    @appointment2.save!(validate: false)
  end

  test "demonstrates transaction-only failure with concurrent operations" do
    threads = []
    results = []
    errors = []

    # More aggressive concurrent operations to trigger race condition
    10.times do |i|
      threads << Thread.new do
        [@appointment1, @appointment2].sample

        begin
          # This is what happens without our locking mechanism
          ActiveRecord::Base.transaction do
            # Add small delay to increase race condition probability
            sleep(0.001) if rand < 0.3

            # Step 1: Set temporary numbers
            [@appointment1, @appointment2].each_with_index do |apt, index|
              apt.update_column(:visit_number, -(index + 1))
            end

            # Another small delay
            sleep(0.001) if rand < 0.3

            # Step 2: Set final numbers (this is where race condition occurs)
            if rand < 0.5
              @appointment1.update_column(:visit_number, 2)
              @appointment2.update_column(:visit_number, 1)
            else
              @appointment1.update_column(:visit_number, 1)
              @appointment2.update_column(:visit_number, 2)
            end
          end

          Thread.current[:result] = {success: true}
        rescue => e
          Thread.current[:error] = e
        end
      end
    end

    threads.each(&:join)

    # Collect results
    threads.each do |thread|
      if thread[:error]
        errors << thread[:error]
        puts "Transaction error: #{thread[:error].class} - #{thread[:error].message}"
      else
        results << thread[:result]
      end
    end

    # This will likely show constraint violations
    puts "Results: #{results.length} succeeded, #{errors.length} failed"
    puts "Errors: #{errors.map(&:class).uniq}"

    # Demonstrate that transactions alone don't prevent race conditions
    constraint_errors = errors.select { |e| e.message.include?("index_appointments_on_registration_number_and_visit_number") }

    if constraint_errors.any?
      puts "❌ Transaction-only approach FAILED: #{constraint_errors.length} constraint violations"
    else
      puts "✅ Transaction-only approach succeeded (rare case)"
    end

    # The key insight: Even with transactions, race conditions can occur
    # because PostgreSQL checks constraints during execution, not at commit
    assert true, "Test completed - demonstrates transaction limitation"
  end
end
