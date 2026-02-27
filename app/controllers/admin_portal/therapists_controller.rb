module AdminPortal
  class TherapistsController < ApplicationController
    include TherapistsHelper
    include AppointmentsHelper

    before_action :set_therapist, only: %i[show edit update destroy]

    # GET /therapists
    def index
      # define the query params default values
      page = params.fetch(:page, 1)
      limit = params.fetch(:limit, 10)
      filter_by_search = params[:search]
      filter_by_account_status = params[:account_status]
      filter_by_employment_type = params[:employment_type]
      filter_by_employment_status = params[:employment_status]
      filter_by_city = params[:city]
      details_param = params[:details]
      selected_param = params[:change_password] || params[:delete] || details_param

      therapist_collections = Therapist
        .joins(:user)
        .left_joins(:therapist_appointment_schedule)
        .includes(:therapist_appointment_schedule)
        .by_search(filter_by_search)
        .by_city(filter_by_city)
        .by_employment_type(filter_by_employment_type)
        .where(filter_by_employment_status.present? ? {employment_status: filter_by_employment_status} : nil)
        .where(
          if filter_by_account_status == "ACTIVE"
            ["users.suspend_at IS NULL OR (users.suspend_end IS NOT NULL AND users.suspend_end < ?)", Time.current]
          else
            (filter_by_account_status == "INACTIVE") ? ["(users.suspend_at IS NOT NULL AND users.suspend_at <= ?) AND (users.suspend_end IS NULL OR users.suspend_end >= ?)", Time.current, Time.current] : nil
          end
        )
        .order(
          Arel.sql(
            <<~SQL
              CASE WHEN therapist_appointment_schedules.id IS NOT NULL THEN 1 ELSE 0 END DESC,
              CASE WHEN users.last_online_at >= NOW() - INTERVAL '15 minutes' THEN 2 ELSE 0 END DESC,
              CASE WHEN users.last_online_at IS NOT NULL THEN 1 ELSE 0 END DESC,
              CASE WHEN (users.suspend_at IS NOT NULL AND users.suspend_at <= NOW() AND (users.suspend_end IS NULL OR users.suspend_end >= NOW())) THEN -1 ELSE 0 END DESC,
              CASE therapists.employment_type WHEN 'KARPIS' THEN 1 ELSE 0 END DESC,
              CASE therapists.employment_status
                WHEN 'ACTIVE' THEN 2
                WHEN 'HOLD' THEN 1
                ELSE 0
              END DESC,
              therapists.registration_number DESC
            SQL
          )
        )

      @pagy, @therapists = pagy_array(therapist_collections, page:, limit:)

      # get the selected data therapist
      selected_therapist_lambda = lambda do
        return nil unless selected_param

        deep_transform_keys_to_camel_case(
          serialize_therapist(
            Therapist.find_by(id: selected_param),
            {
              only: %i[
                id name batch phone_number registration_number modalities specializations employment_status employment_type gender contract_start_date contract_end_date telegram_id
              ]
            }
          )
        )
      end

      # get selected therapist appointments
      selected_therapist_appts_lambda = lambda do
        return nil unless details_param

        Appointment
          .includes(:therapist, :patient, :service, :package, :location, :admins)
          .initial_visits
          .where(therapist_id: details_param)
          .map { |a| deep_transform_keys_to_camel_case(serialize_appointment(a)) }
      end

      # get the filter options data
      filter_options_lambda = lambda do
        employment_types = Therapist.employment_types.map { |key, value| value }.as_json
        employment_statuses = Therapist.employment_statuses.map { |key, value| value }.as_json
        locations = Location.cached_locations.as_json

        deep_transform_keys_to_camel_case({employment_types:, employment_statuses:, locations:})
      end

      render inertia: "AdminPortal/Therapist/Index", props: deep_transform_keys_to_camel_case({
        therapists: {
          metadata: pagy_metadata(@pagy),
          data: @therapists.map do |therapist|
            serialize_therapist(
              therapist,
              {
                only: %i[id name registration_number employment_status employment_type gender], include_bank_details: false, include_active_address: false, include_addresses: false
              }
            )
          end
        },
        selected_therapist: InertiaRails.defer(group: "selected") { selected_therapist_lambda.call },
        selected_therapist_appts: InertiaRails.defer(group: "selected") { selected_therapist_appts_lambda.call },
        filter_options: InertiaRails.defer { filter_options_lambda.call }
      })
    end

    # GET /therapists/1
    def show
      render inertia: "Therapist/Show", props: {
        therapist: serialize_therapist(
          @therapist,
          {
            only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender contract_start_date contract_end_date]
          }
        )
      }
    end

    # GET /therapists/new
    def new
      @therapist = Therapist.new
      render_upsert_form(@therapist)
    end

    # GET /therapists/1/edit
    def edit
      render_upsert_form(@therapist)
    end

    # POST /therapists
    def create
      create_service = CreateTherapistService.new(therapist_params)
      @therapist = create_service.call
      set_default_active_therapist_bank_detail(@therapist)
      set_default_active_therapist_address(@therapist)

      redirect_to admin_portal_therapists_path, notice: "Therapist was successfully created."
    rescue ActiveRecord::RecordInvalid => e
      handle_record_invalid(e)
    rescue => e
      handle_generic_error(e)
    end

    # PATCH/PUT /therapists/1
    def update
      update_service = UpdateTherapistService.new(@therapist, therapist_params)
      @therapist = update_service.call
      set_default_active_therapist_bank_detail(@therapist)
      set_default_active_therapist_address(@therapist)

      redirect_to admin_portal_therapists_path(expanded: @therapist.id), notice: "Therapist was successfully updated."
    rescue ActiveRecord::RecordInvalid => e
      handle_record_invalid(e)
    rescue => e
      handle_generic_error(e)
    end

    # DELETE /therapists/1
    def destroy
      logger.info("Start the process for deleting the therapist account.")

      ActiveRecord::Base.transaction do
        @therapist.destroy!
      end

      redirect_to admin_portal_therapists_path, notice: "Therapist account and related data were successfully deleted."
    rescue => e
      logger.error("Failed to delete therapist with error: #{e.message}.")
      redirect_to admin_portal_therapists_path(delete: @therapist.id), alert: "Failed to delete therapist account."
    ensure
      logger.info("Process for deleting the therapist account is finished.")
    end

    # GET /generate-reset-password-url
    def generate_reset_password_url
      logger.info "Generating the URL page for change password form..."
      permitted_params = params.permit(:email)
      service = PasswordResetService.new(params: permitted_params, url_helper: self)
      result = service.generate_reset_password_url

      if result[:error]
        render json: {error: result[:error]}, status: result[:status]
      else
        render json: {link: result[:link]}
      end

      logger.info "The proccess to generate the change password URL finished..."
    end

    # PUT /change-password
    def change_password
      logger.info "Starting proccess to change the password account..."
      user_params = params.require(:user).permit(:password, :password_confirmation, :email)
      service = PasswordResetService.new(params: user_params, url_helper: self)
      result = service.change_password

      if result[:alert]
        redirect_to result[:redirect_to], alert: result[:alert]
      else
        redirect_to result[:redirect_to], notice: result[:notice]
      end

      logger.info "The proccess to change the password account finished..."
    end

    def day_schedules
      page_params = params.fetch(:page, 1)
      limit_params = is_mobile? ? 1 : 5 # limit the therapist data for mobile device
      date_params = params.fetch(:date, Time.zone.today)
      search_params = params[:search]
      city_params = params[:city]
      employment_type = params[:employment_type]

      therapists_scope = Therapist
        .joins(:therapist_appointment_schedule)
        .with_active_addresses
        .by_search(search_params)
        .by_city(city_params)
        .by_employment_type(employment_type)
        .employment_status_ACTIVE
        .where(
          # Filter therapists based on appointment date and allowed advance booking days.
          # Include therapists without a defined limit or within allowed booking window.
          "therapist_appointment_schedules.max_advance_booking_in_days IS NULL OR
     DATE(:appointment_date) <= CURRENT_DATE + INTERVAL '1 day' * therapist_appointment_schedules.max_advance_booking_in_days",
          appointment_date: date_params
        )
        .order(
          # Sort therapists, prioritizing those with a defined appointment schedule (non-null).
          Arel.sql("therapist_appointment_schedules.id IS NULL ASC"),
          :id  # Secondary sort: Therapist ID for consistent ordering
        )

      # paginate on the lightweight scope first to avoid loading huge association graphs
      pagy, paged_therapists = pagy(therapists_scope, page: page_params, limit: limit_params)

      therapist_ids = paged_therapists.map(&:id)

      # eager load only the therapists needed for the current page
      therapists_with_includes = Therapist
        .where(id: therapist_ids)
        .includes(
          :user,
          :service,
          :therapist_appointment_schedule,
          :active_address,
          appointments: [
            :patient,
            :service,
            :package,
            :package_history,
            :location,
            :admins,
            :patient_medical_record,
            :address_history,
            reference_appointment: :package_history
          ]
        )
        .index_by(&:id)

      # get the filter options data
      filter_options_lambda = lambda do
        employment_types = Therapist.employment_types.map { |key, value| value }.as_json
        locations = Location.cached_locations

        deep_transform_keys_to_camel_case({locations:, employment_types:})
      end

      render inertia: "AdminPortal/Therapist/DaySchedules", props: deep_transform_keys_to_camel_case({
        params: {
          page: page_params,
          limit: limit_params,
          date: date_params,
          city: city_params
        },
        therapists: {
          metadata: pagy_metadata(pagy),
          data: paged_therapists.map do |therapist|
            serialize_therapist(
              therapists_with_includes[therapist.id],
              {
                include_user: true,
                include_bank_details: false,
                include_addresses: false,
                include_availability: true,
                include_active_appointments: true,
                include_packages_formatted: true,
                appointment_date: date_params
              }
            )
          end.as_json
        },
        filter_options: InertiaRails.defer { filter_options_lambda.call }
      })
    end

    def schedules
      selected_therapist_ids_param = (params[:therapists] || "").split(",").compact_blank
      date_from_param = parse_date_param(params[:date_from]) || Time.zone.today
      date_to_param = parse_date_param(params[:date_to]) || 1.month.from_now.to_date

      appointment_window = date_from_param.beginning_of_day..date_to_param.end_of_day
      invalid_statuses = ["CANCELLED", "UNSCHEDULED", "ON HOLD", "PENDING THERAPIST ASSIGNMENT"]

      # get therapists with lambda
      get_therapists_option_lambda = lambda do
        version = [Therapist.maximum(:updated_at), User.maximum(:updated_at), Service.maximum(:updated_at)].compact.max&.to_i || 0

        Rails.cache.fetch("therapists_options:v#{version}", expires_in: 10.minutes) do
          therapists_scope = Therapist
            .joins(:user)
            .includes(:user, :service)
            .with_active_addresses
            .employment_status_ACTIVE
            .where(
              # active user (not suspended or suspension ended)
              ["users.suspend_at IS NULL OR (users.suspend_end IS NOT NULL AND users.suspend_end < ?)", Time.current]
            )
            .select(:id, :user_id, :service_id, :name, :employment_type, :employment_status, :gender, :registration_number)
            .order(Arel.sql("LOWER(therapists.name) ASC"))

          deep_transform_keys_to_camel_case({
            data: therapists_scope.map do |therapist|
              {
                id: therapist.id,
                name: therapist.name,
                employment_type: therapist.employment_type,
                employment_status: therapist.employment_status,
                gender: therapist.gender,
                registration_number: therapist.registration_number,
                user: therapist.user && {id: therapist.user.id, email: therapist.user.email},
                service: therapist.service && {id: therapist.service.id, name: therapist.service.name}
              }
            end.as_json
          })
        end
      end

      # get selected therapists with the appointment schedule
      get_selected_therapists_with_appointments_lambda = lambda do
        return {data: []} if selected_therapist_ids_param.empty?

        # Single query to fetch all selected therapists with schedules and filtered appointments
        therapists = Therapist
          .where(id: selected_therapist_ids_param)
          .select(:id, :user_id, :service_id, :name, :employment_type, :employment_status, :gender, :registration_number)
          .includes(therapist_appointment_schedule: :therapist_weekly_availabilities)
          .preload(:appointments) {
            where(appointment_date_time: appointment_window)
              .where.not(status: invalid_statuses)
              .includes(:patient, :package, :service, :address_history)
              .order(:appointment_date_time)
          }
          .order(Arel.sql("LOWER(therapists.name) ASC"))

        data = therapists.map do |therapist|
          appointments_raw = therapist.appointments.to_a
          appointments = appointments_raw.map do |a|
            {
              id: a.id,
              patient_id: a.patient_id,
              patient_name: a.patient&.name,
              patient_gender: a.patient.gender,
              service_id: a.service_id,
              service_name: a.service&.name,
              service_code: a.service&.code,
              package_id: a.package_id,
              package_name: a.package&.name,
              total_visit: a.package&.try(:number_of_visit),
              registration_number: a.registration_number,
              status: a.status,
              appointment_date_time: a.appointment_date_time,
              visit_number: a.visit_number,
              address_line: a.address_history&.address_line
            }
          end

          # calculate availability by day across requested window
          availability_by_day = {}

          if (schedule = therapist.therapist_appointment_schedule)
            tz_name = schedule.time_zone.presence || Time.zone.name
            duration_minutes = schedule.appointment_duration_in_minutes.to_i
            buffer_minutes = schedule.buffer_time_in_minutes.to_i
            weekly_by_dow = schedule.therapist_weekly_availabilities.group_by { |slot| slot.day_of_week.to_s.downcase }

            appointments_by_day = appointments_raw.group_by { |a| a.appointment_date_time.to_date.to_s }

            (date_from_param..date_to_param).each do |date|
              next if schedule.start_date_window && date < schedule.start_date_window
              next if schedule.end_date_window && date > schedule.end_date_window

              date_str = date.to_s
              daily_appts = appointments_by_day[date_str] || []

              key = date.strftime("%A").downcase
              slots = weekly_by_dow[key]
              next if slots.blank?

              busy_ranges = daily_appts.map do |appt|
                start_time = appt.appointment_date_time.in_time_zone(tz_name)
                end_time = start_time + duration_minutes.minutes + buffer_minutes.minutes
                [start_time, end_time]
              end.sort_by(&:first)

              availability_by_day[date_str] = slots.map do |slot|
                slot_start = Time.use_zone(tz_name) { Time.zone.parse("#{date} #{slot.start_time}") }
                slot_end = Time.use_zone(tz_name) { Time.zone.parse("#{date} #{slot.end_time}") }

                free_windows = []
                cursor = slot_start

                busy_ranges.each do |busy_start, busy_end|
                  next if busy_end <= cursor
                  break if busy_start >= slot_end

                  if busy_start > cursor
                    free_windows << {start_time: cursor.strftime("%H:%M"), end_time: [busy_start, slot_end].min.strftime("%H:%M")}
                  end

                  cursor = [cursor, busy_end].max
                  cursor = slot_end if cursor > slot_end
                end

                if cursor < slot_end
                  free_windows << {start_time: cursor.strftime("%H:%M"), end_time: slot_end.strftime("%H:%M")}
                end

                {
                  start_time: slot.start_time&.strftime("%H:%M"),
                  end_time: slot.end_time&.strftime("%H:%M"),
                  free_windows: free_windows
                }
              end
            end
          end

          {
            id: therapist.id,
            name: therapist.name,
            employment_type: therapist.employment_type,
            employment_status: therapist.employment_status,
            gender: therapist.gender,
            registration_number: therapist.registration_number,
            availability_by_day: availability_by_day,
            appointments: appointments.select { |appt| appt[:appointment_date_time].between?(date_from_param.beginning_of_day, date_to_param.end_of_day) }
              .sort_by { |appt| appt[:appointment_date_time] || Time.zone.at(0) }
          }
        end

        deep_transform_keys_to_camel_case({data:})
      end

      render inertia: "AdminPortal/Therapist/Schedules", props: deep_transform_keys_to_camel_case({
        therapists_schedule: InertiaRails.defer do
          get_selected_therapists_with_appointments_lambda.call
        end,
        therapists_option: InertiaRails.defer(group: "options") do
          get_therapists_option_lambda.call
        end
      })
    end

    def sync_data_master
      # Get employment type filter from params (default: KARPIS for internal employees)
      employment_type_filter = params[:employment_type_filter]&.upcase || "KARPIS"
      employment_type_filter = "KARPIS" unless Therapist.employment_types.key?(employment_type_filter)

      # Clear any existing sync status before starting a new one
      SyncStatusService.clear_sync_status(:therapists_and_schedules)

      # Enqueue background job with options
      MasterDataSyncJob.perform_later(:therapists_and_schedules, current_user&.id, {employment_type_filter:})

      type_label = (employment_type_filter == "FLAT") ? "Mitra" : "Karyawan"
      redirect_to admin_portal_therapists_path, notice: "#{type_label} data sync is running in the background. You'll be notified when it's complete."
    end

    def sync_status
      # Ensure user is authenticated
      unless current_user
        render json: {status: :error, error: "Authentication required"}, status: :unauthorized
        return
      end

      status = SyncStatusService.get_latest_sync_status(:therapists_and_schedules)

      if status
        # Don't clear the status immediately - let it expire naturally (24 hours)
        # This prevents the frontend from getting stuck in a polling loop
        # The status will be cleared on the next sync operation

        render json: {
          status: status[:status],
          completed_at: status[:completed_at],
          message: status[:result][:success] ? status[:result][:message] : status[:result][:error],
          results: status[:result][:results]
        }
      else
        # Check if there are any pending or running jobs
        # In Solid Queue, jobs are running when they have claimed executions
        pending_jobs = SolidQueue::Job.where(class_name: "MasterDataSyncJob")
          .where(finished_at: nil)
          .count

        # Also check for jobs that are currently being executed
        running_jobs = SolidQueue::ClaimedExecution.joins(:job)
          .where(solid_queue_jobs: {class_name: "MasterDataSyncJob"})
          .count

        if pending_jobs > 0 || running_jobs > 0
          render json: {status: :running, message: "Sync is in progress..."}
        else
          render json: {status: :not_found}
        end
      end
    rescue => e
      Rails.logger.error "Error in sync_status: #{e.class} - #{e.message}"
      render json: {status: :error, error: "Failed to check sync status"}, status: :internal_server_error
    end

    private

    def parse_date_param(raw)
      return if raw.blank?

      Date.strptime(raw.to_s, "%d-%m-%Y")
    rescue ArgumentError
      nil
    end

    # Use callbacks to share common setup or constraints between actions.
    def set_therapist
      @therapist = Therapist.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def therapist_params
      permitted_params = params.require(:therapist).permit(
        :name,
        :batch,
        :phone_number,
        :gender,
        :employment_status,
        :employment_type,
        :contract_start_date,
        :contract_end_date,
        :telegram_id,
        modalities: [],
        specializations: [],
        service: %i[id name code],
        user: %i[email password password_confirmation],
        bank_details: %i[id bank_name account_number account_holder_name active],
        addresses: %i[id country country_code state city postal_code address active lat lng]
      )

      # Convert empty telegram_id to nil to avoid unique constraint violations
      permitted_params[:telegram_id] = nil if permitted_params[:telegram_id].blank?

      permitted_params
    end

    def render_upsert_form(therapist)
      locations_lambda = lambda do
        return nil unless params[:country] || params[:state] || params[:city]
        Location.all
      end

      render inertia: "AdminPortal/Therapist/Upsert", props: deep_transform_keys_to_camel_case({
        current_path: (action_name === "new") ? new_admin_portal_therapist_path : edit_admin_portal_therapist_path(therapist),
        therapist: serialize_therapist(
          therapist,
          {
            only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender contract_start_date contract_end_date telegram_id]
          }
        ),
        genders: Therapist.genders.map { |key, value| value },
        employment_types: Therapist.employment_types.map { |key, value| value },
        employment_statuses: Therapist.employment_statuses.map { |key, value| value },
        services: InertiaRails.defer { Service.active },
        locations: InertiaRails.defer { locations_lambda.call }
      })
    end

    def handle_record_invalid(error)
      error_message = error.record.errors.full_messages.uniq.to_sentence

      logger.error("Failed to save therapist: #{error_message}.")
      flash[:alert] = error_message
      redirect_to determine_redirect_path, inertia: {
        errors: deep_transform_keys_to_camel_case(
          error.record.errors.messages.transform_values(&:uniq).merge({
            full_messages: error_message
          })
        )
      }
    end

    def handle_generic_error(error)
      logger.error("Failed to save therapist: #{error.message}.")
      flash[:alert] = error.message

      redirect_to determine_redirect_path
    end

    def determine_redirect_path
      if action_name == "create"
        new_admin_portal_therapist_path
      else
        edit_admin_portal_therapist_path(@therapist)
      end
    end

    def set_default_active_therapist_address(therapist)
      unless therapist.therapist_addresses.active.exists?
        latest_address = therapist.therapist_addresses.order(created_at: :desc).first
        latest_address&.update(active: true)
      end
    end

    def set_default_active_therapist_bank_detail(therapist)
      unless therapist.therapist_bank_details.active.exists?
        latest_bank_detail = therapist.therapist_bank_details.order(created_at: :desc).first
        latest_bank_detail&.update(active: true)
      end
    end
  end
end
