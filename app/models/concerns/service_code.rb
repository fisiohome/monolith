module ServiceCode
  extend ActiveSupport::Concern
  SERVICE_CODES = Service.distinct.pluck(:code).freeze

  included do
    validates :code, inclusion: {in: SERVICE_CODES, message: "%{value} is not a valid service code"}
  end
end
