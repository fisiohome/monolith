class AddPatientContactRefToPatients < ActiveRecord::Migration[8.0]
  def change
    unless column_exists?(:patients, :patient_contact_id)
      add_reference :patients, :patient_contact
    end
  end
end
