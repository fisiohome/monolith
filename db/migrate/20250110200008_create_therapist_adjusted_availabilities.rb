class CreateTherapistAdjustedAvailabilities < ActiveRecord::Migration[8.0]
  def change
    create_table :therapist_adjusted_availabilities do |t|
      t.references :therapist_appointment_schedule, null: false, foreign_key: true

      t.date :specific_date, null: false

      # If both are nil it mean "not available" (on specific date).
      t.time :start_time
      t.time :end_time

      t.string :reason

      t.timestamps
    end

    add_index :therapist_adjusted_availabilities, [:therapist_appointment_schedule_id, :specific_date, :start_time, :end_time], unique: true, name: "index_therapist_adjusted_availabilities_on_schedule_and_time"
  end
end
