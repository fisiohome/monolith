class CreateSyncMonolithLogs < ActiveRecord::Migration[8.0]
  def up
    create_table :sync_monolith_logs, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.uuid :user_id, null: false, comment: "User who performed the sync"
      t.string :sync_type, null: false, comment: "Type of data synced (therapists, brands, etc.)"
      t.string :status, null: false, default: "running", comment: "Current status of the sync"
      t.text :ui_message, comment: "Brief message shown to users in UI"
      t.text :logger_message, comment: "Detailed message with item names and reasons"
      t.text :details, comment: "Full error stack traces or additional details"
      t.datetime :started_at, comment: "When the sync operation started"
      t.datetime :completed_at, comment: "When the sync operation completed"
      t.datetime :created_at, null: false, default: -> { "now()" }
      t.datetime :updated_at, null: false, default: -> { "now()" }

      # Indexes for performance
      t.index [:user_id, :sync_type]
      t.index [:user_id, :created_at]
      t.index :sync_type
      t.index :status

      # Foreign key constraint with cascade delete
      t.foreign_key :users, on_delete: :cascade
    end

    # Add a comment to the table
    execute <<-SQL
      COMMENT ON TABLE sync_monolith_logs IS 'Audit trail for all sync operations from the monolith system';
    SQL
  end

  def down
    drop_table :sync_monolith_logs
  end
end
