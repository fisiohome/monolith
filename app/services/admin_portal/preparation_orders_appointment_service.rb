module AdminPortal
  class PreparationOrdersAppointmentService
    include Pagy::Backend
    include ApplicationHelper

    def initialize(params)
      @params = params
      @selected_id = @params[:view_order]
    end

    def fetch_orders
      page_params = @params.fetch(:page, 1).to_i
      limit_params = @params.fetch(:limit, 10).to_i

      filtered = filtered_orders_relation

      metadata, paginated_orders = pagy(filtered, page: page_params, limit: limit_params)

      data = paginated_orders.map { |order| serialize_order(order) }

      {data:, metadata:}
    end

    def fetch_selected_order
      return nil if @selected_id.blank?

      order = Order
        .includes(:patient, :package, appointments: [:therapist, :patient, :service, :package, :location])
        .find_by(id: @selected_id)

      return nil unless order

      deep_transform_keys_to_camel_case(serialize_order_detail(order))
    end

    private

    def filtered_orders_relation
      orders = Order
        .includes(:patient, package: :service)
        .order(created_at: :desc)

      # Search by string (registration number, invoice number, patient name, voucher code)
      if @params[:search].present?
        # `orders` already includes `patient`
        orders = orders.left_joins(:patient).where(
          "orders.registration_number ILIKE :q OR " \
          "orders.invoice_number ILIKE :q OR " \
          "orders.voucher_code ILIKE :q OR " \
          "patients.name ILIKE :q",
          q: "%#{@params[:search]}%"
        )
      end

      # Filter by payment status
      if @params[:payment_status].present?
        orders = orders.where(payment_status: @params[:payment_status])
      end

      # Filter by order status
      if @params[:status].present?
        orders = orders.where(status: @params[:status])
      end

      orders
    end

    def serialize_order(order)
      {
        id: order.id,
        registration_number: order.registration_number,
        patient_name: order.patient&.name,
        package_name: order.package&.name,
        service_name: order.package&.service&.name,
        number_of_visit: order.package&.number_of_visit,
        total_amount: order.total_amount&.to_f,
        paid_amount: order.paid_amount&.to_f,
        remaining_amount: order.remaining_amount&.to_f,
        payment_status: order.payment_status,
        status: order.status,
        invoice_number: order.invoice_number,
        invoice_url: order.invoice_url,
        created_at: order.created_at&.iso8601
      }
    end

    def serialize_order_detail(order)
      {
        id: order.id,
        registration_number: order.registration_number,
        booking_draft_id: order.booking_draft_id,
        patient_id: order.patient_id,
        package_id: order.package_id,
        package_base_price: order.package_base_price&.to_f,
        subtotal: order.subtotal&.to_f,
        discount_type: order.discount_type,
        discount_value: order.discount_value&.to_f,
        discount_amount: order.discount_amount&.to_f,
        voucher_code: order.voucher_code,
        tax_percentage: order.tax_percentage&.to_f,
        tax_amount: order.tax_amount&.to_f,
        total_amount: order.total_amount&.to_f,
        paid_amount: order.paid_amount&.to_f,
        remaining_amount: order.remaining_amount&.to_f,
        payment_status: order.payment_status,
        invoice_number: order.invoice_number,
        invoice_url: order.invoice_url,
        invoice_due_date: order.invoice_due_date&.iso8601,
        status: order.status,
        special_notes: order.special_notes,
        cancellation_reason: order.cancellation_reason,
        cancelled_at: order.cancelled_at&.iso8601,
        cancelled_by: order.cancelled_by,
        completed_at: order.completed_at&.iso8601,
        created_at: order.created_at&.iso8601,
        updated_at: order.updated_at&.iso8601,
        patient: order.patient ? {
          id: order.patient.id,
          name: order.patient.name,
          gender: order.patient.gender,
          date_of_birth: order.patient.date_of_birth&.iso8601
        } : nil,
        package: order.package ? {
          id: order.package.id,
          name: order.package.name,
          number_of_visit: order.package.number_of_visit,
          total_price: order.package.total_price&.to_f,
          currency: order.package.currency
        } : nil,
        appointments: order.appointments.map { |appt|
          {
            id: appt.id,
            registration_number: appt.registration_number,
            visit_number: appt.visit_number,
            status: appt.status,
            appointment_date_time: appt.appointment_date_time&.iso8601,
            therapist_name: appt.therapist&.name,
            service_name: appt.service&.name,
            location_city: appt.location&.city
          }
        }
      }
    end
  end
end
