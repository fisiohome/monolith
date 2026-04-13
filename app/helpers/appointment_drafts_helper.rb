module AppointmentDraftsHelper
  def current_admin
    @current_admin ||= current_user.admin
  end

  def serialize_draft(draft, include_form_data: false)
    result = {
      id: draft.id,
      created_by_admin: {
        id: draft.created_by_admin.id,
        name: draft.created_by_admin.name,
        email: draft.created_by_admin.user&.email
      },
      current_step: draft.current_step,
      step_index: draft.step_index,
      next_step: draft.next_step,
      expires_at: draft.expires_at,
      created_at: draft.created_at,
      updated_at: draft.updated_at,
      status: draft.status,
      status_reason: draft.status_reason
    }

    # Include admin_pic for backward compatibility
    if draft.admin_pic
      result[:admin_pic] = {
        id: draft.admin_pic.id,
        name: draft.admin_pic.name,
        email: draft.admin_pic.user&.email
      }
    end

    # Include all admins if loaded
    if draft.association_cached?(:admins)
      result[:admins] = draft.admins.map do |admin|
        {
          id: admin.id,
          name: admin.name,
          email: admin.user&.email,
          is_primary: draft.primary_admin == admin
        }
      end
    end

    # Include form data if present and option is enabled
    if include_form_data && draft.form_data.present?
      result[:form_data] = draft.form_data
    end

    # Extract specific fields from form data for easier access
    # JSONB columns return hash objects directly in Rails
    result[:patient_record_source] = draft.form_data&.dig("formOptions", "patientRecordSource")
    result[:patient_contact_source] = draft.form_data&.dig("formOptions", "patientContactSource")

    result
  end

  def draft_params
    params.require(:draft).permit(
      :id,
      :admin_pic_id,
      :primary_admin_id,
      :current_step,
      admin_ids: [],
      form_data: {}
    ).tap do |whitelisted|
      whitelisted[:form_data] = params[:draft][:form_data].to_unsafe_h if params[:draft][:form_data].present?
    end
  end
end
