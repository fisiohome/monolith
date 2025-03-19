module AdminPortal
  class PreparationIndexAppointmentService
    include ApplicationHelper
    include AppointmentsHelper

    def initialize(params)
      @params = params
    end

    def fetch_appointments
      # Eager load all required associations
      appointments = Appointment.includes(
        :therapist,
        :patient,
        :service,
        :package,
        :location,
        :admins
      )

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
      else
        # Default: future appointments
        appointments
          .where("appointment_date_time >= ?", Time.zone.now)
          .status_paid
      end

      # Group appointments by the date part of appointment_date_time, sort them by date.
      grouped = appointments.group_by { |a| a.appointment_date_time.to_date }
      sorted_groups = grouped.sort_by { |date, _| date }

      # If filter is "past", reverse the order so the most recent past dates come first.
      sorted_groups.reverse! if @params[:filter_by_appointment_status] == "past" || @params[:filter_by_appointment_status] == "cancel"

      sorted_groups.map do |date, apps|
        deep_transform_keys_to_camel_case(
          {
            date: date,
            schedules: apps.map { |appointment|
              serialize_appointment(appointment)
            }
          }
        )
      end
    end

    def fetch_selected_appointment
      selected_id = @params[:cancel]
      return nil if selected_id.blank?

      appointment = Appointment.find_by(id: selected_id)
      deep_transform_keys_to_camel_case(serialize_appointment(appointment))
    end
  end
end
