module Api
  module V1
    class TherapistsController < ApplicationController
      # GET /api/v1/therapists/feasible
      def feasible
        preparation = AdminPortal::PreparationNewAppointmentService.new(params)
        therapists = preparation.fetch_therapists

        render json: therapists
      end
    end
  end
end
