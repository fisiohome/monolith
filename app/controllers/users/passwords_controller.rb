# frozen_string_literal: true

class Users::PasswordsController < Devise::PasswordsController
  # GET /resource/password/new
  # def new
  #   super
  # end

  # POST /resource/password
  # def create
  #   super
  # end

  # GET /resource/password/edit?reset_password_token=abcdef
  def edit
    super

    render inertia: "Auth/ResetPassword", props: {
      resource: self.resource
    }
  end

  # PUT /resource/password
  def update
    # super

    self.resource = resource_class.reset_password_by_token(resource_params)
    logger.info "Starting process to reset password for auth:#{resource_name}/#{resource.email}"

    if resource.errors.empty?
      resource.unlock_access! if unlockable?(resource)
      logger.info "Password reset successfully for auth:#{resource_name}/#{resource.email}"
      if resource_class.sign_in_after_reset_password
        flash_message = resource.active_for_authentication? ? :updated : :updated_not_active
        set_flash_message!(:notice, flash_message)
        resource.after_database_authentication
        logger.info "Redirecting with sign in automatically..."
        sign_in(resource_name, resource)
      else
        flash[:notice] = :updated_not_active
        set_flash_message!(:notice, :updated_not_active)
      end

      logger.info "Redirecting to after reset password path configured in devise..."
      respond_with resource, location: after_resetting_password_path_for(resource)
    else
      set_minimum_password_length

      flash[:alert] = resource&.errors&.first&.full_message || "Failed to reset the password"
      logger.error "Password failed to reset for auth:#{resource_name}/#{resource.email}. Errors: #{resource.errors.full_messages.join(", ")}"
      redirect_to edit_user_password_path(reset_password_token: resource_params[:reset_password_token]), inertia: {
        errors: resource.errors,
        resource: resource
      }
    end

    logger.info "Process to reset the password finished..."
  end

  # protected

  # def after_resetting_password_path_for(resource)
  #   super(resource)
  # end

  # The path used after sending reset password instructions
  # def after_sending_reset_password_instructions_path_for(resource_name)
  #   super(resource_name)
  # end
end
