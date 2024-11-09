module Auth
  extend ActiveSupport::Concern

  included do
    # The callback which stores the current location must be added before you authenticate the user
    # as `authenticate_user!` (or whatever your resource is) will halt the filter chain and redirect
    # before the location can be stored.
    before_action :authenticate_user!

    # rescue_from CanCan::AccessDenied do
    #   render inertia: "Error", props: { status: 403 }
    # end

    inertia_share auth: -> {
      {
        currentUser: current_user.as_json(
          only: %i[id email sign_in_count current_sign_in_at last_sign_in_at current_sign_in_ip last_sign_in_ip created_at updated_at]
          )&.deep_transform_keys { |key| key.to_s.camelize(:lower) }
      }
    }
  end

  private

  def after_sign_out_path_for(_resource_or_scope)
    new_user_session_path
  end
end
