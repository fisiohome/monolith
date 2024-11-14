class Admin < ApplicationRecord
  # define the associations
  belongs_to :user

  # cycle callbacks
  after_destroy :destroy_associated_user

  TYPES = [ "SUPER_ADMIN", "ADMIN_L1", "ADMIN_L2", "ADMIN_L3", "ADMIN_BACKLOG" ].freeze
  validates :admin_type, inclusion: { in: TYPES, message: "%{value} is not a valid admin type" }

  validates :name, presence: true

  private

  def destroy_associated_user
    return if !user.present?

    logger.info "Deleting the associated User: #{user.email}"
    user.destroy
  end
end
