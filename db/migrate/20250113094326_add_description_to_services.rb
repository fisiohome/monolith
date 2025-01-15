class AddDescriptionToServices < ActiveRecord::Migration[8.0]
  def change
    add_column :services, :description, :text
  end
end
