module AppointmentsHelper
  include TherapistsHelper
  include PatientsHelper
  include AdminsHelper
  include PackagesHelper

  def serialize_appointment(appointment, options = {})
    # Start with the basic attributes, if any only options are provided.
    appointment.as_json(only: options[:only]).tap do |serialized|
      # Serialize the therapist using your existing helper if available.
      if options.fetch(:include_therapist, true) && appointment.therapist.present?
        # Assuming you have serialize_therapist available.
        serialized["therapist"] = serialize_therapist(
          appointment.therapist,
          options.fetch(:therapist_options, options.slice(:include_user, :include_service, :include_bank_details, :include_addresses, :include_active_address, :include_availability))
        )
      end

      # Serialize patient details.
      if options.fetch(:include_patient, true) && appointment.patient.present?
        serialized["patient"] = serialize_patient(
          appointment.patient,
          options.fetch(:patient_options, {})
        )
      end

      # Serialize service details.
      if options.fetch(:include_service, true) && appointment.service.present?
        serialized["service"] = appointment.service.as_json(only: options[:service_only])
      end

      # Serialize package details (prefer history snapshot, fallback to live package).
      if options.fetch(:include_package, true)
        package_source = appointment&.package_history || appointment&.package
        if package_source.present?
          serialized["package"] = serialize_package(
            package_source,
            options.fetch(:package_options, options.slice(:include_packages_formatted))
          )
        end
      end

      # Serialize location details.
      if options.fetch(:include_location, true) && appointment.location.present?
        serialized["location"] = appointment.location.as_json(only: options[:location_only])
      end

      # Serialize admins (through appointment_admins).
      if options.fetch(:include_admins, true)
        # serialized["admins"] = appointment.admins.as_json(only: options[:admin_only])
        serialized["admins"] = serialize_admin(
          appointment.admins,
          options.fetch(:admin_options, {})
        )
      end

      # Serialize the patient medical record
      if options.fetch(:include_patient_medical_record, true)
        serialized["patient_medical_record"] = appointment.patient_medical_record.as_json(only: options[:medical_record_only])
      end

      # Serialize the visit address
      if options.fetch(:include_visit_address, true)
        serialized["visit_address"] = appointment.address_history.as_json(only: options[:visit_address_only])
      end

      # Serialize the all visits
      if options.fetch(:include_all_visits, false)
        serialized["all_visits"] = appointment.all_visits_in_series.as_json(
          only: options[:all_visits_only],
          methods: options[:all_visits_methods]
        )
      end

      # Add status history
      if options.fetch(:include_status_history, false)
        serialized["status_histories"] = serialize_status_history(appointment)
      end

      serialized.merge!(
        voucher_discount: appointment.voucher_discount,
        formatted_discount: appointment.formatted_discount,
        total_price: appointment.total_price,
        formatted_total_price: appointment.formatted_total_price,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        is_paid: appointment.paid?,
        is_completed?: appointment.completed?,
        initial_visit: appointment.initial_visit?,
        visit_progress: appointment.visit_progress,
        next_visit_progress: appointment.next_visit_progress,
        total_package_visits: appointment.total_package_visits,
        next_visits: appointment.next_visits.as_json,
        series_appointments: appointment.series_appointments.as_json,
        reference_appointment: appointment.reference_appointment.as_json
      )

      # Serialize appointment admins.
      # if options.fetch(:include_appointment_admins, true)
      #   serialized["appointment_admins"] = appointment.appointment_admins.as_json(only: options[:appointment_admins_only])
      # end
    end
  end

  def serialize_status_history(appointment)
    appointment.status_histories.order(:created_at).map do |history|
      user = User.find_by(id: history.changed_by)
      profile = nil
      profile_type = nil

      if user
        # Detect profile type and serialize accordingly
        if user.admin.present?
          profile = serialize_admin(user.admin)
          profile_type = "admin"
        elsif user.therapist.present?
          profile = serialize_therapist(
            user.therapist,
            {include_service: false, include_bank_details: false, include_addresses: false}
          )
          profile_type = "therapist"
        elsif user.patient.present?
          profile = serialize_patient(
            user.patient,
            {include_patient_contact: false, include_active_address: false}
          )
          profile_type = "patient"
        else
          profile = nil
          profile_type = "unknown"
        end
      end

      {
        old_status: history.old_status,
        new_status: history.new_status,
        reason: history.reason,
        changed_at: history.created_at,
        changed_by: user&.as_json(only: [:id, :email, :full_name])&.merge(
          profile_type: profile_type,
          profile: profile
        )
      }
    end
  end
end
