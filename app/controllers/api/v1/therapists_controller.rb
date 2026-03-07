module Api
  module V1
    class TherapistsController < ApplicationController
      # Skip authentication for API endpoints
      skip_before_action :authenticate_user!, only: [:feasible]
      skip_before_action :verify_authenticity_token, if: -> { request.format.json? }

      # GET /api/v1/therapists/feasible
      def feasible
        preparation = AdminPortal::PreparationNewAppointmentService.new(params)
        therapists = preparation.fetch_therapists

        render json: therapists
      end

      private
    end
  end
end
