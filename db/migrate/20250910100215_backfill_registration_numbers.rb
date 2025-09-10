class BackfillRegistrationNumbers < ActiveRecord::Migration[8.0]
  def up
    Rails.logger.info "Starting regeneration of registration numbers for all appointments..."
    Rails.logger.info "WARNING: This is a destructive operation and will change existing registration numbers."

    if Rails.env.production?
      Rails.logger.info "This task is not meant to be run in production. Aborting."
      return
    end

    ActiveRecord::Base.transaction do
      # Step 0: Temporarily update all registration numbers to avoid unique constraint violations.
      Rails.logger.info "Applying temporary registration numbers to ensure a clean slate..."
      Appointment.update_all("registration_number = CONCAT('temp-', id)")

      # Step 1: Regenerate registration numbers for initial visits only
      Rails.logger.info "Regenerating registration numbers for initial visits..."
      service_counters = {}

      Appointment.initial_visits.includes(:service).order(created_at: :asc).each do |appointment|
        service = appointment.service
        next unless service # Safeguard against missing service

        service_code = service.code.upcase
        service_counters[service_code] ||= 1
        counter = service_counters[service_code]

        loop do
          new_registration_number = "#{service_code}-#{counter.to_s.rjust(6, "0")}"
          begin
            ActiveRecord::Base.transaction(requires_new: true) do
              appointment.update_column(:registration_number, new_registration_number)
            end

            service_counters[service_code] = counter + 1
            break # Exit loop on success
          rescue ActiveRecord::RecordNotUnique
            # If the registration number is already taken, increment counter and retry
            counter += 1
          end
        end
      end
      Rails.logger.info "Initial visit registration numbers regenerated."

      # Step 2: Backfill registration numbers for series appointments
      Rails.logger.info "Backfilling shared registration numbers for appointment series..."
      Appointment.initial_visits.joins(:series_appointments).distinct.find_each do |initial_visit|
        shared_registration_number = initial_visit.registration_number

        if shared_registration_number.blank?
          # This should not happen after the regeneration step, but as a safeguard:
          Rails.logger.info "Skipping initial visit ID #{initial_visit.id} as it has no registration number."
          next
        end

        series_to_update = initial_visit.series_appointments.where.not(registration_number: shared_registration_number)

        if series_to_update.any?
          Rails.logger.info "Updating #{series_to_update.count} series appointments for initial visit #{initial_visit.registration_number}."
          series_to_update.update_all(registration_number: shared_registration_number)
        end
      end

      Rails.logger.info "Regeneration and backfill of registration numbers complete."
    end
  end

  def down
    # This migration is not easily reversible.
    # raise ActiveRecord::IrreversibleMigration, "This migration is not reversible."

    Rails.logger.info "This migration is not reversible."
  end
end
