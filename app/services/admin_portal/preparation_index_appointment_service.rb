module AdminPortal
  class PreparationIndexAppointmentService
    include Pagy::Backend
    include ApplicationHelper
    include AppointmentsHelper
    include ServicesHelper

    def initialize(params, current_user)
      @params = params
      @current_user = (@params[:assigned_to] == "me") ? current_user : nil
      @selected_id = @params[:cancel] || @params[:update_pic] || @params[:update_status]
    end

    def fetch_appointments
      page_params = @params.fetch(:page, 1).to_i
      limit_params = @params.fetch(:limit, 5).to_i

      # Filter the appointments
      filtered_appt = filtered_appointments_relation

      # Paginate the relation
      metadata, paginated_appointments = pagy(filtered_appt, page: page_params, limit: limit_params)

      # Group and serialize the paginated appointments
      grouped_data = group_and_serialize(paginated_appointments)

      {data: grouped_data, metadata:}
    end

    def fetch_filter_options_data
      locations = Location.cached_locations
      services = Rails.cache.fetch("all_services_with_packages", expires_in: 1.hour) do
        Service.includes(:packages).map do |service|
          serialize_service(service, include_packages: true)
        end
      end
      patient_genders = Patient.genders.map { |key, value| value }

      deep_transform_keys_to_camel_case({locations:, services:, patient_genders:})
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

    # Now returns a filtered, sorted ActiveRecord::Relation (not grouped or paginated)
    def filtered_appointments_relation
      Appointment
        # Eager load all required associations
        .includes(:therapist, :patient, :service, :package, :location, :admins)
        # apply the filter
        .apply_filters(@params, @current_user)
        # sorting, ensure everything is sorted by the full date - time
        .order(appointment_date_time: :asc)
    end

    # group appointments by the date part of appointment_date_time, sort them by date and serialize after pagination.
    def group_and_serialize(appointments)
      grouped = appointments
        .group_by { |a| a.appointment_date_time.to_date if a.appointment_date_time.present? }
        .sort_by { |date, _| [date.nil? ? 1 : 0, date || Date.new(0)] }
      grouped = reverse_groups_if_needed(grouped)

      grouped.map do |date, apps|
        deep_transform_keys_to_camel_case(
          {
            date: date,
            schedules: apps.map { |appointment|
              serialize_appointment(
                appointment,
                {
                  include_all_visits: true,
                  all_visits_only: [:id, :visit_progress, :appointment_date_time, :status, :registration_number],
                  all_visits_methods: [:visit_progress],
                  include_status_history: true
                }
              )
            }
          }
        )
      end
    end

    # If filter is "past" or "cancel", reverse the order so the most recent past dates come first.
    def reverse_groups_if_needed(groups)
      return groups unless %w[past cancel].include?(@params[:status])
      groups.reverse!
    end
  end
end
