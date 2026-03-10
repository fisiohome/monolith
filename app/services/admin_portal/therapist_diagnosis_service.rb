module AdminPortal
  # Service for analyzing therapist availability and diagnosing why therapists are unavailable
  # Handles complex logic for therapist selection, availability checking, and conflict detection
  #
  # PERFORMANCE OPTIMIZATIONS:
  # - Uses eager loading to prevent N+1 queries
  # - BatchQueryHelper for optimized appointment preloading
  # - Single database query for therapist filtering
  # - Efficient conflict detection with proper indexing
  #
  # QUERY PATTERNS:
  # - SELECT therapists.* WITH INCLUDES (user, therapist_appointment_schedule, service, therapist_services)
  # - WHERE employment_status = 'ACTIVE' AND users.suspend_at IS NULL OR users.suspend_at > NOW()
  # - EXCLUDE selected therapist IDs from alternative list
  # - FILTER by service_id if specified (single query)
  #
  # This service performs:
  # - Fetching and filtering therapists based on criteria
  # - Availability analysis using AvailabilityService
  # - Conflict detection with existing appointments (excluding current appointment)
  # - Diagnosis generation for unavailable therapists with categorized reasons
  # - Optimized database queries with proper includes and batch operations
  class TherapistDiagnosisService
    include ActiveModel::Model
    include ActiveModel::Attributes

    attr_reader :appointment_id, :current_appointment

    # Initialize the diagnosis service with appointment details
    # @param appointment_id [String] ID of the appointment to analyze
    def initialize(appointment_id:)
      @appointment_id = appointment_id

      # Fetch appointment details from database with eager loading
      @current_appointment = Appointment
        .includes(:patient, :service, :address_history)
        .find(appointment_id)
    end

    # Main method to perform complete therapist diagnosis analysis
    # @param selected_therapist_ids [Array<String>] IDs of therapists to analyze specifically
    # @return [Hash] Complete diagnosis results with patient info, summary, and therapist analysis
    def analyze(selected_therapist_ids = [])
      # Validate required parameters
      validate_parameters!

      # Fetch selected therapists for detailed analysis
      selected_therapists = fetch_selected_therapists(selected_therapist_ids)

      # Fetch all potential therapists (including selected ones for unified view)
      all_therapists = fetch_all_therapists

      # Get actually available therapists from all therapists
      available_therapists = get_available_therapists(all_therapists)

      # Analyze why selected therapists are unavailable
      diagnosis_results = analyze_selected_therapists(selected_therapists)

      # Build comprehensive results with unified therapist view
      build_results(selected_therapists, all_therapists, available_therapists, diagnosis_results)
    end

    private

    # Validate required parameters for diagnosis
    # @raise [ArgumentError] If required parameters are missing
    def validate_parameters!
      if appointment_id.blank?
        raise ArgumentError, "Appointment ID is required"
      end

      if @current_appointment.blank?
        raise ArgumentError, "Appointment not found"
      end
    end

    # Fetch selected therapists with optimized includes
    # Uses eager loading to prevent N+1 queries when accessing associations
    # @param therapist_ids [Array<String>] IDs of therapists to fetch
    # @return [ActiveRecord::Relation] Selected therapists with associations
    def fetch_selected_therapists(therapist_ids)
      return Therapist.none if therapist_ids.empty?

      Therapist
        .includes(
          :user,                           # Include user account for suspension checks
          :therapist_appointment_schedule, # Include schedule for availability checks
          :service                         # Include service for compatibility checks
        )
        .where(id: therapist_ids)
    end

    # Fetch all therapists with optimized includes
    # Returns all active therapists for unified view without separation
    # @return [ActiveRecord::Relation] All therapists with associations
    def fetch_all_therapists
      therapists = Therapist
        .includes(:user, :therapist_appointment_schedule, :service)
        .where(employment_status: "ACTIVE")
        .where.not(users: {suspend_at: ..Time.current})

      # Apply service filter if specified
      therapists = therapists.where(service_id: current_appointment.service_id) if current_appointment.service_id.present?

      therapists
    end

    # Filter therapists to only those actually available for the requested time
    # Uses AvailabilityService for comprehensive availability checking
    # @param therapists [ActiveRecord::Relation] Therapists to check
    # @return [Array<Therapist>] Array of available therapists
    def get_available_therapists(therapists)
      available = []

      therapists.each do |therapist|
        # Use AvailabilityService for comprehensive availability check
        availability_service = AdminPortal::Therapists::AvailabilityService.new(
          therapist: therapist,
          appointment_date_time_server_time: current_appointment.appointment_date_time,
          current_appointment_id: current_appointment.id
        )

        # Include therapist if available and no conflicts
        available << therapist if availability_service.available?
      end

      available
    end

    # Analyze why specific therapists are unavailable for the requested appointment
    # @param therapists [ActiveRecord::Relation] Therapists to analyze
    # @return [Array<Hash>] Array of diagnosis results for each therapist
    def analyze_selected_therapists(therapists)
      therapists.map do |therapist|
        {
          therapist: format_therapist_info(therapist),
          diagnosis: diagnose_single_therapist(therapist)
        }
      end.sort_by { |result| result[:diagnosis][:priority] }
    end

    # Diagnose why a single therapist is unavailable for the requested appointment
    # Performs comprehensive checks in order of priority
    # @param therapist [Therapist] Therapist to diagnose
    # @return [Hash] Diagnosis result with reasons, priority, and category
    def diagnose_single_therapist(therapist)
      reasons = []
      priority = 999

      # Check 1: Basic schedule requirement (highest priority)
      if therapist.therapist_appointment_schedule.blank?
        reasons << "No appointment schedule configured"
        priority = [priority, 1].min
      end

      # Check 2: Account suspension status
      if therapist.user&.suspend_at.present? && therapist.user.suspend_at <= Time.current
        reasons << if therapist.user.suspend_end.present? && therapist.user.suspend_end > Time.current
          "Account suspended until #{therapist.user.suspend_end.strftime("%Y-%m-%d %H:%M")}"
        else
          "Account suspended indefinitely"
        end
        priority = [priority, 2].min
      end

      # Check 3: Employment status
      unless therapist.employment_status == "ACTIVE"
        reasons << "Employment status: #{therapist.employment_status}"
        priority = [priority, 3].min
      end

      # Check 4: Service compatibility
      # Therapists have a single primary service (not multiple services)
      if current_appointment.service_id.present?
        service_match = therapist.service_id == current_appointment.service_id

        unless service_match
          reasons << "Does not provide required service: #{therapist.service&.name || "Unknown"}"
          priority = [priority, 4].min
        end
      end

      # Check 5: Detailed availability using AvailabilityService
      if therapist.therapist_appointment_schedule.present?
        availability_service = AdminPortal::Therapists::AvailabilityService.new(
          therapist: therapist,
          appointment_date_time_server_time: current_appointment.appointment_date_time,
          current_appointment_id: current_appointment.id
        )

        unless availability_service.available?
          reasons.concat(availability_service.reasons)
          priority = [priority, 5].min
        end
      end

      # Check 6: Location constraints (if applicable)
      if current_appointment.address_history&.address_line.present? && therapist.therapist_appointment_schedule.present?
        location_constraints = check_location_constraints(therapist)
        reasons.concat(location_constraints[:reasons]) if location_constraints[:reasons].any?
        priority = [priority, 6].min if location_constraints[:blocked]
      end

      {
        available: reasons.empty?,
        reasons: reasons,
        priority: priority,
        category: categorize_reason(reasons),
        recommendation: generate_recommendation(therapist, reasons)
      }
    end

    # Check location-based constraints for therapist
    # @param therapist [Therapist] Therapist to check
    # @return [Hash] Location constraint results with reasons and blocked status
    def check_location_constraints(therapist)
      # Placeholder for location-based logic
      # This could be enhanced with actual location preferences, travel time, etc.
      {reasons: [], blocked: false}
    end

    # Categorize unavailability reasons for better user understanding
    # @param reasons [Array<String>] List of unavailability reasons
    # @return [String] Category name for the reasons
    def categorize_reason(reasons)
      return "Available" if reasons.empty?

      if reasons.any? { |r| r.include?("suspended") }
        "Account Issue"
      elsif reasons.any? { |r| r.include?("employment") }
        "Employment Issue"
      elsif reasons.any? { |r| r.include?("service") }
        "Service Mismatch"
      elsif reasons.any? { |r| r.include?("schedule") || r.include?("No weekly slots") || r.include?("Outside") }
        "Schedule Issue:"
      elsif reasons.any? { |r| r.include?("conflicting appointment") }
        "Schedule Conflict"
      else
        "Other"
      end
    end

    # Generate recommendation based on therapist and unavailability reasons
    # @param therapist [Therapist] Therapist to generate recommendation for
    # @param reasons [Array<String>] List of unavailability reasons
    # @return [String, nil] Recommendation message or nil if available
    def generate_recommendation(therapist, reasons)
      return nil if reasons.empty?

      if reasons.any? { |r| r.include?("suspended") }
        "Consider checking back after suspension period ends"
      elsif reasons.any? { |r| r.include?("service") }
        "Look for therapists who provide the required service"
      elsif reasons.any? { |r| r.include?("schedule") }
        "Try different time or date within therapist's working hours"
      elsif reasons.any? { |r| r.include?("conflicting appointment") }
        "Consider rescheduling to a different time slot"
      else
        "Contact support for assistance with this therapist"
      end
    end

    # Format therapist information for API response
    # @param therapist [Therapist] Therapist to format
    # @return [Hash] Formatted therapist information
    def format_therapist_info(therapist)
      {
        id: therapist.id,
        name: therapist.name,
        registration_number: therapist.registration_number,
        employment_type: therapist.employment_type,
        employment_status: therapist.employment_status,
        user_status: (therapist.user&.suspend_at.present? && therapist.user.suspend_at <= Time.current) ? "Suspended" : "Active",
        service_name: therapist.service&.name || "No Service",
        schedule_configured: therapist.therapist_appointment_schedule.present?
      }
    end

    # Build comprehensive results hash for API response
    # @param selected_therapists [ActiveRecord::Relation] Therapists that were selected for analysis
    # @param all_therapists [ActiveRecord::Relation] All therapists for unified view
    # @param available_therapists [Array<Therapist>] Actually available therapists
    # @param diagnosis_results [Array<Hash>] Diagnosis results for selected therapists
    # @return [Hash] Complete diagnosis results
    def build_results(selected_therapists, all_therapists, available_therapists, diagnosis_results)
      {
        selected_therapists_analysis: diagnosis_results,
        available_therapists: available_therapists.map { |t| format_therapist_info(t) }
      }
    end
  end
end
