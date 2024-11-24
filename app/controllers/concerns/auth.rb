module Auth
  extend ActiveSupport::Concern

  included do
    # The callback which stores the current location must be added before you authenticate the user
    # as `authenticate_user!` (or whatever your resource is) will halt the filter chain and redirect
    # before the location can be stored.
    before_action :authenticate_user!

    # for tracking if the user is online
    after_action :update_user_online, if: :user_signed_in?

    # rescue_from CanCan::AccessDenied do
    #   render inertia: "Error", props: { status: 403 }
    # end

    inertia_share auth: -> {
      user_data = current_user.as_json(
        only: %i[id email],
        include: {
          admin: {
            only: %i[id name admin_type],
            methods: %i[is_super_admin? is_admin_l1? is_admin_l2? is_admin_l3? is_admin_backlog?]
          }
        }
      )

      deep_transform_keys_to_camel_case(
        {
          current_user: authenticate_user! ? user_data["admin"].merge(user: user_data.slice("id", "email")) : nil
        }
      )
    }
  end

  private

  # overriding the devise fn
  def after_sign_out_path_for(_resource_or_scope)
    new_user_session_path
  end

  def update_user_online
    return if session[:last_online_at] && session[:last_online_at] >= 3.minutes.ago

    logger.info "Updating the current session online time..."
    current_user.update!(last_online_at: Time.current)
    session[:last_online_at] = Time.current
  end
end
