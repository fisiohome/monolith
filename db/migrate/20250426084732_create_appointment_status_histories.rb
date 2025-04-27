class CreateAppointmentStatusHistories < ActiveRecord::Migration[8.0]
  def change
    create_table :appointment_status_histories do |t|
      t.references :appointment, type: :uuid, null: false, foreign_key: true
      t.string :old_status
      t.string :new_status, null: false
      t.text :reason
      t.uuid :changed_by, null: false

      t.timestamps
    end

    add_index :appointment_status_histories, :changed_by
  end
end
