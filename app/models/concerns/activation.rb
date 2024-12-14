module Activation
  extend ActiveSupport::Concern

  included do
    # validation for is_active
    validates :active, inclusion: {in: [true, false], message: "%{value} is not a valid"}

    # scope for active records
    scope :active, -> { where(active: true) }

    def is_active?
      active
    end
  end
end
