class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
    :recoverable, :rememberable, :validatable,
    :trackable

  has_one :admin, dependent: :destroy
  has_one :therapist, dependent: :destroy
  has_many :sync_logs, dependent: :destroy, class_name: "SyncMonolithLogs"

  validates :email, presence: true
  validates :email, uniqueness: true

  self.implicit_order_column = "created_at"

  def is_online?
    last_online_at.present? && last_online_at >= 3.minutes.ago
  end

  def suspended?
    return false if suspend_at.nil?

    if suspend_end.present?
      Time.current >= suspend_at && Time.current <= suspend_end
    else
      Time.current >= suspend_at
    end
  end

  # overriding the devise fn
  def active_for_authentication?
    super && !suspended?
  end

  # overriding the devise fn
  def inactive_message
    (!suspended?) ? :locked : super
  end
end
