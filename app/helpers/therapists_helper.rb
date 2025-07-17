module TherapistsHelper
  include PatientsHelper
  include AdminsHelper
  include PackagesHelper

  def serialize_therapist(therapist, options = {})
    therapist.as_json(only: options[:only] || nil).tap do |therapist_serialize|
      # serialize the therapist user accounts
      if options.fetch(:include_user, true)
        therapist_serialize["user"] = therapist.user.as_json(
          only: %i[id email is_online? last_online_at last_sign_in_at current_sign_in_ip last_sign_in_ip suspend_at suspend_end],
          methods: %i[is_online? suspended?]
        )
      end

      # serizlie the therapist service
      if options.fetch(:include_service, true)
        therapist_serialize["service"] = therapist.service.as_json(only: %i[id name code])
      end

      # serialize the therapist bank details
      if options.fetch(:include_bank_details, true)
        therapist_serialize["bank_details"] = therapist.therapist_bank_details.map do |therapist_bank|
          therapist_bank.bank_detail.attributes.merge(active: therapist_bank.active)
        end
      end

      # serialize just active address
      if options.fetch(:include_active_address, true)
        therapist_serialize["active_address"] = therapist&.active_address&.attributes&.merge(
          location: therapist.active_address.location.attributes
        )
      end

      # serialize the therapist addresses
      if options.fetch(:include_addresses, true)
        therapist_serialize["addresses"] = therapist.therapist_addresses.map do |therapist_address|
          therapist_address.address.attributes.merge(
            active: therapist_address.active,
            location: therapist_address.address.location.attributes
          )
        end
      end

      # serialize the therapist availability
      if options[:include_availability]
        therapist_serialize["availability"] = therapist&.therapist_appointment_schedule&.as_json(only: %i[
          id time_zone appointment_duration_in_minutes
          max_advance_booking_in_days min_booking_before_in_hours
          buffer_time_in_minutes start_date_window end_date_window
        ])&.merge(
          is_available_now: therapist.therapist_appointment_schedule.available_now,
          availability_rules: therapist.therapist_appointment_schedule.availability_rules,
          weekly_availabilities: therapist.therapist_appointment_schedule.therapist_weekly_availabilities.map do |wa|
            {
              id: wa.id,
              day_of_week: wa.day_of_week,
              start_time: wa.start_time&.strftime("%H:%M"),
              end_time: wa.end_time&.strftime("%H:%M")
            }
          end,
          adjusted_availabilities: therapist.therapist_appointment_schedule.therapist_adjusted_availabilities.map do |aa|
            {
              id: aa.id,
              specific_date: aa.specific_date,
              start_time: aa.start_time&.strftime("%H:%M"),
              end_time: aa.end_time&.strftime("%H:%M"),
              reason: aa.reason,
              is_unavailable: aa.unavailable?
            }
          end
        )
      end

      # serialize the therapist appointments
      if options[:include_appointments]
        therapist_serialize["appointments"] = therapist.appointments.map do |appointment|
          appointment.attributes.merge(
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            service: appointment.service,
            package: appointment.package,
            location: appointment.location,
            patient: serialize_patient(appointment.patient)
          )
        end
      end

      # serialize for active therapist appointments only
      if options[:include_active_appointments]
        appointments = therapist.appointments.select do |appointment|
          # Skip this appointment if it's cancelled
          next false if appointment.status_cancelled?

          # If a specific appointment_date is provided in options, filter by it
          if options[:appointment_date].present?
            begin
              # Include only appointments that match the target date (ignoring time)
              target_date = Date.parse(options[:appointment_date].to_s)
              appointment.appointment_date_time.to_date == target_date
            rescue ArgumentError, TypeError
              # If the date is invalid or nil, exclude the appointment
              false
            end
          else
            # If no appointment_date is provided, include all non-cancelled appointments
            true
          end
        end

        therapist_serialize["active_appointments"] = appointments.map do |appointment|
          appointment.attributes.merge(
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            service: appointment.service,
            location: appointment.location,
            patient: serialize_patient(appointment.patient),
            admins: serialize_admin(appointment.admins),
            package: serialize_package(
              appointment.package_history,
              options.fetch(:package_options, options.slice(:include_packages_formatted))
            ),
            voucher_discount: appointment.voucher_discount,
            formatted_discount: appointment.formatted_discount,
            total_price: appointment.total_price,
            formatted_total_price: appointment.formatted_total_price,
            patient_medical_record: appointment.patient_medical_record,
            visit_address: appointment.address_history,
            initial_visit: appointment.initial_visit?,
            visit_progress: appointment.visit_progress,
            next_visit_progress: appointment.next_visit_progress,
            total_package_visits: appointment.total_package_visits,
            next_visits: appointment.next_visits,
            series_appointments: appointment.series_appointments.as_json,
            reference_appointment: appointment.reference_appointment.as_json,
            all_visits: appointment.all_visits_in_series.as_json(
              only: [:id, :visit_progress, :appointment_date_time, :status, :registration_number],
              methods: [:visit_progress]
            )
          )
        end
      end
    end
  end
end
