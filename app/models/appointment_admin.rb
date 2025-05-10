class AppointmentAdmin < ApplicationRecord
  # * define the associations
  belongs_to :admin
  belongs_to :appointment

  # * cycle callbacks
  after_commit :sync_series_admins

  private

  # * define the callback methods
  def sync_series_admins
    # Prevents infinite loops using thread-local storage
    return if Thread.current[:suppress_series_sync]

    current_appointment = appointment.reload
    latest_admin_ids = current_appointment.admin_ids

    # Determine target appointments to update (excluding current appointment)
    target_appointments = if current_appointment.initial_visit?
      current_appointment.series_appointments
    else
      root = current_appointment.reference_appointment
      [root] + root.series_appointments.where.not(id: current_appointment.id)
    end

    target_appointment_ids = target_appointments.pluck(:id)
    return if target_appointment_ids.empty?

    AppointmentAdmin.suppress_series_sync do
      Appointment.transaction do
        # Bulk delete existing associations
        AppointmentAdmin.where(appointment_id: target_appointment_ids).delete_all

        # Bulk insert new associations
        new_records = target_appointment_ids.flat_map do |appt_id|
          latest_admin_ids.map { |admin_id| {appointment_id: appt_id, admin_id: admin_id} }
        end

        AppointmentAdmin.insert_all(new_records) if new_records.any?
      end
    end
  end

  def self.suppress_series_sync # standard:disable Lint/IneffectiveAccessModifier
    original_value = Thread.current[:suppress_series_sync]
    Thread.current[:suppress_series_sync] = true
    yield
  ensure
    Thread.current[:suppress_series_sync] = original_value
  end
end
