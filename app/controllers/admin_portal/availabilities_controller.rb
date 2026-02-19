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
          .where(employment_status: "ACTIVE")
        therapists.map do |therapist|
          deep_transform_keys_to_camel_case(
            serialize_therapist(
              therapist,
              {
                only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender]
              }
            )
          )
        end
      end

      selected_therapist_lambda = lambda do
        return nil unless selected_therapist_param

        therapist = Therapist.includes([:user, therapist_appointment_schedule: [
          :therapist_weekly_availabilities,
          :therapist_adjusted_availabilities
        ]]).find_by(id: selected_therapist_param)

        deep_transform_keys_to_camel_case(
          serialize_therapist(
            therapist,
            {
              only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender],
              include_availability: true
            }
          )
        )
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

    # ? we don't need this sync schedule because it's already included in therapists_and_schedules in therapists page
    # def sync_data_master
    #   MasterDataSyncJob.perform_later(:therapist_schedules, current_user&.id)
    #   redirect_to admin_portal_availabilities_path, notice: "Schedule sync is running in the background. You'll be notified when it's complete."
    # end

    # ? we don't need this sync schedule because it's already included in therapists_and_schedules in therapists page
    # def sync_status
    #   render_sync_status(:therapist_schedules)
    # end

    def sync_leaves
      MasterDataSyncJob.perform_later(:therapist_leaves, current_user&.id)
      redirect_to admin_portal_availabilities_path, notice: "Leave sync is running in the background. You'll be notified when it's complete."
    end

    def sync_leaves_status
      render_sync_status(:therapist_leaves)
    end

    private

    def render_sync_status(sync_type)
      unless current_user
        render json: {status: :error, error: "Authentication required"}, status: :unauthorized
        return
      end

      status = SyncStatusService.get_latest_sync_status(sync_type)

      if status
        SyncStatusService.clear_sync_status(sync_type)

        render json: {
          status: status[:status],
          completed_at: status[:completed_at],
          message: status[:result][:success] ? status[:result][:message] : status[:result][:error],
          results: status[:result][:results]
        }
      else
        pending_jobs = SolidQueue::Job.where(class_name: "MasterDataSyncJob")
          .where(finished_at: nil)
          .count

        running_jobs = SolidQueue::ClaimedExecution.joins(:job)
          .where(solid_queue_jobs: {class_name: "MasterDataSyncJob"})
          .count

        if pending_jobs > 0 || running_jobs > 0
          render json: {status: :running, message: "Sync is in progress..."}
        else
          render json: {status: :not_found}
        end
      end
    rescue => e
      Rails.logger.error "Error in sync_status: #{e.class} - #{e.message}"
      render json: {status: :error, error: "Failed to check sync status"}, status: :internal_server_error
    end
  end
end
