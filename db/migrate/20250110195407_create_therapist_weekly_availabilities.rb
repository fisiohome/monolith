class CreateTherapistWeeklyAvailabilities < ActiveRecord::Migration[8.0]
  def change
    create_table :therapist_weekly_availabilities do |t|
      t.references :therapist_appointment_schedule, null: false, foreign_key: true

      t.string :day_of_week, null: false # Referencing Date::DAYNAMES
      t.time :start_time, null: false
      t.time :end_time, null: false

      t.timestamps
    end
    add_index :therapist_weekly_availabilities, [:therapist_appointment_schedule_id, :day_of_week, :start_time, :end_time], unique: true, name: "index_therapist_weekly_availabilities_on_schedule_and_time"
  end
end
