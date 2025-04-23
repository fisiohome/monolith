class MigrateToAppointmentPackageHistories < ActiveRecord::Migration[8.0]
  def up
    Appointment.find_each do |appointment|
      # Get the package associated with the appointment
      package = Package.find_by(id: appointment.package_id)
      next unless package

      AppointmentPackageHistory.create!(
        appointment_id: appointment.id,
        package_id: package.id,
        name: package.name,
        currency: package.currency,
        number_of_visit: package.number_of_visit,
        price_per_visit: package.price_per_visit,
        discount: package.discount,
        total_price: package.total_price,
        fee_per_visit: package.fee_per_visit,
        total_fee: package.total_fee,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at
      )
    end
  end

  def down
    # Remove all package history records created by this migration
    AppointmentPackageHistory.delete_all
  end
end
