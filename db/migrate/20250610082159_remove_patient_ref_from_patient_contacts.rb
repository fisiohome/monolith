class RemovePatientRefFromPatientContacts < ActiveRecord::Migration[8.0]
  def change
    if column_exists?(:patient_contacts, :patient_id)
      remove_reference :patient_contacts, :patient,
        foreign_key: true,
        index: true
    end
  end
end
