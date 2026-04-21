module Api
  module V1
    class AppointmentsController < ApplicationController
      # Skip Inertia rendering for API responses
      skip_before_action :verify_authenticity_token, if: -> { request.format.json? }

      # Only respond to JSON
      before_action :ensure_json_request

      # Include necessary helper methods
      include AppointmentsHelper
      include AppointmentDraftsHelper

      # Draft endpoints
      def drafts
        service = AppointmentDraftsService.new(current_admin)
        drafts = service.list_drafts(
          admin_pic_id: params[:admin_pic_id],
          created_by_id: params[:created_by_id]
        )

        render json: {
          success: true,
          drafts: drafts.map { |draft| serialize_draft(draft) }
        }
      end

      def draft
        service = AppointmentDraftsService.new(current_admin)
        result = service.load_draft(params[:id])

        if result[:success]
          render json: {
            success: true,
            draft: serialize_draft(result[:draft]),
            form_data: result[:form_data],
            current_step: result[:current_step],
            admins: result[:admins]&.map do |admin|
              {
                id: admin.id,
                name: admin.name,
                email: admin.user&.email,
                is_primary: result[:primary_admin] == admin
              }
            end,
            primary_admin_id: result[:primary_admin]&.id
          }
        else
          render json: {success: false, error: result[:error]}, status: :not_found
        end
      end

      def save_draft
        service = AppointmentDraftsService.new(current_admin)
        result = service.save_draft(draft_params)

        if result[:success]
          render json: {
            success: true,
            draft: serialize_draft(result[:draft])
          }
        else
          render json: {success: false, errors: result[:errors]}, status: :unprocessable_entity
        end
      rescue => e
        Rails.logger.error "Draft save error: #{e.message}"
        render json: {success: false, errors: [e.message]}, status: :internal_server_error
      end

      def delete_draft
        service = AppointmentDraftsService.new(current_admin)
        result = service.delete_draft(params[:id])

        if result[:success]
          render json: {success: true}
        else
          render json: {success: false, error: result[:error]}, status: :unprocessable_entity
        end
      end

      def add_pic
        service = AppointmentDraftsService.new(current_admin)
        result = service.add_admin_to_draft(params[:id], current_admin)

        if result[:success]
          render json: {success: true}
        else
          render json: {success: false, error: result[:error]}, status: :unprocessable_entity
        end
      rescue => e
        Rails.logger.error("Add PIC error: #{e.message}")
        render json: {success: false, error: "Failed to add PIC"}, status: :internal_server_error
      end

      def draft_update_status_reason
        service = AppointmentDraftsService.new(current_admin)
        result = service.update_status_reason(params[:id], params[:status_reason])

        if result[:success]
          render json: {success: true, draft: serialize_draft(result[:draft])}
        else
          render json: {success: false, error: result[:error]}, status: :unprocessable_entity
        end
      rescue => e
        Rails.logger.error("Update status reason error: #{e.message}")
        render json: {success: false, error: "Failed to update status reason"}, status: :internal_server_error
      end

      def queue_code
        result = AdminPortal::Orders::QueueCodeRequestServiceExternalApi.new.call

        if result[:success]
          render json: result
        else
          render json: result, status: :bad_gateway
        end
      rescue => e
        Rails.logger.error("Queue code request error: #{e.class} - #{e.message}")
        render json: {success: false, error: "Failed to reserve queue code."}, status: :internal_server_error
      end

      def regenerate_invoice
        order = Order.find(params[:order_id])
        Rails.logger.info "Starting external API regenerate invoice for order ID: #{order.id}"

        expiry_minutes = params.dig(:form_data, :expiry_minutes)

        result = AdminPortal::Orders::RegenerateInvoiceServiceExternalApi.new(order, expiry_minutes).call

        if result[:success]
          render json: {
            success: result.dig(:data, "success"),
            message: result.dig(:data, "message"),
            data: result.dig(:data, "data")
          }
        else
          default_error_message = "Failed to regenerate invoice"
          error_message = result[:error] || default_error_message
          Rails.logger.error "#{default_error_message}: #{error_message}"
          render json: {success: false, error: error_message}, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error: "Order not found"}, status: :not_found
      end

      private

      def ensure_json_request
        unless request.format.json?
          render json: {error: "API only accepts JSON requests"}, status: :not_acceptable
        end
      end
    end
  end
end
