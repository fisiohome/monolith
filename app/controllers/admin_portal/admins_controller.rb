module AdminPortal
  class AdminsController < ApplicationController
  # before_action :set_admin, only: %i[ show edit update destroy ]
  before_action :set_admin, only: %i[ edit update destroy ]

  # inertia_share flash: -> { flash.to_hash }

  # GET /admins
  def index
    # define the query params with default values if not provided
    page = params.fetch(:page, 1)
    limit = params.fetch(:limit, 10)
    sort_by_last_online_at = params.fetch(:sort_by_last_online_at, "last_online_at asc")
    filter_by_account_status = params[:filter_by_account_status]
    filter_by_email = params[:email]

    #  join the admin with user and apply the generated order query
    query = Admin
      .joins(:user)
      .where(filter_by_email.present? ? [ "users.email ILIKE ?", "%#{filter_by_email}%" ] : nil)
      .where(
        filter_by_account_status == "active" ? [ "users.suspend_at IS NULL OR (users.suspend_end IS NOT NULL AND users.suspend_end < ?)", Time.current ] :
        filter_by_account_status == "suspended" ? [ "(users.suspend_at IS NOT NULL AND users.suspend_at <= ?) AND (users.suspend_end IS NULL OR users.suspend_end >= ?)", Time.current, Time.current ] :
        nil
      )
      .order(sort_by_last_online_at)

    # fetch paginated data with the order query
    @pagy, @admins = pagy(query, page: page, limit: limit)

    render inertia: "AdminPortal/Admin/Index", props: deep_transform_keys_to_camel_case({
      admins: {
        metadata: pagy_metadata(@pagy),
        data: @admins.map do |admin|
          serialize_admin_only_index(admin)
        end
      }
    })
  end

  # GET /admins/1
  # def show
  #   render inertia: "AdminPortal/Admin/Show", props: {
  #     admin: serialize_admin(@admin)
  #   }
  # end

  # GET /admins/new
  def new
    @admin = Admin.new
    render inertia: "AdminPortal/Admin/New", props: {
      admin: serialize_admin(@admin)
    }
  end

  # GET /admins/1/edit
  def edit
    render inertia: "AdminPortal/Admin/Edit", props: {
      admin: serialize_admin(@admin)
    }
  end

  # POST /admins
  def create
    @admin = Admin.new(admin_params)

    if @admin.save
      redirect_to @admin, notice: "Admin was successfully created."
    else
      redirect_to new_admin_url, inertia: { errors: @admin.errors }
    end
  end

  # PATCH/PUT /admins/1
  def update
    if @admin.update(admin_params)
      redirect_to @admin, notice: "Admin was successfully updated."
    else
      redirect_to edit_admin_url(@admin), inertia: { errors: @admin.errors }
    end
  end

  # DELETE /admins/1
  def destroy
    logger.info "Deleting the Admin: #{@admin.name} (#{@admin.admin_type})"
    @admin.destroy!
    logger.info "Successfully deleted Admin and associated User."

    redirect_to admin_portal_admins_path, notice: "Admin was successfully destroyed."
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_admin
      @admin = Admin.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def admin_params
      params.require(:admin).permit(:admin_type, :name, :user_id)
    end

    def serialize_admin_only_index(admin)
      admin.as_json(
        only: %i[ id admin_type name created_at updated_at ],
        include: {
          user: {
            only: %i[ id email is_online? last_online_at last_sign_in_at current_sign_in_ip last_sign_in_ip ],
            methods: :is_online?
          }
        }
      )
    end

    def serialize_admin(admin)
      admin.as_json(
        only: %i[ id admin_type name ],
        include: {
          user:  {
            only: %i[ id email ]
          }
        }
      )
    end
  end
end
