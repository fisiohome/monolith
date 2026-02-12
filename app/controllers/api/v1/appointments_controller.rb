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
        Rails.logger.error e.backtrace.join("\n")
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

      private

      def ensure_json_request
        unless request.format.json?
          render json: {error: "API only accepts JSON requests"}, status: :not_acceptable
        end
      end
    end
  end
end
