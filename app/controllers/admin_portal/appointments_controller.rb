module AdminPortal
  class AppointmentsController < ApplicationController
    include AppointmentsHelper

    before_action :set_appointment, only: [:cancel, :update_pic, :update_status, :reschedule_page, :reschedule]

    def index
      preparation = PreparationIndexAppointmentService.new(params, current_user)

      render inertia: "AdminPortal/Appointment/Index", props: deep_transform_keys_to_camel_case({
        appointments: InertiaRails.defer {
          service_appt = preparation.fetch_appointments

          deep_transform_keys_to_camel_case(
            {
              data: service_appt[:data],
              metadata: pagy_metadata(service_appt[:metadata])
            }
          )
        },
        selected_appointment: InertiaRails.defer { preparation.fetch_selected_appointment },
        options_data: InertiaRails.defer { preparation.fetch_options_data },
        filter_options_data: InertiaRails.defer { preparation.fetch_filter_options_data }
      })
    end

    def new
      @appointment = params[:created] ? Appointment.find_by(id: params[:created]) || Appointment.new : Appointment.new
      if params[:reference]
        @appointment.reference_appointment = Appointment.find(params[:reference])
      end

      preparation = PreparationNewAppointmentService.new(params)

      render inertia: "AdminPortal/Appointment/New", props: deep_transform_keys_to_camel_case({
        appointment: @appointment.as_json,
        locations: InertiaRails.defer { preparation.fetch_locations },
        services: InertiaRails.defer { preparation.fetch_services },
        therapists: -> { preparation.fetch_therapists },
        patient_list: InertiaRails.optional { preparation.fetch_patient_list },
        appointment_reference: preparation.fetch_appointment_reference,
        options_data: InertiaRails.defer { preparation.fetch_options_data }
      })
    end

    def create
      result = CreateAppointmentService.new(params, current_user).call
      if result[:success]
        redirect_to new_admin_portal_appointment_path(created: result[:data].id), notice: "Appointment was successfully booked."
      else
        logger.error("Failed to booking the appointment: #{result[:error]}")
        first_error = result[:error]&.full_messages&.first
        error_messages = result[:error]&.full_messages

        logger.error("Failed to save the booking of the appointment: #{error_messages}.")
        flash[:alert] = first_error
        redirect_to new_admin_portal_appointment_path, inertia: {
          errors: deep_transform_keys_to_camel_case(
            result[:error]&.messages&.transform_values(&:uniq)&.merge({
              full_messages: error_messages
            })
          )
        }
      end
    end

    def reschedule_page
      appointment_list = serialize_appointment(@appointment, {
        include_therapist: true,
        include_patient: true,
        include_service: true,
        include_location: true,
        include_visit_address: true,
        include_package: true,
        include_admins: false,
        include_patient_medical_record: false,
        include_all_visits: true,
        all_visits_only: [:id, :visit_progress, :appointment_date_time, :status, :registration_number],
        all_visits_methods: [:visit_progress]
      })
      preparation = PreparationRescheduleAppointmentService.new(@appointment, params)

      render inertia: "AdminPortal/Appointment/Reschedule", props: deep_transform_keys_to_camel_case({
        appointment: appointment_list,
        therapists: -> { preparation.fetch_therapists },
        options_data: InertiaRails.defer { preparation.fetch_options_data }
      })
    end

    def reschedule
      result = UpdateAppointmentService.new(@appointment, params, current_user).call

      if result[:success]
        notice_msg =
          if result[:changed]
            "Appointment was successfully rescheduled."
          else
            "No changes detected."
          end

        redirect_to admin_portal_appointments_path(rescheduled: @appointment.id), notice: notice_msg
      else
        logger.error("Failed to reschedule: #{result[:error]}")
        first_error = result[:error]&.full_messages&.first
        error_message = result[:error]&.full_messages

        logger.error("Failed to reschedule the appointment: #{error_message}.")
        flash[:alert] = first_error
        redirect_to reschedule_admin_portal_appointments_path(@appointment),
          inertia: {
            errors: deep_transform_keys_to_camel_case(
              result[:error]&.messages&.transform_values(&:uniq)&.merge({
                fullMessages: error_message
              })
            )
          }
      end
    end

    def cancel
      Rails.logger.info "Starting process to cancel #{@appointment.registration_number}"

      success, message = begin
        Appointment.transaction do
          service = AppointmentStatusUpdaterService.new(@appointment, current_user)
          success = service.call(new_status: "cancelled", reason: params.dig(:form_data, :reason))

          if success
            [true, "Appointment cancelled successfully."]
          else
            [false, service.errors.first]
          end
        end
      rescue => e
        Rails.logger.error "Exception while cancelling appointment #{@appointment.registration_number}: #{e.message}"
        [false, e.message]
      ensure
        Rails.logger.info "Finished process to cancel for the appointment #{@appointment.registration_number}"
      end

      if success
        Rails.logger.info "Appointment #{@appointment.registration_number} cancelled."
        redirect_to(
          admin_portal_appointments_path(request.query_parameters.except("cancel")),
          notice: message
        )
      else
        Rails.logger.warn "Failed to cancel the appointment #{@appointment.registration_number}: #{message}"
        redirect_to(
          admin_portal_appointments_path(request.query_parameters),
          alert: message
        )
      end
    end

    def update_pic
      Rails.logger.info "Starting process to update the admin PIC(s) for appointment #{@appointment.registration_number}"

      begin
        ActiveRecord::Base.transaction do
          current_admin_ids = @appointment.admin_ids
          new_admin_ids = params.dig(:form_data, :admin_ids)

          # Remove admins not in new list
          (current_admin_ids - new_admin_ids).each do |admin_id|
            AppointmentAdmin.find_by(appointment: @appointment, admin_id: admin_id)&.destroy!
          end

          # Add new admins
          (new_admin_ids - current_admin_ids).each do |admin_id|
            AppointmentAdmin.create!(appointment: @appointment, admin_id: admin_id)
          end
        end # Transaction commits here if no exceptions

        Rails.logger.info "Appointment #{@appointment.registration_number} admin PIC(s) updated successfully."
        redirect_to admin_portal_appointments_path(request.query_parameters.except("update_pic")), notice: "Admin PIC(s) updated successfully."
      rescue => e
        Rails.logger.error "Failed to update admin PIC(s) for appointment #{@appointment.registration_number}: #{e.message}"
        redirect_to admin_portal_appointments_path(request.query_parameters), alert: "Failed to update admins PIC(s): #{e.message}"
      ensure
        Rails.logger.info "Finished process to update the admin PIC(s) for appointment #{@appointment.registration_number}"
      end
    end

    def update_status
      Rails.logger.info "Starting process to update status the appointment #{@appointment.registration_number}"

      begin
        ActiveRecord::Base.transaction do
          service = AppointmentStatusUpdaterService.new(@appointment, current_user)
          success = service.call(new_status: params.dig(:form_data, :status), reason: params.dig(:form_data, :reason))
          if success
            Rails.logger.info "Appointment #{@appointment.registration_number} status updated successfully."
            redirect_to admin_portal_appointments_path(request.query_parameters.except("update_status")), notice: "Status updated."
          else
            messages = service.errors.join(", ")
            Rails.logger.warn "Failed to update status the appointment #{@appointment.registration_number}: #{messages}"
            redirect_to admin_portal_appointments_path(request.query_parameters), alert: "Failed to update status the appointment: #{messages}"
            raise ActiveRecord::Rollback
          end
        end
      rescue => e
        Rails.logger.error "Error updating status for appointment #{@appointment.registration_number}: #{e.message}"
        redirect_to admin_portal_appointments_path(request.query_parameters), alert: "Error updating status: #{e.message}"
      ensure
        Rails.logger.info "Finished process to update status the appointment #{@appointment.registration_number}"
      end
    end

    private

    def set_appointment
      @appointment = Appointment.includes(:therapist).find(params[:id])
    end
  end
end
