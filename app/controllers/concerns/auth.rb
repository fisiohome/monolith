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
      deep_transform_keys_to_camel_case(
        {
          # currentUser: current_user.as_json(
          #   only: %i[id email sign_in_count current_sign_in_at last_sign_in_at current_sign_in_ip last_sign_in_ip created_at updated_at]
          #   )&.deep_transform_keys { |key| key.to_s.camelize(:lower) }
          # current_user: current_user
          current_user: current_user&.present? ? Admin.find(current_user&.id).as_json(
            only: %i[id name admin_type],
            include: {
              user: {
                only: %i[id email]
              }
            }
          ) : nil
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
    return if session[:last_online_at] && session[:last_online_at] >= 5.minutes.ago

    logger.info "Updating the current session onlint time..."
    current_user.update!(last_online_at: Time.current)
    session[:last_online_at] = Time.current
  end
end
