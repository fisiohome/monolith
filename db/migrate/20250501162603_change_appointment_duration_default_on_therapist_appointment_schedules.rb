class ChangeAppointmentDurationDefaultOnTherapistAppointmentSchedules < ActiveRecord::Migration[8.0]
  def up
    change_column_default :therapist_appointment_schedules,
      :max_advance_booking_in_days,
      from: 14,
      to: 60

    # update existing records:
    TherapistAppointmentSchedule
      .where(max_advance_booking_in_days: 14)
      .update_all(max_advance_booking_in_days: 60)
  end

  def down
    change_column_default :therapist_appointment_schedules,
      :max_advance_booking_in_days,
      from: 60,
      to: 14

    # rollback existing records:
    TherapistAppointmentSchedule
      .where(max_advance_booking_in_days: 60)
      .update_all(max_advance_booking_in_days: 14)
  end
end
