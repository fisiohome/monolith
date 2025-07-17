class AddAvailabilityRulesToTherapistAppointmentSchedules < ActiveRecord::Migration[8.0]
  def change
    add_column :therapist_appointment_schedules, :availability_rules, :json
  end
end
