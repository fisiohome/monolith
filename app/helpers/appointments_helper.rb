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

      # Serialize package details.
      if options.fetch(:include_package, true) && appointment.package.present?
        serialized["package"] = serialize_package(
          appointment.package_history,
          options.fetch(:package_options, options.slice(:include_packages_formatted))
        )
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

      serialized.merge!(
        voucher_discount: appointment.voucher_discount,
        formatted_discount: appointment.formatted_discount,
        total_price: appointment.total_price,
        formatted_total_price: appointment.formatted_total_price,
        start_time: appointment.start_time,
        end_time: appointment.end_time
      )

      # Serialize appointment admins.
      # if options.fetch(:include_appointment_admins, true)
      #   serialized["appointment_admins"] = appointment.appointment_admins.as_json(only: options[:appointment_admins_only])
      # end
    end
  end
end
