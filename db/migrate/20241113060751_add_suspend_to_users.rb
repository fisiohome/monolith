class AddSuspendToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :suspend_at, :datetime
    add_column :users, :suspend_end, :datetime
  end
end
