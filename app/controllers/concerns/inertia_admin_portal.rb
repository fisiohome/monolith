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
            auth: {
              registration: {
                index: user_registration_path,
                edit: edit_user_registration_path
              }
            },
            admin_portal_root_path: admin_portal_root_path,
            admin_portal: {
              admin_management: {
                index: admin_portal_admins_path,
                new: new_admin_portal_admin_path,
                generate_reset_password_url: generate_reset_password_url_admin_portal_admins_path,
                change_password: change_password_admin_portal_admins_path
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
