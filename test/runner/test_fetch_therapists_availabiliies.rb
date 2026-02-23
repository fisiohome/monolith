# frozen_string_literal: true

require_relative "config/environment"

therapist_id = "5d22d663-95b6-4cbd-b22e-75defa4b40b9"
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
    end
  end
end

# Scenario: UI Request
ui_params = {
  patient_query: "sarah",
  location_id: "2",
  service_id: "1",
  preferred_therapist_gender: "NO PREFERENCE",
  appointment_date_time: "Thu Feb 26 2026 00:00:00 GMT+0700 (Indochina Time)",
  is_all_of_day: "true"
}

test_fetch(ui_params, "UI Request Simulation", therapist.id)
