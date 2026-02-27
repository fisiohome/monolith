require "axlsx"

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
      xlsx_data = generate_xlsx(appointments)

      {
        success: true,
        data: xlsx_data,
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

    def generate_xlsx(appointments)
      package = Axlsx::Package.new
      workbook = package.workbook

      # Add worksheet with styling
      workbook.add_worksheet(name: "Appointments") do |sheet|
        # Define header styles
        header_style = sheet.styles.add_style(
          b: true,
          bg_color: "4F81BD",
          fg_color: "FFFFFF",
          alignment: {horizontal: :center, vertical: :center},
          border: {style: :thin, color: "000000"}
        )

        # Define data styles
        date_style = sheet.styles.add_style(
          format_code: "dd mmm yyyy",
          alignment: {horizontal: :center}
        )
        time_style = sheet.styles.add_style(
          format_code: "hh:mm",
          alignment: {horizontal: :center}
        )
        datetime_style = sheet.styles.add_style(
          format_code: "dd mmm yyyy hh:mm",
          alignment: {horizontal: :center}
        )
        center_style = sheet.styles.add_style(
          alignment: {horizontal: :center}
        )

        # Add headers
        sheet.add_row(csv_headers, style: header_style)

        # Add data rows
        appointments.each_with_index do |appointment, index|
          row_data = build_appointment_row(appointment)

          # Apply appropriate styles to each cell
          styles = Array.new(row_data.length)
          styles[0] = date_style  # Date
          styles[9] = date_style  # Appointment Date
          styles[10] = time_style # Appointment Time
          styles[15] = datetime_style if row_data[15] # Paid at
          styles[4] = center_style # Total Visits
          styles[8] = center_style # Visit Number

          sheet.add_row(row_data, style: styles)
        end

        # Auto-fit column widths
        sheet.column_widths(*Array.new(csv_headers.length, 15))
      end

      # Return the XLSX data as a string
      package.to_stream.read
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
      patient = appt&.patient
      patient_contact = patient&.patient_contact
      contact_name = patient_contact&.contact_name
      contact_phone = patient_contact&.contact_phone
      contact_formatted = "#{contact_name} (+#{contact_phone})"

      # Get therapist info
      therapist = appt&.therapist
      therapist_phone_formatted = therapist&.phone_number ? "(#{therapist&.phone_number})" : nil

      # Get visit address and location
      visit_location = "#{appt&.location&.city}, #{appt&.location&.state}, #{appt&.location&.country}"
      visit_address = appt&.address_history&.address_line

      # Get admin PICs
      admin_pics = appt&.admins&.map(&:name)&.join(", ") || nil

      # Get the paid at
      paid_at = appt&.status_histories&.where(new_status: "PAID")&.order(:created_at)&.limit(1)&.pick(:created_at) || nil
      formatted_paid_at = paid_at&.strftime("%d %b %Y, %H:%M")

      [
        appt&.created_at&.strftime("%d %b %Y"),
        appt&.registration_number,
        patient&.name,
        contact_formatted,
        package&.number_of_visit,
        service&.name,
        package&.name,
        appt&.visit_number,
        appt&.appointment_date_time&.strftime("%d %b %Y"),
        appt&.appointment_date_time&.strftime("%H:%M"),
        therapist&.name,
        therapist&.registration_number,
        therapist_phone_formatted,
        therapist&.employment_type,
        admin_pics,
        appt&.status&.humanize&.upcase,
        formatted_paid_at,
        visit_location,
        visit_address
      ]
    end

    def generate_filename
      date_suffix = "#{@report_from_formatted.strftime("%Y%m%d")}_to_#{@report_to_formatted.strftime("%Y%m%d")}"
      "appointments_reports_#{date_suffix}_#{Time.current.strftime("%Y%m%d_%H%M%S")}.xlsx"
    end
  end
end
