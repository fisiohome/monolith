module InertiaAdminPortal
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_user!

    inertia_share adminPortal: -> {
      deep_transform_keys_to_camel_case(
        {
          router: {
            root: root_path,
            admin_root_path: admin_root_path,
            authenticated_root_path: authenticated_root_path,
            logout: destroy_user_session_path,
            accountManagement: {
              index: admin_account_management_index_path,
              new: new_admin_account_management_path
            }
          },
          current_locale: I18n.locale,
          current_timezone: Time.zone.name
        }
      )
    }
  end
end
