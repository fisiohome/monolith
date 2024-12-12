module ServiceCode
  extend ActiveSupport::Concern

  included do
    SERVICE_CODES = Service.pluck(:code).uniq.freeze
    validates :code, inclusion: { in: SERVICE_CODES, message: "%{value} is not a valid service code"  }
  end
end
