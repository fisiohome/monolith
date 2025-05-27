class AddMaxDailyAppointmentsToTherapistAppointmentSchedules < ActiveRecord::Migration[8.0]
  def change
    add_column :therapist_appointment_schedules, :max_daily_appointments, :integer, default: 4, null: false
  end
end
