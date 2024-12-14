class CreateTherapistDocuments < ActiveRecord::Migration[8.0]
  def change
    create_table :therapist_documents do |t|
      t.string :contract_document
      t.string :registration_certificate_document
      t.date :registration_certificate_valid_period
      t.string :agreement_document
      t.string :curriculum_vitae_document
      t.string :standard_operating_procedure_document
      t.references :therapist, type: :uuid, null: false, foreign_key: true

      t.timestamps
    end
  end
end
