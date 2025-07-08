module AdminPortal
  class ExportAppointmentService
    attr_reader :from_date_param, :to_date_param, :current_date

    def initialize(from_date_param:, to_date_param:)
      @from_date_param = from_date_param
      @to_date_param = to_date_param
      @report_from_formatted = nil
      @report_to_formatted = nil
      @current_date = Date.current
    end

    def call
      return {success: false, error: "Invalid date range parameters"} unless valid_date_range?

      appointments = fetch_appointments
      csv_data = generate_csv(appointments)

      {
        success: true,
        data: csv_data,
        filename: generate_filename,
        count: appointments.count
      }
    end

    private

    def valid_date_range?
      return false if @from_date_param.blank? || @to_date_param.blank?

      from = begin
        @report_from_formatted = Date.parse(@from_date_param)
      rescue ArgumentError
        nil
      end

      to = begin
        @report_to_formatted = Date.parse(@to_date_param)
      rescue ArgumentError
        nil
      end

      from && to && from <= to
    end

    def fetch_appointments
      created_at = @report_from_formatted.beginning_of_day..@report_to_formatted.end_of_day

      Appointment.includes(
        :therapist, :patient, :service, :package, :location, :admins
      ).where(created_at:).order(:created_at)
    end

    def generate_csv(appointments)
      CSV.generate(headers: true) do |csv|
        # Add headers
        csv << csv_headers

        # Add data rows
        appointments.each do |appointment|
          csv << build_appointment_row(appointment)
        end
      end
    end

    def csv_headers
      [
        "Date",
        "Registration Number",
        "Patient Name",
        "Patient Contact",
        "Total Visits",
        "Service",
        "Package",
        "Visit Number",
        "Appointment Date",
        "Appointment Time",
        "Therapist Name",
        "Therapist ID",
        "Therapist Contact",
        "Therapist Type",
        "Admin PICs",
        "Status",
        "Paid at",
        "Visit Location",
        "Visit Address"
      ]
    end

    def build_appointment_row(appt)
      service = appt.service
      package = appt.package

      # Get patient info
      patient = appt.patient
      patient_contact = patient.patient_contact
      contact_name = patient_contact&.contact_name
      contact_phone = patient_contact&.contact_phone
      contact_formatted = "#{contact_name} (+#{contact_phone})"

      # Get therapist info
      therapist = appt.therapist
      therapist_phone = therapist.phone_number
      therapist_phone_formatted = "(#{therapist_phone})"

      # Get visit address and location
      visit_location = "#{appt&.location&.city}, #{appt&.location&.state}, #{appt&.location&.country}"
      visit_address = appt&.address_history&.address_line

      # Get admin PICs
      admin_pics = appt&.admins&.map(&:name)&.join(", ") || nil

      # Get the paid at
      paid_at = appt&.status_histories&.where(new_status: "PAID")&.order(:created_at)&.limit(1)&.pick(:created_at) || nil
      formatted_paid_at = paid_at&.strftime("%d %b %Y, %H:%M")

      [
        appt.created_at&.strftime("%d %b %Y"),
        appt.registration_number,
        patient.name,
        contact_formatted,
        package.number_of_visit,
        service.name,
        package.name,
        appt.visit_number,
        appt.appointment_date_time&.strftime("%d %b %Y"),
        appt.appointment_date_time&.strftime("%H:%M"),
        therapist.name,
        therapist.registration_number,
        therapist_phone_formatted,
        therapist.employment_type,
        admin_pics,
        appt.status&.humanize&.upcase,
        formatted_paid_at,
        visit_location,
        visit_address
      ]
    end

    def generate_filename
      date_suffix = "#{@report_from_formatted.strftime("%Y%m%d")}_to_#{@report_to_formatted.strftime("%Y%m%d")}"
      "appointments_reports_#{date_suffix}_#{Time.current.strftime("%Y%m%d_%H%M%S")}.csv"
    end
  end
end
