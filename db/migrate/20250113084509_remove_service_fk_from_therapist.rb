class RemoveServiceFkFromTherapist < ActiveRecord::Migration[8.0]
  def change
    remove_foreign_key :therapists, :services
  end
end
