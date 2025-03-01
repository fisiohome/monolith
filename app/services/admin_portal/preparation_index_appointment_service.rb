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
      ).where("appointment_date_time >= ?", Time.zone.today)

      # Group appointments by the date part of appointment_date_time, sort them by date.
      grouped = appointments.group_by { |a| a.appointment_date_time.to_date }
      sorted_groups = grouped.sort_by { |date, _| date }
      sorted_groups.map do |date, apps|
        deep_transform_keys_to_camel_case(
          {
            date: date,
            schedules: apps.map { |appointment|
              serialize_appointment(appointment)
            }
          }
        )
      end.as_json
    end
  end
end
