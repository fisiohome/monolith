class AddPerformanceIndexesForTherapistSearch < ActiveRecord::Migration[8.0]
  def change
    # Index for therapist employment status and type filtering
    add_index :therapists, [:employment_status, :employment_type] unless index_exists?(:therapists, [:employment_status, :employment_type])

    # Index for therapist address location filtering (skip if already exists)
    # This index already exists with unique: true, so we don't need to add it again
    # add_index :therapist_addresses, [:therapist_id, :active], where: "active = true"

    # Index for address coordinates filtering
    add_index :addresses, [:latitude, :longitude], where: "latitude <> 0 AND longitude <> 0" unless index_exists?(:addresses, [:latitude, :longitude])

    # Index for appointment date/time lookups
    add_index :appointments, [:therapist_id, :appointment_date_time, :status] unless index_exists?(:appointments, [:therapist_id, :appointment_date_time, :status])

    # GIN index for JSONB availability_rules queries
    # Skip for JSON type as it doesn't support GIN index directly
    # Consider changing column to JSONB in a separate migration if needed
    # add_index :therapist_appointment_schedules, :availability_rules, using: :gin unless index_exists?(:therapist_appointment_schedules, :availability_rules)

    # Index for therapist appointment schedule lookups (skip if already exists)
    # This is likely already a foreign key index
    # add_index :therapist_appointment_schedules, :therapist_id, unique: true
  end
end
