class AddContractDatesToTherapists < ActiveRecord::Migration[8.0]
  def change
    add_column :therapists, :contract_start_date, :date, comment: "Optional contract start date for the therapist"
    add_column :therapists, :contract_end_date, :date, comment: "Optional contract end date for the therapist"
  end
end
