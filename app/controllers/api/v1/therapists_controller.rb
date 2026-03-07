module Api
  module V1
    class TherapistsController < ApplicationController
      # Skip authentication for API endpoints
      skip_before_action :authenticate_user!, only: [:feasible]
      skip_before_action :verify_authenticity_token, if: -> { request.format.json? }

      # Only respond to JSON
      # before_action :ensure_json_request, only: [:feasible]

      # GET /api/v1/therapists/feasible
      def feasible
        preparation = AdminPortal::PreparationNewAppointmentService.new(params)
        therapists = preparation.fetch_therapists

        render json: therapists
      end

      private

      def ensure_json_request
        unless request.headers["Accept"]&.include?("application/json") || request.format.json?
          render json: {error: "API only accepts JSON requests"}, status: :not_acceptable
        end
      end
    end
  end
end
