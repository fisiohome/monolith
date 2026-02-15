module AdminPortal
  class VouchersController < ApplicationController
    before_action :ensure_admin!

    def index
      list_data = vouchers_list
      render inertia: "AdminPortal/Voucher/Index", props: {
        vouchers: InertiaRails.defer { list_data["vouchers"] },
        vouchersMeta: InertiaRails.defer { list_data["meta"] },
        selectedVoucher: InertiaRails.defer { selected_voucher },
        packages: InertiaRails.defer { packages_list }
      }
    end

    def create
      result = vouchers_service.create(voucher_params)

      if result[:success]
        redirect_to admin_portal_vouchers_path, notice: "Voucher created successfully."
      else
        handle_voucher_failure(
          result[:errors],
          redirect_params: {new: "voucher"}
        )
      end
    end

    def update
      result = vouchers_service.update(params[:id], voucher_params)

      if result[:success]
        redirect_to admin_portal_vouchers_path, notice: "Voucher updated successfully."
      else
        handle_voucher_failure(
          result[:errors],
          redirect_params: {edit: params[:id], id: params[:id]}
        )
      end
    end

    def destroy
      result = vouchers_service.destroy(params[:id])

      if result[:success]
        redirect_to admin_portal_vouchers_path, notice: "Voucher deleted successfully."
      else
        handle_voucher_failure(
          result[:errors],
          redirect_params: {id: params[:id]}
        )
      end
    end

    def delete
    end

    def bulk_upload
      return unless request.post?

      file = params[:excel_file]
      save_to_db = params[:save_to_db] == "true"

      if file.blank?
        render json: {success: false, message: "Please select an Excel file to upload."}
        return
      end

      unless file.content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.original_filename.end_with?(".xlsx")
        message = "Only Excel (.xlsx) files are accepted. Please download the template."
        render json: {success: false, message: message}
        return
      end

      result = vouchers_service.bulk_create(file, save_to_db: save_to_db)

      # If saving to database and successful, set flash message
      if save_to_db && result[:success]
        flash[:notice] = result[:message]
      end

      # Always return JSON for AJAX requests
      render json: result
    end

    def download_template
      template = AdminPortal::VoucherTemplateService.generate_template

      send_data(
        template,
        filename: "voucher_template.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        disposition: "attachment"
      )
    rescue => e
      Rails.logger.error "[VouchersController] Template download error: #{e.message}"
      redirect_to admin_portal_vouchers_path, alert: "Failed to generate template. Please try again."
    end

    private

    def vouchers_service
      @vouchers_service ||= AdminPortal::VouchersService.new(key_format: :camel)
    end

    def vouchers_list
      @vouchers_list ||= vouchers_service.list(
        code: params[:code],
        is_active: params[:is_active],
        discount_type: params[:discount_type],
        page: params[:page],
        limit: params[:limit]
      )
    end

    def packages_list
      @packages_list ||= Package
        .includes(:service)
        .all
        .map do |package|
          deep_transform_keys_to_camel_case(
            package.as_json(include: {service: {only: [:id, :name, :description]}})
          )
        end
    end

    def selected_voucher
      # Check both URL params and query params for ID
      voucher_id = params[:id] || request.query_parameters[:id]
      return if voucher_id.blank?

      result = vouchers_service.find(voucher_id)
      @selected_voucher ||= result["voucher"] # Use string key since find returns string keys with camelCase
    end

    def voucher_params
      params.require(:voucher).permit(
        :code,
        :name,
        :description,
        :discount_type,
        :discount_value,
        :max_discount_amount,
        :min_order_amount,
        :quota,
        :valid_from,
        :valid_until,
        :is_active,
        package_ids: []
      )
    end

    def handle_voucher_failure(errors, redirect_params:)
      flash[:alert] = extract_error_message(errors)
      redirect_to admin_portal_vouchers_path(redirect_params), inertia: {
        errors: errors || {}
      }
    end

    def extract_error_message(errors)
      return "Failed to process voucher." if errors.blank?

      messages = errors[:fullMessages] || errors["fullMessages"] ||
        errors[:full_messages] || errors["full_messages"]

      Array(messages).presence&.first || "Failed to process voucher."
    end

    def ensure_admin!
      return if current_user&.admin.present?

      redirect_to authenticated_root_path, alert: "You do not have access to this resource."
    end
  end
end
