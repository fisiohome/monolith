#
# BackfillRegistrationNumbersJob
#
# This job regenerates registration numbers for all appointments.
# - Initial visits get new sequential registration numbers based on service code
# - Series appointments inherit the registration number from their initial visit
#
# WARNING: This is a destructive operation that will change existing registration numbers.
#          Only run this if you understand the implications.
#
# Usage:
#
#   # From Rails console - DRY RUN (default, safe):
#   BackfillRegistrationNumbersJob.perform_now
#
#   # From Rails console - PRODUCTION RUN (requires explicit confirmation):
#   BackfillRegistrationNumbersJob.perform_now(dry_run: false, i_understand_this_is_destructive: true)
#
#   # Background job (asynchronous):
#   BackfillRegistrationNumbersJob.perform_later(dry_run: false, i_understand_this_is_destructive: true)
#
# This job is NOT idempotent - running it multiple times will generate different registration numbers.
#

class BackfillRegistrationNumbersJob < ApplicationJob
  queue_as :default

  def perform(dry_run: true, i_understand_this_is_destructive: false)
    if dry_run
      Rails.logger.info "=" * 80
      Rails.logger.info "DRY RUN MODE - No changes will be made"
      Rails.logger.info "=" * 80
      perform_dry_run
    else
      unless i_understand_this_is_destructive
        Rails.logger.error "=" * 80
        Rails.logger.error "SAFETY CHECK FAILED"
        Rails.logger.error "You must explicitly set i_understand_this_is_destructive: true"
        Rails.logger.error "=" * 80
        raise ArgumentError, "Safety confirmation required. Set i_understand_this_is_destructive: true"
      end

      Rails.logger.info "=" * 80
      Rails.logger.info "PRODUCTION RUN - Changes will be permanent"
      Rails.logger.info "Environment: #{Rails.env}"
      Rails.logger.info "=" * 80

      perform_backfill
    end
  end

  private

  def perform_dry_run
    Rails.logger.info "Analyzing appointments for registration number regeneration..."

    initial_visits_count = Appointment.initial_visits.count
    series_appointments_count = Appointment.where.not(appointment_reference_id: nil).count

    Rails.logger.info "Found #{initial_visits_count} initial visits"
    Rails.logger.info "Found #{series_appointments_count} series appointments"

    # Analyze by service
    service_breakdown = Appointment.initial_visits.includes(:service).group_by { |a| a.service&.code&.upcase || "UNKNOWN" }
    
    Rails.logger.info "\nBreakdown by service:"
    service_breakdown.each do |service_code, appointments|
      Rails.logger.info "  #{service_code}: #{appointments.count} initial visits"
    end

    Rails.logger.info "\n" + "=" * 80
    Rails.logger.info "To proceed with the actual backfill, run:"
    Rails.logger.info "BackfillRegistrationNumbersJob.perform_now(dry_run: false, i_understand_this_is_destructive: true)"
    Rails.logger.info "=" * 80
  end

  def perform_backfill
    Rails.logger.info "Starting regeneration of registration numbers for all appointments..."

    ActiveRecord::Base.transaction do
      # Step 0: Temporarily update all registration numbers to avoid unique constraint violations
      Rails.logger.info "Step 0: Applying temporary registration numbers..."
      temp_count = Appointment.update_all("registration_number = CONCAT('temp-', id)")
      Rails.logger.info "  Updated #{temp_count} appointments with temporary registration numbers"

      # Step 1: Regenerate registration numbers for initial visits only
      Rails.logger.info "\nStep 1: Regenerating registration numbers for initial visits..."
      service_counters = {}
      processed_count = 0
      skipped_count = 0

      Appointment.initial_visits.includes(:service).order(created_at: :asc).find_each do |appointment|
        service = appointment.service
        
        unless service
          Rails.logger.warn "  Skipping appointment #{appointment.id} - no service associated"
          skipped_count += 1
          next
        end

        service_code = service.code.upcase
        service_counters[service_code] ||= 1
        counter = service_counters[service_code]

        retry_count = 0
        max_retries = 10

        loop do
          new_registration_number = "#{service_code}-#{counter.to_s.rjust(6, "0")}"
          
          begin
            ActiveRecord::Base.transaction(requires_new: true) do
              appointment.update_column(:registration_number, new_registration_number)
            end

            service_counters[service_code] = counter + 1
            processed_count += 1
            
            if processed_count % 100 == 0
              Rails.logger.info "  Processed #{processed_count} initial visits..."
            end
            
            break # Exit loop on success
          rescue ActiveRecord::RecordNotUnique
            # If the registration number is already taken, increment counter and retry
            counter += 1
            retry_count += 1
            
            if retry_count >= max_retries
              Rails.logger.error "  Failed to assign registration number for appointment #{appointment.id} after #{max_retries} attempts"
              raise
            end
          end
        end
      end

      Rails.logger.info "  Successfully regenerated #{processed_count} initial visit registration numbers"
      Rails.logger.info "  Skipped #{skipped_count} appointments (no service)" if skipped_count > 0

      # Step 2: Backfill registration numbers for series appointments
      Rails.logger.info "\nStep 2: Backfilling shared registration numbers for appointment series..."
      series_updated_count = 0

      Appointment.initial_visits.joins(:series_appointments).distinct.find_each do |initial_visit|
        shared_registration_number = initial_visit.registration_number

        if shared_registration_number.blank?
          Rails.logger.warn "  Skipping initial visit ID #{initial_visit.id} - no registration number"
          next
        end

        series_to_update = initial_visit.series_appointments.where.not(registration_number: shared_registration_number)

        if series_to_update.any?
          update_count = series_to_update.update_all(registration_number: shared_registration_number)
          series_updated_count += update_count
          
          if series_updated_count % 100 == 0
            Rails.logger.info "  Updated #{series_updated_count} series appointments..."
          end
        end
      end

      Rails.logger.info "  Successfully updated #{series_updated_count} series appointments"

      Rails.logger.info "\n" + "=" * 80
      Rails.logger.info "BACKFILL COMPLETE"
      Rails.logger.info "  Initial visits processed: #{processed_count}"
      Rails.logger.info "  Series appointments updated: #{series_updated_count}"
      Rails.logger.info "  Total appointments affected: #{processed_count + series_updated_count}"
      Rails.logger.info "=" * 80
    end

  rescue StandardError => e
    Rails.logger.error "=" * 80
    Rails.logger.error "BACKFILL FAILED - Transaction rolled back"
    Rails.logger.error "Error: #{e.class} - #{e.message}"
    Rails.logger.error e.backtrace.first(5).join("\n")
    Rails.logger.error "=" * 80
    raise
  end
end
