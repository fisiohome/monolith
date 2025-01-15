class CreateTherapistAppointmentSchedules < ActiveRecord::Migration[8.0]
  def change
    create_table :therapist_appointment_schedules do |t|
      t.references :therapist, type: :uuid, null: false, foreign_key: true

      # Basic appointment settings
      t.integer :appointment_duration_in_minutes, null: false, default: 90
      t.integer :buffer_time_in_minutes, null: false, default: 30
      t.string :time_zone, null: false, default: "Asia/Jakarta"

      # Scheduling window
      # "available now" mean no date limit for the scheduling window.
      t.boolean :available_now, null: false, default: true
      t.date :start_date_window
      t.date :end_date_window

      # How far in advance (max)
      t.integer :max_advance_booking_in_days, null: false, default: 14

      # How soon (min) before the appointment start
      t.integer :min_booking_before_in_hours, null: false, default: 24

      t.timestamps
    end
  end
end
