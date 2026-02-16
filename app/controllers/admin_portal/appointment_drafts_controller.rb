module AdminPortal
  class AppointmentDraftsController < ApplicationController
    include AppointmentsHelper
    include AppointmentDraftsHelper

    before_action :authenticate_user!

    def index
      service = AppointmentDraftsService.new(current_admin)

      # Allow filtering by admin for all users (not just super admins)
      # Options: "me" (assigned to current user), "all", or specific admin ID
      admin_filter_id = case params[:admin_id]
      when "me"
        current_admin.id
      when "all"
        nil
      else
        params[:admin_id].presence || current_admin.id
      end

      # Extract draft_id from params, handling potential "#" prefix (e.g., "#123" -> "123")
      draft_id_param = params[:draft_id].to_s.strip
      # Remove leading "#" if present
      draft_id = draft_id_param.sub(/^#/, "")
      # Only keep draft_id if it's a valid numeric string, otherwise set to nil
      draft_id = draft_id.presence if draft_id.match?(/\A\d+\z/)

      drafts = service.list_drafts(
        admin_id: draft_id.present? ? nil : admin_filter_id,
        created_by_id: params[:created_by_id],
        draft_id: draft_id
      )

      render inertia: "AdminPortal/Appointment/Drafts", props: deep_transform_keys_to_camel_case({
        drafts: drafts.map { |draft| serialize_draft(draft) },
        admins: InertiaRails.defer {
          Admin.joins(:user).where("users.suspend_at IS NULL OR users.suspend_end < ?", Time.current).order(:name).map do |admin|
            admin.as_json(include: :user)
          end
        }
      })
    end
  end
end
