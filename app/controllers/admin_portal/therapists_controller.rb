module AdminPortal
  class TherapistsController < ApplicationController
    include TherapistsHelper

    before_action :set_therapist, only: %i[show edit update destroy]

    # GET /therapists
    def index
      # define the query params default values
      page = params.fetch(:page, 1)
      limit = params.fetch(:limit, 10)
      filter_by_name = params[:name]
      filter_by_account_status = params[:account_status]
      filter_by_employment_type = params[:employment_type]
      filter_by_employment_status = params[:employment_status]
      filter_by_city = params[:city]
      selected_param = params[:change_password] || params[:delete]

      therapist_collections = Therapist
        .joins(:user)
        .left_joins(:therapist_appointment_schedule)
        .includes(:therapist_appointment_schedule)
        .by_name(filter_by_name)
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

      # get the selected data admin for form
      selected_therapist_lambda = lambda do
        return nil unless selected_param

        serialize_therapist(
          Therapist.find_by(id: selected_param),
          {
            only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender]
          }
        )
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
                only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender]
              }
            )
          end
        },
        selected_therapist: -> { selected_therapist_lambda.call },
        filter_options: InertiaRails.defer { filter_options_lambda.call }
      })
    end

    # GET /therapists/1
    def show
      render inertia: "Therapist/Show", props: {
        therapist: serialize_therapist(
          @therapist,
          {
            only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender]
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

    def schedules
      page_params = params.fetch(:page, 1)
      limit_params = is_mobile? ? 1 : 5 # limit the therapist data for mobile device
      date_params = params.fetch(:date, Time.zone.today)
      name_params = params[:name]
      city_params = params[:city]
      employment_type = params[:employment_type]

      therapists = Therapist
        .joins(:therapist_appointment_schedule)
        .with_active_addresses
        .by_name(name_params)
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

      # pagination
      pagy, paged_therapists = pagy(therapists, page: page_params, limit: limit_params)

      # get the filter options data
      filter_options_lambda = lambda do
        employment_types = Therapist.employment_types.map { |key, value| value }.as_json
        locations = Location.cached_locations

        deep_transform_keys_to_camel_case({locations:, employment_types:})
      end

      render inertia: "AdminPortal/Therapist/Schedules", props: deep_transform_keys_to_camel_case({
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
              therapist,
              {
                include_user: true,
                include_bank_details: false,
                include_addresses: false,
                include_availability: true,
                include_active_appointments: true,
                appointment_date: date_params
              }
            )
          end.as_json
        },
        filter_options: InertiaRails.defer { filter_options_lambda.call }
      })
    end

    def sync_data_master
      result = MasterDataSyncService.new.therapists

      if result[:success]
        redirect_to admin_portal_therapists_path, notice: result[:message]
      else
        redirect_to admin_portal_therapists_path, alert: result[:error]
      end
    end

    private

    # Use callbacks to share common setup or constraints between actions.
    def set_therapist
      @therapist = Therapist.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def therapist_params
      params.require(:therapist).permit(
        :name,
        :batch,
        :phone_number,
        :gender,
        :employment_status,
        :employment_type,
        modalities: [],
        specializations: [],
        service: %i[id name code],
        user: %i[email password password_confirmation],
        bank_details: %i[id bank_name account_number account_holder_name active],
        addresses: %i[id country country_code state city postal_code address active lat lng]
      )
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
            only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender]
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
