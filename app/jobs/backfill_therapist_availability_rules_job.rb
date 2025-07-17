#
# BackfillTherapistAvailabilityRulesJob
#
# This job will backfill the default availability_rules for all existing
# TherapistAppointmentSchedule records where availability_rules is nil or empty.
#
# Usage:
#
#   # From Rails console (recommended for one-time use):
#   BackfillTherapistAvailabilityRulesJob.perform_later
#
#   # Or, create a rake task for repeatable/scripted use:
#   # lib/tasks/backfill_therapist_availability_rules.rake
#   #
#   # namespace :backfill do
#   #   desc "Backfill default availability rules for therapist appointment schedules"
#   #   task therapist_availability_rules: :environment do
#   #     BackfillTherapistAvailabilityRulesJob.perform_later
#   #   end
#   # end
#   #
#   # Then run:
#   #   bundle exec rake backfill:therapist_availability_rules
#
# This job is safe to run multiple times; it will only update records where rules are nil or empty.
#

class BackfillTherapistAvailabilityRulesJob < ApplicationJob
  queue_as :default

  def perform
    TherapistAppointmentSchedule.where(
      "availability_rules IS NULL OR availability_rules::text = '[]' OR availability_rules::text = '{}'"
    ).find_each(batch_size: 100) do |schedule|
      schedule.update_columns(availability_rules: schedule.availability_rules = TherapistAppointmentSchedule::DEFAULT_AVAILABILITY_RULES)
    end
  end
end
