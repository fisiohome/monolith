module InertiaAdminPortal
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_user!

    inertia_share adminPortal: -> {
      deep_transform_keys_to_camel_case(
        {
          router: {
            root: root_path,
            authenticated_root_path: authenticated_root_path,
            logout: destroy_user_session_path,
            admin_portal_root_path: admin_portal_root_path,
            admin_portal: {
              admin_management: {
                index: admin_portal_admins_path,
                new: new_admin_portal_admin_path
              }
            }
          },
          current_query: request.query_parameters.present? ? request.query_parameters : nil,
          current_locale: I18n.locale,
          current_timezone: Time.zone.name
        }
      )
    }
  end
end
