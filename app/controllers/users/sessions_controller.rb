# frozen_string_literal: true

class Users::SessionsController < Devise::SessionsController
  # before_action :configure_sign_in_params, only: [:create]

  # GET /resource/sign_in
  def new
    # super
    render inertia: "Auth/SignIn", props: {
      rememberable: devise_mapping.rememberable?
    }
  end

  # POST /resource/sign_in
  def create
    super do |resource|
      authenticate_with_external_api if resource.persisted?
    end
  end

  # DELETE /resource/sign_out
  def destroy
    session.delete(:external_api_token)
    session.delete(:external_api_refresh_token)
    session.delete(:external_api_token_expires_at)
    super
  end

  # protected

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_sign_in_params
  #   devise_parameter_sanitizer.permit(:sign_in, keys: [:attribute])
  # end

  private

  def authenticate_with_external_api
    response = FisiohomeApi::Client.authenticate(
      email: sign_in_params[:email],
      password: sign_in_params[:password]
    )

    if response[:success]
      session[:external_api_token] = response[:access_token]
      session[:external_api_refresh_token] = response[:refresh_token]
      session[:external_api_token_expires_at] = response[:expires_at]
    else
      Rails.logger.warn("[SessionsController] External API authentication failed for user: #{sign_in_params[:email]}")
    end
  rescue => e
    Rails.logger.error("[SessionsController] External API authentication error: #{e.message}")
  end
end
