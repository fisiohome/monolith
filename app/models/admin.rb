class Admin < ApplicationRecord
  # define the associations
  belongs_to :user

  # cycle callbacks
  after_destroy :destroy_associated_user

  TYPES = [ "SUPER_ADMIN", "ADMIN_L1", "ADMIN_L2", "ADMIN_L3", "ADMIN_BACKLOG" ].freeze
  validates :admin_type, inclusion: { in: TYPES, message: "%{value} is not a valid admin type" }

  validates :name, presence: true

  self.implicit_order_column = "created_at"

  def is_super_admin?
    self.admin_type === "SUPER_ADMIN"
  end

  def is_admin_l1?
    self.admin_type === "ADMIN_L1"
  end

  def is_admin_l2?
    self.admin_type === "ADMIN_L2"
  end

  def is_admin_l3?
    self.admin_type === "ADMIN_L3"
  end

  def is_admin_backlog?
    self.admin_type === "ADMIN_BACKLOG"
  end

  private

  def destroy_associated_user
    return if !user.present?

    logger.info "Deleting the associated User: #{user.email}"
    user.destroy
  end
end
