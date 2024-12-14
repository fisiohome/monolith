class AddServiceReferencesToTherapist < ActiveRecord::Migration[8.0]
  def change
    add_reference :therapists, :service, null: true, foreign_key: true
  end
end
