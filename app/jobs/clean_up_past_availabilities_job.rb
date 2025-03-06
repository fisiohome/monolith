class CleanUpPastAvailabilitiesJob < ApplicationJob
  # self.queue_adapter = :solid_queue
  queue_as :default

  def perform(*args)
    TherapistAdjustedAvailability.where("specific_date < ?", Time.zone.today).delete_all
  end
end
