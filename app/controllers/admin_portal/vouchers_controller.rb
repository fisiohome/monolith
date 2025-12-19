module AdminPortal
  class VouchersController < ApplicationController
    before_action :ensure_admin!

    def index
      render inertia: "AdminPortal/Voucher/Index", props: deep_transform_keys_to_camel_case({
        vouchers: InertiaRails.defer { vouchers_list[:vouchers] },
        vouchersMeta: InertiaRails.defer { vouchers_list[:meta] },
        selectedVoucher: InertiaRails.defer { selected_voucher },
        packages: InertiaRails.defer { packages_list }
      })
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
      return if params[:id].blank?

      @selected_voucher ||= vouchers_service.find(params[:id])[:voucher]
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
