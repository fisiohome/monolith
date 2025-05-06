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

      # * apply the filter
      appointments = appointments.apply_filters(@params)

      # * sorting and grouping
      appointments = appointments
        # ensure everything is sorted by the full date - time
        .order(appointment_date_time: :asc)
        # Group appointments by the date part of appointment_date_time, sort them by date.
        .group_by { |a| a.appointment_date_time.to_date }
        .sort_by { |date, _| date }
      appointments = reverse_groups_if_needed(appointments)

      appointments.map do |date, apps|
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

    private

    # If filter is "past" or "cancel", reverse the order so the most recent past dates come first.
    def reverse_groups_if_needed(groups)
      return groups unless %w[past cancel].include?(@params[:filter_by_appointment_status])
      groups.reverse!
    end
  end
end
