class BackfillSharedRegistrationNumberForAppointmentSeries < ActiveRecord::Migration[8.0]
  def up
    say_with_time "Backfilling shared registration numbers for appointment series" do
      # We only care about initial visits that have series appointments.
      # Using `joins(:series_appointments).distinct` ensures we only loop over relevant records.
      Appointment.initial_visits.joins(:series_appointments).distinct.find_each do |initial_visit|
        # Get the registration number from the initial visit.
        shared_registration_number = initial_visit.registration_number

        # Update all associated series appointments to use this shared number in a single query.
        initial_visit.series_appointments.update_all(registration_number: shared_registration_number)
      end
    end
  end

  def down
    Rails.logger.info "This migration backfills data to conform to new application logic and cannot be easily reversed."
  end
end
