module Auth
  extend ActiveSupport::Concern

  included do
    # before_action :store_user_location!, if: :storable_location?

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

  #   # Its important that the location is NOT stored if:
  #   # - The request method is not GET (non idempotent)
  #   # - The request is handled by a Devise controller such as Devise::SessionsController as that could cause an
  #   #    infinite redirect loop.
  #   # - The request is an Ajax request as this can lead to very unexpected behaviour.
  #   # - The request is not a Turbo Frame request ([turbo-rails](https://github.com/hotwired/turbo-rails/blob/main/app/controllers/turbo/frames/frame_request.rb))
  #   def storable_location?
  #     # request.get? && is_navigational_format? && !devise_controller? && !request.xhr? && !turbo_frame_request?

  #     request.get? &&
  #       is_navigational_format? &&
  #       !devise_controller? &&
  #       !request.xhr?
  #   end

  # def after_sign_in_path_for(resource)
  #   stored_location_for(resource) || root_path
  # end

  # def after_sign_out_path_for(_resource_or_scope)
  #   new_user_session_path
  # end
end
