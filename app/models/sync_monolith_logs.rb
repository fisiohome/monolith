class SyncMonolithLogs < ApplicationRecord
  belongs_to :user

  enum :status, {
    running: "running",
    completed: "completed",
    failed: "failed",
    partial: "partial"
  }

  # Scopes for common queries
  scope :by_sync_type, ->(type) { where(sync_type: type) }
  scope :by_user, ->(user) { where(user: user) }
  scope :recent, -> { order(created_at: :desc) }
  scope :completed_or_failed, -> { where(status: [:completed, :failed]) }

  # Validations
  validates :sync_type, presence: true
  validates :status, presence: true

  # Get duration in seconds
  def duration
    return nil unless started_at && completed_at
    (completed_at - started_at).to_i
  end
end
