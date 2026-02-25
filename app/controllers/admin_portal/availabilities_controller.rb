module AdminPortal
  class AvailabilitiesController < ApplicationController
    include TherapistsHelper

    def index
      # Extract query parameters
      search_param = params[:search]
      selected_therapist_param = params[:therapist]
      page = params[:page] || 1
      limit = params[:limit] || 20

      # Fetch paginated therapists list (deferred for faster initial page load)
      therapists_lambda = lambda do
        # Build a versioned cache key based on search, page, limit, and the latest therapist update timestamp.
        # This ensures the cache auto-invalidates whenever any active therapist record changes.
        cache_key = "availability_therapists/#{search_param}/page_#{page}/limit_#{limit}/#{Therapist.where(employment_status: "ACTIVE").maximum(:updated_at).to_i}"

        Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
          # Build the query scope: only active therapists, optionally filtered by name or registration number (ILIKE)
          therapists_scope = Therapist
            .includes([:user])
            .where(employment_status: "ACTIVE")
            .then do |scope|
              if search_param.present?
                name_match = Therapist.arel_table[:name].matches("%#{search_param}%")
                reg_match = Therapist.arel_table[:registration_number].matches("%#{search_param}%")
                scope.where(name_match.or(reg_match))
              else
                scope
              end
            end
            .order(:name)

          # Paginate the results
          pagy, paged_therapists = pagy(therapists_scope, page:, limit:)

          # Return paginated data with Pagy metadata for frontend infinite scroll
          {
            data: paged_therapists.map do |therapist|
              deep_transform_keys_to_camel_case(
                serialize_therapist(
                  therapist,
                  {
                    only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender]
                  }
                )
              )
            end,
            metadata: pagy_metadata(pagy)
          }
        end
      end

      # Fetch the selected therapist with full availability data (weekly + adjusted)
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

      # Render the Inertia page
      # - therapists: deferred (loaded asynchronously after initial paint)
      # - selected_therapist: lazy-evaluated (only computed when accessed by frontend)
      # - day_names: static data for the schedule form
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
    #     def sync_data_master
    #       # # Clear any existing sync status before starting a new one
    #       SyncStatusService.clear_sync_status(:therapist_schedules)
    #
    #       MasterDataSyncJob.perform_later(:therapist_schedules, current_user&.id)
    #       redirect_to admin_portal_availabilities_path, notice: "Schedule sync is running in the background. You'll be notified when it's complete."
    #     end

    # ? we don't need this sync schedule because it's already included in therapists_and_schedules in therapists page
    # def sync_status
    #   render_sync_status(:therapist_schedules)
    # end

    def sync_leaves
      # Clear any existing sync status before starting a new one
      SyncStatusService.clear_sync_status(:therapist_leaves)

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
        # Don't clear the status immediately - let it expire naturally (24 hours)
        # This prevents the frontend from getting stuck in a polling loop
        # The status will be cleared on the next sync operation

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
