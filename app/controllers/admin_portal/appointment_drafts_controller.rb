module AdminPortal
  class AppointmentDraftsController < ApplicationController
    include AppointmentsHelper
    include AppointmentDraftsHelper

    before_action :authenticate_user!

    def index
      service = AppointmentDraftsService.new(current_admin)

      # For super admins, use the admin_pic_id param, default to current admin if none specified
      # For regular admins, always filter to their own drafts
      admin_pic_id = if current_admin.is_super_admin?
        params[:admin_pic_id].presence || current_admin.id
      else
        current_admin.id
      end

      drafts = service.list_drafts(
        admin_pic_id: admin_pic_id,
        created_by_id: params[:created_by_id]
      )

      render inertia: "AdminPortal/Appointment/Drafts", props: deep_transform_keys_to_camel_case({
        drafts: drafts.map { |draft| serialize_draft(draft) },
        admins: InertiaRails.defer {
          Admin.joins(:user).where("users.suspend_at IS NULL OR users.suspend_end < ?", Time.current).order(:name).map do |admin|
            {
              id: admin.id,
              name: admin.name,
              email: admin.user&.email
            }
          end
        }
      })
    end
  end
end
