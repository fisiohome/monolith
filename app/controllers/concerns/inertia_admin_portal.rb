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
                change_password: change_password_admin_portal_therapists_path,
                schedules: admin_portal_therapist_schedules_path
              },
              patient_management: {
                index: admin_portal_patients_path
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
              },
              vouchers: vouchers_menu,
              feature_flags: feature_flags_menu,
              telegram_broadcasts: telegram_broadcasts_menu,
              appointment: {
                index: admin_portal_appointments_path,
                new: new_admin_portal_appointment_path,
                book: book_admin_portal_appointments_path,
                sync: sync_data_master_admin_portal_appointments_path,
                export: export_admin_portal_appointments_path
              },
              availability: {
                index: admin_portal_availabilities_path,
                upsert: upsert_admin_portal_availabilities_path,
                sync_leaves: sync_leaves_admin_portal_availabilities_path
              },
              settings: {
                account_security: admin_portal_settings_account_security_path,
                appearance: admin_portal_settings_appearance_path
              }
            },
            api: {
              services: {
                index: api_v1_services_path
              },
              therapists: {
                feasible: feasible_api_v1_therapists_path
              }
            }
          },
          feature_flags: {
            telegram_broadcasts_enabled: telegram_broadcast_feature_flag_enabled?
          },
          current_query: request.query_parameters.presence,
          current_locale: I18n.locale,
          current_timezone: Time.zone.name,
          protect: {
            here_map_api_key: Rails.application.credentials.here_map ? Rails.application.credentials.here_map.api_key : nil
          }
        }
      )
    }
  end

  private

  # Returns voucher menu routes if user is an admin
  def vouchers_menu
    return if current_user&.admin.blank?

    {index: admin_portal_vouchers_path}
  end

  # Returns telegram broadcasts menu routes if user is an admin
  def telegram_broadcasts_menu
    return if current_user&.admin.blank?

    {
      index: admin_portal_telegram_broadcasts_path
    }
  end

  # Returns feature flags menu routes if user is a super admin
  def feature_flags_menu
    admin = current_user&.admin
    return if admin.blank? || !admin.is_super_admin?

    {index: admin_portal_feature_flags_path}
  end

  def telegram_broadcast_feature_flag_enabled?
    @telegram_broadcast_feature_flag_enabled ||= begin
      FeatureFlagChecker.enabled?(FeatureFlagChecker::TELEGRAM_BROADCASTS_KEY)
    rescue => e
      Rails.logger.error("[FeatureFlagChecker] Error checking TELEGRAM_BROADCASTS flag: #{e.message}")
      false
    end
  end
end
