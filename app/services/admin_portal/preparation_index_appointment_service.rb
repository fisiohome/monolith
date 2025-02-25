module AdminPortal
  class PreparationIndexAppointmentService
    def initialize(params)
      @params = params
    end

    def fetch_appointments
      Appointment.all.group_by { |a| a.appointment_date_time.to_date }
    end
  end
end
