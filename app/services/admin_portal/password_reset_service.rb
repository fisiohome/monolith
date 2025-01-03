# docs:
# https://github.com/heartcombo/devise/blob/main/lib/devise/models/recoverable.rb
# The AdminPortal module encapsulates all the classes related to the admin portal functionalities.
module AdminPortal
  # The PasswordResetService class is responsible for handling password reset operations.
  # It initializes with an email, a URL helper, and an optional logger.
  class PasswordResetService
    # Initializes the PasswordResetService with the given email, URL helper, and logger.
    #
    # @param email [String] the email of the user to reset the password for
    # @param url_helper [Object] the URL helper to generate the URL
    # @param logger [Logger] the logger to log messages (default: Rails.logger)
    def initialize(email, url_helper, logger = Rails.logger)
      @user = User.find_by(email: email)
      @url_helper = url_helper
      @logger = logger
    end

    # Generates the password reset URL for the user.
    #
    # @return [Hash] a hash containing the generated URL or an error message and status
    def generate_reset_password_url
      PasswordResetUrlGenerator.new(@user, @url_helper, @logger).generate
    end

    # Changes the password of the user with the given parameters.
    #
    # @param params [Hash] the parameters for changing the password
    # @return [Hash] a hash containing a success or error message and a redirect URL
    def change_password(params)
      PasswordChanger.new(@user, @url_helper, @logger).change(params)
    end

    private

    # The PasswordResetUrlGenerator class is responsible for generating a password reset URL for a user.
    # It initializes with a user, a URL helper, and an optional logger.
    class PasswordResetUrlGenerator
      # Initializes the PasswordResetUrlGenerator with the given user, URL helper, and logger.
      #
      # @param user [User] the user for whom to generate the password reset URL
      # @param url_helper [Object] the URL helper to generate the URL
      # @param logger [Logger] the logger to log messages (default: Rails.logger)
      def initialize(user, url_helper, logger = Rails.logger)
        @user = user
        @url_helper = url_helper
        @logger = logger
      end

      # Generates the password reset URL for the user.
      #
      # @return [Hash] a hash containing the generated URL or an error message and status
      def generate
        if @user.nil?
          failed_message = "Failed to generate change password link, the User not found."
          @logger.error(failed_message)
          return {error: failed_message, status: :not_found}
        end

        # if @user.reset_password_period_valid?
        #   @logger.info("The user already has a valid reset password token.")
        #   reset_password_url = @url_helper.edit_user_password_url(reset_password_token: @user.reset_password_token)
        #   return {link: reset_password_url}
        # end

        # send reset password instructions email
        token = @user.send_reset_password_instructions
        reset_password_url = @url_helper.edit_user_password_url(reset_password_token: token)

        # genereate reset password token manually (without sending the email)
        # raw, hashed = Devise.token_generator.generate(User, :reset_password_token)
        # @user.update(reset_password_token: hashed, reset_password_sent_at: Time.now.utc)
        # reset_password_url = @url_helper.edit_user_password_url(reset_password_token: raw)

        @logger.info("URL successfully generated: #{reset_password_url}.")
        {link: reset_password_url}
      end
    end

    # The PasswordChanger class is responsible for changing the password of a user.
    # It initializes with a user, a URL helper, and an optional logger.
    class PasswordChanger
      # Initializes the PasswordChanger with the given user, URL helper, and logger.
      #
      # @param user [User] the user whose password is to be changed
      # @param url_helper [Object] the URL helper to generate the URL
      # @param logger [Logger] the logger to log messages (default: Rails.logger)
      def initialize(user, url_helper, logger = Rails.logger)
        @user = user
        @url_helper = url_helper
        @logger = logger
      end

      # Changes the password of the user with the given parameters.
      #
      # @param params [Hash] the parameters for changing the password
      # @return [Hash] a hash containing a success or error message and a redirect URL
      def change(params)
        if @user.nil?
          failed_message = "User with the given email (#{params[:email]}) not found."
          @logger.error(failed_message)
          return {alert: failed_message, redirect_to: @url_helper.admin_portal_admins_path}
        end

        if @user.reset_password(params[:password], params[:password_confirmation])
          success_message = "Password successfully changed."
          @logger.info(success_message)
          {notice: success_message, redirect_to: @url_helper.admin_portal_admins_path}
        else
          failed_message = @user&.errors&.first&.full_messages || "Failed to change the password."
          @logger.error(failed_message)
          {alert: failed_message, redirect_to: @url_helper.admin_portal_admins_path(change_password: @user.admin.id)}
        end
      end
    end
  end
end
