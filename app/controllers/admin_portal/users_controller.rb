module AdminPortal
  class UsersController < ApplicationController
    before_action :set_user, only: %i[suspend_account activate_account]

    # inertia_share flash: -> { flash.to_hash }

    # PUT /suspend
    def suspend_account
      logger.info "Starting proccess to suspend the account..."
      permitted_params = params.require(:user).permit(:id, :email, :suspend_at, :suspend_end)

      if @user.nil?
        failed_message = "User with the given email (#{permitted_params[:email]}) not found."
        logger.info failed_message
        redirect_to admin_portal_admins_path, alert: failed_message
        return
      end

      logger.info "Suspending the account #{@user.email}..."
      update_params = {id: permitted_params[:id], suspend_at: permitted_params[:suspend_at], suspend_end: permitted_params[:suspend_end]}
      if @user.update(update_params)
        success_message = "Successfully to suspend the account."
        logger.info success_message
        redirect_to admin_portal_admins_path, notice: success_message
      else
        failed_message = @user&.errors&.first&.full_message || "Failed to suspend the admin account for #{@user.email}"
        logger.info failed_message
        redirect_to admin_portal_admins_path(suspend: @user.id), alert: failed_message
      end
      logger.info "The proccess to suspend the account finished..."
    end

    # PUT /activate
    def activate_account
      logger.info "Starting proccess to activate the account..."
      permitted_params = params.require(:user).permit(:id, :email, :suspend_at, :suspend_end)

      if @user.nil?
        failed_message = "User with the given email (#{permitted_params[:email]}) not found."
        logger.info failed_message
        redirect_to admin_portal_admins_path, alert: failed_message
        return
      end

      logger.info "Activating the account #{@user.email}..."
      update_params = {id: permitted_params[:id], suspend_at: permitted_params[:suspend_at], suspend_end: permitted_params[:suspend_end]}
      if @user.update(update_params)
        success_message = "Successfully to activate the account."
        logger.info success_message
        redirect_to admin_portal_admins_path, notice: success_message
      else
        failed_message = @user&.errors&.first&.full_message || "Failed to activate the admin account for #{@user.email}"
        logger.info failed_message
        redirect_to admin_portal_admins_path(suspend: @user.id), alert: failed_message
      end
      logger.info "The proccess to activate the account finished..."
    end

    private

    # Use callbacks to share common setup or constraints between actions.
    def set_user
      @user = User.find(params[:user][:id])
    end
  end
end
