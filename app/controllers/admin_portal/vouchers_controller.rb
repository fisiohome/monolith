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

    def new
      render inertia: "AdminPortal/Voucher/New", props: deep_transform_keys_to_camel_case({})
    end

    private

    def vouchers_service
      @vouchers_service ||= AdminPortal::VouchersService.new(key_format: :camel)
    end

    def vouchers_list
      @vouchers_list ||= vouchers_service.list
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

    def ensure_admin!
      return if current_user&.admin.present?

      redirect_to authenticated_root_path, alert: "You do not have access to this resource."
    end
  end
end
