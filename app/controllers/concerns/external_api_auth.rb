module ExternalApiAuth
  extend ActiveSupport::Concern

  included do
    # Automatically refresh the external API token before each request if needed
    before_action :refresh_external_api_token_if_needed, if: :user_signed_in?
  end

  private

  # Returns the current external API access token from session
  # @return [String, nil] the access token or nil if not present
  def external_api_token
    session[:external_api_token]
  end

  # Checks if the current external API token is valid
  # @return [Boolean] true if token exists and hasn't expired
  def external_api_token_valid?
    return false if session[:external_api_token].blank?
    return true if session[:external_api_token_expires_at].blank?

    session[:external_api_token_expires_at] > Time.current
  end

  # Refreshes the external API token if it's expired or invalid
  # Uses the refresh token stored in session to obtain new credentials
  # Clears session if refresh fails
  def refresh_external_api_token_if_needed
    # Skip if token is still valid
    return if external_api_token_valid?
    # Skip if no refresh token available
    return if session[:external_api_refresh_token].blank?

    # Request new tokens from external API
    response = FisiohomeApi::Client.refresh_access_token(
      refresh_token: session[:external_api_refresh_token]
    )

    if response[:success]
      # Update session with new credentials
      session[:external_api_token] = response[:access_token]
      session[:external_api_refresh_token] = response[:refresh_token]
      session[:external_api_token_expires_at] = response[:expires_at]
      Rails.logger.info("[ExternalApiAuth] Token refreshed successfully")
    else
      # Clear session if refresh failed
      clear_external_api_session!
      Rails.logger.warn("[ExternalApiAuth] Token refresh failed, cleared session")
    end
  rescue => e
    Rails.logger.error("[ExternalApiAuth] Token refresh error: #{e.message}")
  end

  # Removes all external API credentials from session
  def clear_external_api_session!
    session.delete(:external_api_token)
    session.delete(:external_api_refresh_token)
    session.delete(:external_api_token_expires_at)
  end
end
