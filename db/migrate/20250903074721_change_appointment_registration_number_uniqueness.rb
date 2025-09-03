class ChangeAppointmentRegistrationNumberUniqueness < ActiveRecord::Migration[8.0]
  def change
    # First, remove the old unique index on just registration_number
    # Using if_exists to prevent errors if the index was already removed.
    remove_index :appointments, :registration_number, if_exists: true

    # Then, add a new unique index on the combination of registration_number and visit_number
    add_index :appointments, [:registration_number, :visit_number], unique: true
  end
end
