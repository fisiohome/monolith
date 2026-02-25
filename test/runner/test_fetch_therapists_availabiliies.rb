# frozen_string_literal: true

# = Test File: fetch_therapists Availability Testing
#
# == Purpose
# This test script validates the functionality of the AdminPortal::PreparationNewAppointmentService's
# fetch_therapists method, specifically testing how therapists are filtered and returned based on
# various search criteria and availability conditions.
#
# == Usage
# Run this script directly to test therapist fetching functionality:
#   ruby test/runner/test_fetch_therapists_availabiliies.rb
#
# == What It Tests
# - Whether a specific therapist is returned under different parameter combinations
# - The impact of service_id, location_id, and other filters on therapist selection
# - How missing or nil parameters affect the results
# - Availability information inclusion in the returned therapist data
#
# == Key Components
# - Uses a hardcoded therapist ID for consistent testing
# - Tests both complete parameter sets and minimal/missing parameters
# - Provides diagnostic information when therapist is not found
# - Shows therapist details including status, schedule rules, and location data
#
# == Dependencies
# - Rails environment (config/environment)
# - AdminPortal::PreparationNewAppointmentService
# - Therapist, Service, and Location models
#
# == Output
# - Prints test results with clear scenario names
# - Shows success/failure with ✅ and ❌ indicators
# - Provides diagnostic details for failed searches
# - Displays therapist availability information when present

require_relative "../../config/environment"

therapist_id = "0c9a01bd-1fcb-4a05-8540-9c671ae8e8d0"
therapist = Therapist.find_by(id: therapist_id)

if therapist.nil?
  puts "Therapist not found."
  exit 1
end

# service_id = therapist.service_id || Service.first&.id
# location = therapist.active_address&.location
# location_id = location&.id || Location.first&.id
service_id = 1
location_id = 2

if location_id.nil?
  puts "No valid location found for testing."
  exit 1
end

puts "================================================="
puts "Testing fetch_therapists with Therapist:"
puts "Name: #{therapist.name} (ID: #{therapist.id})"
puts "Service ID: #{service_id}"
puts "Location ID: #{location_id}"
puts "================================================="

def test_fetch(params, scenario_name, expected_therapist_id)
  puts "\n--- Scenario: #{scenario_name} ---"
  puts "Params: #{params.inspect}"

  service = AdminPortal::PreparationNewAppointmentService.new(params)
  results = service.fetch_therapists

  puts "Results count: #{results&.size.to_i}"
  if results
    found = results.find { |t| t[:id] == expected_therapist_id || t["id"] == expected_therapist_id }
    if found
      puts "✅ Therapist FOUND in the results!"
      if found[:availabilityDetails] || found["availabilityDetails"]
        puts "Availability Info Present: YES"
      end
      # Optionally print the full details for the therapist:
      # require 'pp'
      # pp found
    else
      puts "❌ Therapist NOT FOUND in the results."
      puts "-- Diagnostics for expected therapist --"
      t = Therapist.find_by(id: expected_therapist_id)
      if t
        addr = t.active_address
        loc = addr&.location
        puts "Status: #{t.employment_status}, Type: #{t.employment_type}, Gender: #{t.gender}, Service ID: #{t.service_id}"
        puts "Address ID: #{addr&.id}, Lat: #{addr&.latitude}, Lng: #{addr&.longitude}"
        puts "Location: #{loc&.city} / #{loc&.state} (ID: #{loc&.id})"
        schedule = t.therapist_appointment_schedule
        if schedule
          rules = Array(schedule.effective_availability_rules)
          puts "Schedule rules: #{rules.inspect}"
        else
          puts "Schedule: none"
        end
      else
        puts "Therapist record not found in DB."
      end
    end
  end
end

# Scenario: UI Request
ui_params = {
  patient_query: "sarah",
  location_id: "2",
  service_id: "1",
  preferred_therapist_gender: "NO PREFERENCE",
  appointment_date_time: "Fri Feb 27 2026 00:00:00 GMT+0700 (Indochina Time)",
  is_all_of_day: "true"
}
test_fetch(ui_params, "UI Request Simulation", therapist.id)

# Scenario: Missing service/location/address should still return therapist
missing_data_params = {
  patient_query: therapist.name.split.first, # minimal query
  location_id: nil,
  service_id: nil,
  preferred_therapist_gender: "NO PREFERENCE",
  appointment_date_time: nil,
  is_all_of_day: "true"
}

test_fetch(missing_data_params, "Missing service/location/address", therapist.id)
