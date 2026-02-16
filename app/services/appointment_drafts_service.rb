class AppointmentDraftsService
  attr_reader :current_admin

  def initialize(current_admin)
    @current_admin = current_admin
  end

  # Create or update a draft
  def save_draft(params)
    draft = find_or_initialize_draft(params[:id])

    draft.assign_attributes(
      admin_pic_id: params[:admin_pic_id],
      created_by_admin_id: draft.new_record? ? current_admin.id : draft.created_by_admin_id,
      current_step: params[:current_step],
      form_data: params[:form_data]
    )

    if draft.save
      # Handle multiple admins if provided
      if params[:admin_ids].present?
        sync_admins(draft, params[:admin_ids], params[:primary_admin_id])
      elsif params[:admin_pic_id].present? && draft.new_record?
        # For backward compatibility, add admin_pic as an admin if no admin_ids provided
        admin = Admin.find_by(id: params[:admin_pic_id])
        draft.add_admin(admin, is_primary: true) if admin
      end

      {success: true, draft: draft}
    else
      {success: false, errors: draft.errors.full_messages}
    end
  end

  # Load a draft for continuing
  def load_draft(draft_id)
    draft = AppointmentDraft.active_drafts
      .includes(:admins, :primary_admin, :admin_pic, :created_by_admin)
      .find_by(id: draft_id)

    return {success: false, error: "Draft not found"} unless draft

    {
      success: true,
      draft: draft,
      form_data: draft.form_data,
      current_step: draft.current_step,
      admin_pic: draft.admin_pic,
      admins: draft.admins,
      primary_admin: draft.primary_admin
    }
  end

  # List drafts accessible to the current admin
  def list_drafts(filters = {})
    drafts = AppointmentDraft.active_drafts

    # Filter by assigned admin if specified
    if filters[:admin_id].present?
      drafts = drafts.joins(:appointment_draft_admins)
        .where(appointment_draft_admins: {admin_id: filters[:admin_id]})
    end

    # Filter by specific draft id if provided
    drafts = drafts.where(id: filters[:draft_id]) if filters[:draft_id].present?

    # Filter by created_by if specified
    drafts = drafts.created_by(filters[:created_by_id]) if filters[:created_by_id].present?

    # Order by most recently updated
    drafts = drafts.order(updated_at: :desc)

    # Include associations for eager loading
    drafts.includes(:admin_pic, :created_by_admin, :admins, :primary_admin)
  end

  def add_admin_to_draft(draft_id, admin)
    draft = AppointmentDraft.active_drafts.find_by(id: draft_id)

    return {success: false, error: "Draft not found"} unless draft
    return {success: false, error: "Admin not found"} unless admin

    if draft.admins.include?(admin)
      draft.ensure_admin_in_form_data!(admin)
      return {success: true, draft: draft}
    end

    draft.add_admin(admin)
    draft.ensure_admin_in_form_data!(admin)

    {success: true, draft: draft}
  rescue => e
    Rails.logger.error("Failed to add admin to draft ##{draft_id}: #{e.message}")
    {success: false, error: "Failed to add PIC to draft"}
  end

  # Mark draft as expired when appointment is created
  def complete_draft(draft_id, appointment)
    draft = AppointmentDraft.active_drafts.find_by(id: draft_id)

    return {success: false, error: "Draft not found"} unless draft

    draft.expire_with_appointment!(appointment)
    {success: true, draft: draft}
  end

  # Delete a draft
  def delete_draft(draft_id)
    draft = AppointmentDraft.find_by(id: draft_id)

    return {success: false, error: "Draft not found"} unless draft

    # Only allow deletion by creator or PIC
    unless can_manage_draft?(draft)
      return {success: false, error: "Not authorized to delete this draft"}
    end

    draft.destroy
    {success: true}
  end

  # Get drafts where current admin is PIC or assigned
  def my_assigned_drafts
    AppointmentDraft.active_drafts
      .joins(:appointment_draft_admins)
      .where(appointment_draft_admins: {admin_id: current_admin.id})
      .order(updated_at: :desc)
      .includes(:created_by_admin, :admins, :primary_admin)
  end

  # Get drafts created by current admin
  def my_created_drafts
    AppointmentDraft.active_drafts
      .created_by(current_admin.id)
      .order(updated_at: :desc)
      .includes(:admin_pic, :admins, :primary_admin)
  end

  private

  def find_or_initialize_draft(id)
    if id.present?
      draft = AppointmentDraft.find_by(id: id)
      draft || AppointmentDraft.new
    else
      AppointmentDraft.new
    end
  end

  def can_manage_draft?(draft)
    draft.created_by_admin_id == current_admin.id ||
      draft.admins.include?(current_admin) ||
      current_admin.is_super_admin?
  end

  def sync_admins(draft, admin_ids, primary_admin_id = nil)
    return if admin_ids.blank?

    # Determine which admins to add and which to remove
    current_admin_ids = draft.admins.pluck(:id)
    new_admin_ids = admin_ids.map(&:to_s)

    # Remove admins not in the new list
    to_remove = current_admin_ids - new_admin_ids
    to_remove.each do |admin_id|
      admin = Admin.find(admin_id)
      draft.remove_admin(admin)
    end

    # Add new admins
    to_add = new_admin_ids - current_admin_ids
    to_add.each do |admin_id|
      admin = Admin.find(admin_id)
      is_primary = (admin_id.to_s == primary_admin_id.to_s) || draft.admins.empty?
      draft.add_admin(admin, is_primary: is_primary)
    end

    # Set primary admin if specified
    if primary_admin_id.present?
      primary_admin = Admin.find(primary_admin_id)
      draft.set_primary_admin(primary_admin)
    end
  end
end
