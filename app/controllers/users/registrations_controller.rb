# frozen_string_literal: true

class Users::RegistrationsController < Devise::RegistrationsController
  # before_action :configure_sign_up_params, only: [:create]
  # before_action :configure_account_update_params, only: [:update]

  # GET /resource/sign_up
  # def new
  #   super
  # end

  # POST /resource
  # def create
  #   super
  # end

  # GET /resource/edit
  def edit
    # super

    render inertia: "Auth/EditPassword", props: {
      user: resource
    }
  end

  # PUT /resource
  def update
    # super

    self.resource = resource_class.to_adapter.get!(send(:"current_#{resource_name}").to_key)
    logger.info "Starting process to update password for auth:#{resource_name}/#{resource.email}"

    prev_unconfirmed_email = resource.unconfirmed_email if resource.respond_to?(:unconfirmed_email)
    logger.debug "Previous unconfirmed email: #{prev_unconfirmed_email}" if prev_unconfirmed_email

    resource_updated = update_resource(resource, account_update_params)
    if resource_updated
      logger.info "Password updated successfully for auth:#{resource_name}/#{resource.email}"
      set_flash_message_for_update(resource, prev_unconfirmed_email)
      bypass_sign_in resource, scope: resource_name if sign_in_after_change_password?

      logger.info "Redirecting to after update path configured in devise..."
      respond_with resource, location: after_update_path_for(resource)
    else
      clean_up_passwords resource
      set_minimum_password_length

      flash[:alert] = resource&.errors&.first&.full_message || "Failed to change the password"
      logger.error "Password failed to update for auth:#{resource_name}/#{resource.email}. Errors: #{resource.errors.full_messages.join(", ")}"
      redirect_to edit_user_registration_path, inertia: {
        errors: resource.errors,
        user: resource
      }
    end

    logger.info "Process to update password finished..."
  end

  # DELETE /resource
  # def destroy
  #   super
  # end

  # GET /resource/cancel
  # Forces the session data which is usually expired after sign
  # in to be expired now. This is useful if the user wants to
  # cancel oauth signing in/up in the middle of the process,
  # removing all OAuth session data.
  # def cancel
  #   super
  # end

  # protected

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_sign_up_params
  #   devise_parameter_sanitizer.permit(:sign_up, keys: [:attribute])
  # end

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_account_update_params
  #   devise_parameter_sanitizer.permit(:account_update, keys: [:attribute])
  # end

  # The path used after sign up.
  # def after_sign_up_path_for(resource)
  #   super(resource)
  # end

  # The path used after sign up for inactive accounts.
  # def after_inactive_sign_up_path_for(resource)
  #   super(resource)
  # end
end
