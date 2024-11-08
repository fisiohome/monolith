module InertiaAdminPortal
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_user!

    inertia_share adminPortal: -> {
      deep_transform_keys_to_camel_case(
        {
          router: {
            root: root_path,
            logout: destroy_user_session_path
            # admin_root_path: admin_root_path,
            # accountManagement: { index: admin_account_management_index_path }
          }
        }
      )
    }
  end
end
