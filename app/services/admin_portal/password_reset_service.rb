# docs:
# https://github.com/heartcombo/devise/blob/main/lib/devise/models/recoverable.rb
# The AdminPortal module encapsulates all the classes related to the admin portal functionalities.
module AdminPortal
  # The PasswordResetService class is responsible for handling password reset operations.
  # It initializes with parameters, a URL helper, and an optional logger.
  class PasswordResetService
    # Initializes the PasswordResetService with the given parameters and URL helper.
    #
    # @param params [Hash] the parameters including the email of the user to reset the password for
    # @param url_helper [Object] the URL helper to generate the URL
    def initialize(params:, url_helper:)
      @user = User.find_by(email: params[:email])
      @params = params
      @url_helper = url_helper
    end

    # Generates the password reset URL for the user.
    #
    # @return [Hash] a hash containing the generated URL or an error message and status
    def generate_reset_password_url
      PasswordResetUrlGenerator.new(user: @user, url_helper: @url_helper).generate
    end

    # Changes the password of the user with the given parameters.
    #
    # @return [Hash] a hash containing a success or error message and a redirect URL
    def change_password
      PasswordChanger.new(user: @user, params: @params, url_helper: @url_helper).change
    end

    private

    # The PasswordResetUrlGenerator class is responsible for generating a password reset URL for a user.
    # It initializes with a user and a URL helper.
    class PasswordResetUrlGenerator
      # Initializes the PasswordResetUrlGenerator with the given user and URL helper.
      #
      # @param user [User] the user for whom to generate the password reset URL
      # @param url_helper [Object] the URL helper to generate the URL
      def initialize(user:, url_helper:)
        @user = user
        @url_helper = url_helper
      end

      # Generates the password reset URL for the user.
      #
      # @return [Hash] a hash containing the generated URL or an error message and status
      def generate
        if @user.nil?
          failed_message = "Failed to generate change password link, the User not found."
          Rails.logger.error(failed_message)
          return {error: failed_message, status: :not_found}
        end

        # send reset password instructions email
        token = @user.send_reset_password_instructions
        reset_password_url = @url_helper.edit_user_password_url(reset_password_token: token)

        Rails.logger.info("URL successfully generated: #{reset_password_url}.")
        {link: reset_password_url}
      end
    end

    # The PasswordChanger class is responsible for changing the password of a user.
    # It initializes with a user, parameters, and a URL helper.
    class PasswordChanger
      # Initializes the PasswordChanger with the given user, parameters, and URL helper.
      #
      # @param user [User] the user whose password is to be changed
      # @param params [Hash] the parameters for changing the password
      # @param url_helper [Object] the URL helper to generate the URL
      def initialize(user:, params:, url_helper:)
        @user = user
        @params = params
        @url_helper = url_helper
      end

      # Changes the password of the user with the given parameters.
      #
      # @return [Hash] a hash containing a success or error message and a redirect URL
      def change
        if @user.nil?
          failed_message = "User with the given email (#{@params[:email]}) not found."
          Rails.logger.error(failed_message)
          return {alert: failed_message, redirect_to: @url_helper.send(:"admin_portal_#{@url_helper.controller_name}_path")}
        end

        if @user.reset_password(@params[:password], @params[:password_confirmation])
          success_message = "Password successfully changed."
          Rails.logger.info(success_message)
          {notice: success_message, redirect_to: @url_helper.send(:"admin_portal_#{@url_helper.controller_name}_path")}
        else
          failed_message = @user&.errors&.first&.full_messages || "Failed to change the password."
          Rails.logger.error(failed_message)
          {alert: failed_message, redirect_to: @url_helper.send(:"admin_portal_#{@url_helper.controller_name}_path", change_password: @user.admin.id)}
        end
      end
    end
  end
end
