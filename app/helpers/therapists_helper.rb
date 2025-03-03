module TherapistsHelper
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
      if options[:include_active_address]
        therapist_serialize["active_address"] = therapist.active_address.attributes.merge(
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
        therapist_serialize["appointments"] = therapist.appointments.as_json
      end
    end
  end
end
