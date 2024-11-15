module AdminPortal
  class AdminsController < ApplicationController
  # before_action :set_admin, only: %i[ show edit update destroy ]
  before_action :set_admin, only: %i[ edit update destroy ]

  # GET /admins
  def index
    # define the query params with default values if not provided
    page = params.fetch(:page, 1)
    limit = params.fetch(:limit, 10)
    filter_by_account_status = params[:filter_by_account_status]
    filter_by_email = params[:email]
    # sort_by_last_online_at = params.fetch(:sort_by_last_online_at, "last_online_at asc")

    #  join the admin with user and apply the generated order query
    query = Admin
      .joins(:user)
      .where(filter_by_email.present? ? [ "users.email ILIKE ?", "%#{filter_by_email}%" ] : nil)
      .where(
        filter_by_account_status == "active" ? [ "users.suspend_at IS NULL OR (users.suspend_end IS NOT NULL AND users.suspend_end < ?)", Time.current ] :
        filter_by_account_status == "suspended" ? [ "(users.suspend_at IS NOT NULL AND users.suspend_at <= ?) AND (users.suspend_end IS NULL OR users.suspend_end >= ?)", Time.current, Time.current ] :
        nil
      )
      .sort_by { |u| u.user.is_online? ? 1 : 0 }.reverse
    # .order(sort_by_last_online_at)

    # fetch paginated data with the order query
    @pagy, @admins = pagy_array(query, page: page, limit: limit)

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
    render inertia: "AdminPortal/Admin/New", props: deep_transform_keys_to_camel_case({
      admin: serialize_admin(@admin),
      admin_type_list: Admin::TYPES
    })
  end

  # GET /admins/1/edit
  def edit
    render inertia: "AdminPortal/Admin/Edit", props: {
      admin: serialize_admin(@admin),
      admin_type_list: Admin::TYPES
    }
  end

  # POST /admins
  def create
    # if the user exists, return an error message
    logger.info("Starting the admin creation process")
    user_email = params[:user][:email]
    user = User.find_by(email: user_email)
    if user
      logger.warn("User with email #{user_email} already exists. Redirecting to new admin page.")
      flash[:alert] = "User with this email already exists and cannot be assigned as a new admin."
      redirect_to new_admin_portal_admin_path
      return
    end

    # if the user doesn't exist, create a new User and associate the Admin
    logger.info("User with email #{user_email} not found. Proceeding to create a new user.")
    user = User.new(user_params_helper)
    if user.save
      logger.info("User #{user.email} created successfully. Proceeding to associate with new admin.")
      @admin = user.build_admin(admin_params)
    else
      logger.error("Failed to create user #{user.email}. Errors: #{user.errors.full_messages.join(', ')}")
      flash[:alert] = "Failed to create associated user."
      redirect_to new_admin_portal_admin_path, inertia: { errors: user.errors }
      return
    end

    # if the admin creation success then redirect, if failed shows the alert
    if @admin.save
      logger.info("Admin associated with user #{user.email} created successfully.")
      redirect_to admin_portal_admins_path, notice: "Admin was successfully created."
    else
      logger.error("Failed to create admin for user #{user.email}. Errors: #{admin.errors.full_messages.join(', ')}")
      flash[:alert] = "Failed to create new admin."
      redirect_to new_admin_portal_admin_path, inertia: { errors: @admin.errors }
    end
    logger.info("Admin creation process finished")
  end

  # PATCH/PUT /admins/1
  def update
    if @admin.update(admin_params)
      redirect_to admin_portal_admins_path, notice: "Admin was successfully updated."
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

  # GET /generate-reset-password-url
  def generate_reset_password_url
    logger.info "Generating the URL page for change password form..."
    email = params[:email]
    raw, hashed = Devise.token_generator.generate(User, :reset_password_token)
    user = User.find_by(email: email)

    if user
      logger.info "User found the URL will be generating for #{email}."
      user.reset_password_token = hashed
      user.reset_password_sent_at = Time.now.utc
      user.save

      reset_password_url = edit_user_password_url(reset_password_token: raw)
      render json: { link: reset_password_url }
      logger.info "URL successfully generated: #{reset_password_url}."
    else
      failed_message = "Failed to generate change password link, the User not found."
      logger.info failed_message
      render json: { error: failed_message }, status: :not_found
    end
  end

  # PUT
  def change_password
    logger.info "Starting proccess to change the password account..."
    user_params = params.require(:user).permit(:password, :password_confirmation, :email)
    user = User.find_by(email: user_params[:email])

    if user.nil?
      failed_message = "User with the given email (#{user_params[:email]}) not found."
      logger.info failed_message
      redirect_to admin_portal_admins_path, alert: failed_message
      return
    end

    if user.update(password: user_params[:password], password_confirmation: user_params[:password_confirmation])
      success_message = "Successfully to changed the password."
      logger.info success_message
      redirect_to admin_portal_admins_path, notice: success_message
    else
      failed_message = user&.errors&.first&.full_message || "Failed to changed the password."
      logger.info failed_message
      redirect_to admin_portal_admins_path, alert: failed_message
    end
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
            only: %i[ id email is_online? last_online_at last_sign_in_at current_sign_in_ip last_sign_in_ip suspend_at suspend_end ],
            methods: %i[ is_online? suspended? ]
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
