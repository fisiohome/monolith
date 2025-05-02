module AdminPortal
  class PreparationIndexAppointmentService
    include ApplicationHelper
    include AppointmentsHelper

    def initialize(params)
      @params = params
      @selected_id = @params[:cancel] || @params[:update_pic] || @params[:update_status]
    end

    def fetch_appointments
      # Eager load all required associations
      appointments = Appointment.includes(:therapist, :patient, :service, :package, :location, :admins)

      # * define the filtering
      # by therapist name
      filter_by_therapist = @params[:therapist]
      if filter_by_therapist.present?
        appointments = appointments
          .joins(:therapist)
          .where("therapists.name ILIKE ?", "%#{filter_by_therapist}%")
      end

      # by patient name
      filter_by_patient = @params[:patient]
      if filter_by_patient.present?
        appointments = appointments
          .joins(:patient)
          .where("patients.name ILIKE ?", "%#{filter_by_patient}%")
      end

      # by registration number
      filter_by_reg_number = @params[:registration_number]
      if filter_by_reg_number.present?
        appointments = appointments
          .where("appointments.registration_number ILIKE ?", "%#{filter_by_reg_number}%")
      end

      # by region city
      filter_by_city = @params[:city]
      if filter_by_city.present?
        appointments = appointments
          .joins(:location)
          .where("locations.city ILIKE ?", "%#{filter_by_city}%")
      end

      # by appointment status
      appointments = case @params[:filter_by_appointment_status]
      when "pending"
        # Only future appointments with pending statuses
        appointments
          .where("appointment_date_time >= ?", Time.zone.now)
          .where(status: [
            "PENDING THERAPIST ASSIGNMENT",
            "PENDING PATIENT APPROVAL",
            "PENDING PAYMENT"
          ])
      when "past"
        # Appointments before today with paid statuses
        appointments
          .where("appointment_date_time < ?", Time.zone.now)
          .status_paid
      when "cancel"
        # Appointments with cancel statuses
        appointments.status_cancelled
      when "unschedule"
        appointments.status_unscheduled
      else
        # Default: future appointments
        appointments
          .where("appointment_date_time >= ?", Time.zone.now)
          .status_paid
      end

      # * sorting and grouping
      # ensure everything is sorted by the full date - time
      appointments = appointments.order(appointment_date_time: :asc)

      # Group appointments by the date part of appointment_date_time, sort them by date.
      grouped = appointments.group_by { |a| a.appointment_date_time.to_date }
      sorted_groups = grouped.sort_by { |date, _| date }

      # If filter is "past", reverse the order so the most recent past dates come first.
      filter_by_appt_status = @params[:filter_by_appointment_status]
      if %w[past cancel].include?(filter_by_appt_status)
        sorted_groups.reverse!
      end

      sorted_groups.map do |date, apps|
        deep_transform_keys_to_camel_case(
          {
            date: date,
            schedules: apps.map { |appointment|
              serialize_appointment(
                appointment,
                {
                  include_all_visits: true,
                  all_visits_only: [:id, :visit_progress, :appointment_date_time, :status, :registration_number],
                  all_visits_methods: [:visit_progress]
                }
              )
            }
          }
        )
      end
    end

    def fetch_filter_options_data
      locations = Location.all.as_json

      deep_transform_keys_to_camel_case({locations:})
    end

    def fetch_selected_appointment
      return nil if @selected_id.blank?

      appointment = Appointment.find_by(id: @selected_id)
      deep_transform_keys_to_camel_case(serialize_appointment(appointment))
    end

    def fetch_options_data
      return nil if @selected_id.blank?

      admins = Admin.all.map { |admin| deep_transform_keys_to_camel_case(serialize_admin(admin).as_json) }
      statuses = Appointment.statuses.map { |key, value| {key:, value:} }.as_json

      {admins:, statuses:}
    end
  end
end
