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
            login: new_user_session_path,
            auth: {
              registration: {
                index: user_registration_path,
                edit: edit_user_registration_path
              },
              password: {
                index: user_password_path
              }
            },
            admin_portal_root_path: admin_portal_root_path,
            admin_portal: {
              admin_management: {
                index: admin_portal_admins_path,
                new: new_admin_portal_admin_path,
                generate_reset_password_url: generate_reset_password_url_admin_portal_admins_path,
                change_password: change_password_admin_portal_admins_path,
                suspend: admin_portal_suspend_path,
                activate: admin_portal_activate_path
              },
              therapist_management: {
                index: admin_portal_therapists_path,
                new: new_admin_portal_therapist_path,
                generate_reset_password_url: generate_reset_password_url_admin_portal_therapists_path,
                change_password: change_password_admin_portal_therapists_path
              },
              service_management: {
                index: admin_portal_services_path,
                update_status: update_status_admin_portal_services_path
              },
              location_management: {
                index: admin_portal_locations_path,
                create_bulk: create_bulk_admin_portal_locations_path,
                update_bulk: update_bulk_admin_portal_locations_path,
                delete_bulk: delete_bulk_admin_portal_locations_path
              }
            }
          },
          current_query: request.query_parameters.presence,
          current_locale: I18n.locale,
          current_timezone: Time.zone.name
        }
      )
    }
  end
end
