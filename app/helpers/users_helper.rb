module UsersHelper
  def user_params_helper
    params.require(:user).permit(:email, :password, :password_confirmation)
  end
end
