module AdminPortal
  class AvailabilitiesController < ApplicationController
    include TherapistsHelper

    def index
      selected_therapist_params = params[:therapist]

      therapists_lambda = lambda do
        therapists = Therapist.joins(:user)
        therapists.map do |therapist|
          deep_transform_keys_to_camel_case(serialize_therapist(therapist))
        end
      end

      day_names = Date::DAYNAMES

      render inertia: "AdminPortal/Availability/Index", props: deep_transform_keys_to_camel_case({
        therapists: InertiaRails.defer {
          therapists_lambda.call
        },
        selected_therapist: -> { selected_therapist_params },
        day_names:
      })
    end
  end
end
