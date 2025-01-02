module AdminPortal
  class TherapistsController < ApplicationController
    before_action :set_therapist, only: %i[show edit update destroy]

    # GET /therapists
    def index
      # define the query params default values
      page = params.fetch(:page, 1)
      limit = params.fetch(:limit, 10)

      therapist_collections = Therapist.order(created_at: "DESC").sort_by { |u|
        if u.user.is_online?
          2
        elsif u.user.last_online_at
          1
        else
          0
        end
      }.reverse
      @pagy, @therapists = pagy_array(therapist_collections, page:, limit:)

      render inertia: "AdminPortal/Therapist/Index", props: deep_transform_keys_to_camel_case({
        therapists: {
          metadata: pagy_metadata(@pagy),
          data: @therapists.map do |therapist|
            serialize_therapist(therapist)
          end
        }
      })
    end

    # GET /therapists/1
    def show
      render inertia: "Therapist/Show", props: {
        therapist: serialize_therapist(@therapist)
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

      redirect_to admin_portal_therapists_path, notice: "Therapist was successfully updated."
    rescue ActiveRecord::RecordInvalid => e
      handle_record_invalid(e)
    rescue => e
      handle_generic_error(e)
    end

    # DELETE /therapists/1
    def destroy
      @therapist.destroy!
      redirect_to therapists_url, notice: "Therapist was successfully destroyed."
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
        addresses: %i[id country country_code state city postal_code address active]
      )
    end

    def serialize_therapist(therapist)
      therapist.as_json(only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender]).tap do |therapist_serialize|
        # serialize the therapist user accounts
        therapist_serialize["user"] = therapist.user.as_json(
          only: %i[id email is_online? last_online_at last_sign_in_at current_sign_in_ip last_sign_in_ip suspend_at suspend_end],
          methods: %i[is_online? suspended?]
        )

        # serizlie the therapist service
        therapist_serialize["service"] = therapist.service.as_json(only: %i[id name code])

        # serialize the therapist bank details
        therapist_serialize["bank_details"] = therapist.therapist_bank_details.map do |therapist_bank|
          therapist_bank.bank_detail.attributes.merge(active: therapist_bank.active)
        end

        # serialize the therapist addresses
        therapist_serialize["addresses"] = therapist.therapist_addresses.map do |therapist_address|
          therapist_address.address.attributes.merge(
            active: therapist_address.active,
            location: therapist_address.address.location.attributes
          )
        end
      end
    end

    def render_upsert_form(therapist)
      locations_lambda = lambda do
        return nil unless params[:country] || params[:state] || params[:city]
        Location.all
      end

      render inertia: "AdminPortal/Therapist/Upsert", props: deep_transform_keys_to_camel_case({
        therapist: serialize_therapist(therapist),
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
      redirect_to request.referer || new_admin_portal_therapist_path, inertia: {
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

      redirect_to request.referer || new_admin_portal_therapist_path
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
