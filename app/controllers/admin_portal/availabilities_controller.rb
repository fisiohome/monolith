module AdminPortal
  class AvailabilitiesController < ApplicationController
    include TherapistsHelper

    def index
      search_param = params[:search]
      selected_therapist_param = params[:therapist]

      therapists_lambda = lambda do
        therapists = Therapist
          .includes([:user])
          .where(search_param.present? ? ["name ILIKE ?", "%#{search_param}%"] : nil)
        therapists.map do |therapist|
          deep_transform_keys_to_camel_case(serialize_therapist(therapist))
        end
      end

      selected_therapist_lambda = lambda do
        return nil unless selected_therapist_param

        therapist = Therapist.includes([:user, therapist_appointment_schedule: [
          :therapist_weekly_availabilities,
          :therapist_adjusted_availabilities
        ]]).find_by(id: selected_therapist_param)

        deep_transform_keys_to_camel_case(serialize_therapist(therapist, {include_availability: true}))
      end

      day_names = Date::DAYNAMES

      render inertia: "AdminPortal/Availability/Index", props: deep_transform_keys_to_camel_case({
        therapists: InertiaRails.defer {
          therapists_lambda.call
        },
        selected_therapist: -> { selected_therapist_lambda.call },
        day_names:
      })
    end

    def upsert
      logger.info("Start the process to save the therapist appointment availability.")
      current_search_param = params[:current_query][:search]
      current_therapist_param = params[:current_query][:therapist]
      result = UpsertTherapistAppointmentScheduleService.new(params).call

      if result[:success]
        success_message = "Successfully to save the therapist appointment availability."
        logger.info(success_message)
        redirect_to admin_portal_availabilities_path(search: current_search_param, therapist: current_therapist_param), notice: success_message
      else
        error_message = result[:errors].full_messages.uniq.to_sentence

        logger.error("Failed to save therapist appointment availability with error: #{error_message}.")
        flash[:alert] = error_message
        redirect_to admin_portal_availabilities_path(search: current_search_param, therapist: current_therapist_param), inertia: {
          errors: deep_transform_keys_to_camel_case(
            result[:errors].messages.transform_values(&:uniq).merge({
              full_messages: error_message
            })
          )

        }
      end
      logger.info("The process to save the therapist appointment availability finished.")
    end
  end
end
