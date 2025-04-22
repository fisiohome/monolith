class MigratePatientActiveAddressToAppointmentAddressHistory < ActiveRecord::Migration[8.0]
  def up
    Appointment.find_each do |appointment|
      # Find this appointment’s patient’s current (active) address
      active_pa = PatientAddress.find_by(patient_id: appointment.patient_id, active: true)
      next unless active_pa

      addr = Address.find(active_pa.address_id)

      AppointmentAddressHistory.create!(
        appointment_id: appointment.id,
        location_id: addr.location_id,
        latitude: addr.latitude,
        longitude: addr.longitude,
        address_line: addr.address,
        postal_code: addr.postal_code,
        notes: addr.notes,
        # If Rails/AR accepts a raw point literal:
        coordinates: Arel.sql("POINT(#{addr.longitude}, #{addr.latitude})")
      )
    end
  end

  def down
    # Remove all the history rows we just backfilled
    AppointmentAddressHistory.delete_all
  end
end
