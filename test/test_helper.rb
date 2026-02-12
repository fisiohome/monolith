ENV["RAILS_ENV"] ||= "test"

# SimpleCov must start BEFORE loading the app
require "simplecov"
SimpleCov.start "rails" do
  enable_coverage :branch
end

require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Limit parallel workers to reduce memory usage (or use 2 for constrained environments)
    parallelize(workers: ENV.fetch("PARALLEL_WORKERS", 2).to_i)

    # Clean up after parallel tests to free memory
    parallelize_teardown do |worker|
      GC.start
    end

    # Map fixture names to model classes for unconventional model names
    set_fixture_class sync_monolith_logs: SyncMonolithLogs

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all
    # fixtures :therapists, :addresses, :therapist_addresses, :users

    # Add more helper methods to be used by all tests here...
  end
end
