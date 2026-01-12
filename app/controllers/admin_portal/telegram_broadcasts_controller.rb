module AdminPortal
  class TelegramBroadcastsController < ApplicationController
    before_action :ensure_admin!
    before_action :ensure_telegram_broadcast_enabled!

    def index
      render inertia: "AdminPortal/TelegramBroadcast/Index", props: deep_transform_keys_to_camel_case({
        groups: InertiaRails.defer { telegram_groups },
        optionsData: InertiaRails.defer {
          {
            patientConditions: Appointment::PATIENT_CONDITION.map { |condition|
              deep_transform_keys_to_camel_case(condition.to_h)
            },
            patientGenders: Patient::GENDER_LABELS.map { |gender|
              deep_transform_keys_to_camel_case(gender.to_h)
            },
            preferredTherapistGender: Appointment::PREFERRED_THERAPIST_GENDER_LABELS.map { |gender|
              deep_transform_keys_to_camel_case(gender.to_h)
            }
          }
        }
      })
    end

    def create
      broadcast_params = params.require(:broadcast).permit(
        :chat_id, :kode_pasien, :gender_req, :usia, :jenis_kelamin,
        :keluhan, :durasi, :kondisi, :riwayat, :alamat, :visit, :jadwal
      )

      # Convert usia to integer if it's a string
      broadcast_params[:usia] = broadcast_params[:usia].to_i if broadcast_params[:usia].is_a?(String)

      # Use TelegramService to send the broadcast
      service = AdminPortal::TelegramService.new
      response = service.broadcast_message(
        group_id: broadcast_params[:chat_id],
        message: broadcast_params,
        mentions: []  # Can be extended later to include mentions if needed
      )

      if response[:success]
        redirect_to admin_portal_telegram_broadcasts_path, notice: "Broadcast sent successfully!"
      else
        error_message = response[:errors]&.first || "Failed to send broadcast"
        redirect_to admin_portal_telegram_broadcasts_path, alert: "Error: #{error_message}"
      end
    rescue => e
      Rails.logger.error("Telegram broadcast error: #{e.message}")
      redirect_to admin_portal_telegram_broadcasts_path, alert: "Failed to send broadcast. Please try again."
    end

    private

    def broadcasts_list
      # This would fetch from external API or local cache if needed
      # For now, return empty array as we're not storing broadcasts locally
      []
    end

    def telegram_groups
      # Use TelegramService to fetch groups
      service = AdminPortal::TelegramService.new
      service.fetch_groups
    end

    def ensure_admin!
      return if current_user&.admin.present?

      redirect_to authenticated_root_path, alert: "You do not have access to this resource."
    end

    def ensure_telegram_broadcast_enabled!
      @telegram_broadcast_enabled ||= FeatureFlagChecker.enabled?(FeatureFlagChecker::TELEGRAM_BROADCASTS_KEY)

      return if @telegram_broadcast_enabled

      redirect_to authenticated_root_path, alert: "Telegram broadcasts are currently disabled."
    end
  end
end
