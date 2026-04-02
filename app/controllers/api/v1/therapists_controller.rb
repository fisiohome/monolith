module Api
  module V1
    class TherapistsController < ApplicationController
      # Skip authentication for API endpoints
      skip_before_action :authenticate_user!, only: [:feasible, :search]
      skip_before_action :verify_authenticity_token, if: -> { request.format.json? }

      # GET /api/v1/therapists/feasible
      def feasible
        preparation = AdminPortal::PreparationNewAppointmentService.new(params)
        therapists = preparation.fetch_therapists

        render json: therapists
      end

      # GET /api/v1/therapists/search
      # Unified therapist search endpoint
      # Query parameters:
      # - search_query: Search term for therapist name (optional)
      # - appointment_id: For reschedule context (optional)
      # - location_id: For new appointment context (optional)
      # - service_id: For new appointment context (optional)
      # - employment_type: Filter by employment type (optional, default: ALL)
      # - is_all_of_day: Filter for all day availability (optional, default: false)
      # - appointment_date_time: For time slot generation (optional)
      def search
        # Load appointment if appointment_id is provided, otherwise use nil
        appointment = if params[:appointment_id].present?
          Appointment.includes(:therapist).find(params[:appointment_id])
        end

        Rails.logger.info "Searching therapists with query: #{params[:search_query]}, appointment_id: #{params[:appointment_id]}"

        therapists = search_therapists_by_name(appointment)

        render json: deep_transform_keys_to_camel_case({therapists: therapists})
      rescue => e
        Rails.logger.error "Error searching therapists: #{e.message}\n#{e.backtrace.join("\n")}"
        render json: {error: e.message}, status: :internal_server_error
      end

      private

      # Unified therapist search by name method
      # Consolidated logic from both preparation services
      def search_therapists_by_name(appointment = nil)
        search_query = params[:search_query]&.strip
        employment_type = params[:employment_type] || "ALL"

        return [] if search_query.blank?

        Rails.logger.info "[TherapistSearch] Searching for: '#{search_query}', employment_type: #{employment_type}"

        # Build base query
        therapists = Therapist.includes(:user, :active_address, {active_address: :location})
          .joins(:user)
          .where("(users.suspend_at IS NULL OR users.suspend_at > NOW() OR (users.suspend_end IS NOT NULL AND users.suspend_end < NOW()))")
          .where(employment_status: "ACTIVE")

        # Apply employment type filter
        unless employment_type == "ALL"
          therapists = therapists.where(employment_type: employment_type)
        end

        # Apply gender filtering early at database level
        unless params[:preferred_therapist_gender].present? && params[:preferred_therapist_gender] == "NO PREFERENCE"
          therapists = therapists.where(gender: params[:preferred_therapist_gender])
        end

        # Apply name search filter
        therapists = therapists.where(
          "LOWER(therapists.name) LIKE ? OR LOWER(therapists.registration_number) LIKE ?",
          "%#{search_query.downcase}%",
          "%#{search_query.downcase}%"
        )

        # Limit results
        therapists = therapists.limit(100)

        Rails.logger.info "[TherapistSearch] Found #{therapists.count} therapists"

        # Format results with availability details if all of day
        therapists.map do |therapist|
          # Get availability details for all of day appointments
          if params[:is_all_of_day] == "true" &&
              (appointment&.appointment_date_time.present? || params[:appointment_date_time].present?)
            # Get basic time slots
            available_slots = therapist.basic_time_slots_for_date

            details = {
              available_slots: available_slots
            }

            format_therapist_data(therapist, appointment, details)
          else
            format_therapist_data(therapist, appointment, nil)
          end
        end
      end

      def format_therapist_data(therapist, appointment = nil, availability_details = nil)
        # Pre-construct active address for maximum performance
        active_address = if therapist.active_address
          address_data = {
            address: therapist.active_address.address,
            latitude: therapist.active_address.latitude,
            longitude: therapist.active_address.longitude
          }

          # Add location details with country code for reschedule
          if therapist.active_address.location
            location_data = {
              id: therapist.active_address.location.id,
              city: therapist.active_address.location.city,
              state: therapist.active_address.location.state,
              country: therapist.active_address.location.country,
              countryCode: therapist.active_address.location.country_code
            }

            address_data[:location] = location_data
          end

          address_data
        end

        # Pre-construct availability for maximum performance
        availability = if therapist.therapist_appointment_schedule
          {
            availabilityRules: therapist.therapist_appointment_schedule.availability_rules
          }
        end

        # Get appointments from the same series (if current appointment exists)
        appointments = if appointment&.id.present?
          if appointment&.registration_number.present?
            # Include appointments from the same series (same registration number)
            therapist.appointments.where(registration_number: appointment.registration_number)
          else
            # If no registration number, include only the current appointment
            therapist.appointments.where(id: appointment.id)
          end
        else
          [] # No appointments if no reference
        end

        # Base therapist data
        therapist_data = {
          id: therapist.id,
          name: therapist.name,
          registrationNumber: therapist.registration_number,
          employmentType: therapist.employment_type,
          employmentStatus: therapist.employment_status,
          gender: therapist.gender,
          activeAddress: active_address,
          availability: availability,
          appointments: appointments.map do |apt|
            {
              id: apt.id,
              registrationNumber: apt.registration_number,
              visitNumber: apt.visit_number,
              visitProgress: apt.visit_progress,
              totalPackageVisits: apt.total_package_visits
            }
          end,
          availabilityDetails: availability_details
        }

        deep_transform_keys_to_camel_case(therapist_data)
      end

      # Helper method to transform keys to camelCase
      def deep_transform_keys_to_camel_case(object)
        case object
        when Hash
          object.transform_keys { |key| key.to_s.camelize(:lower) }.transform_values { |value| deep_transform_keys_to_camel_case(value) }
        when Array
          object.map { |item| deep_transform_keys_to_camel_case(item) }
        else
          object
        end
      end
    end
  end
end
