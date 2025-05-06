class Admin < ApplicationRecord
  # * define the associations
  belongs_to :user

  has_many :appointment_admins
  has_many :appointments, through: :appointment_admins

  # * cycle callbacks
  after_destroy :destroy_associated_user

  # * define the validation
  TYPES = ["SUPER_ADMIN", "ADMIN", "ADMIN_SUPERVISOR"].freeze
  validates :admin_type, inclusion: {in: TYPES, message: "%{value} is not a valid admin type"}

  validates :name, presence: true

  self.implicit_order_column = "created_at"

  TYPES.each do |type|
    define_method :"is_#{type.downcase}?" do
      admin_type == type
    end
  end

  private

  def destroy_associated_user
    return if user.blank?

    logger.info "Deleting the associated User: #{user.email}"
    user.destroy
  end
end
