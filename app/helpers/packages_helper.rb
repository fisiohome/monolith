module PackagesHelper
  include ActionView::Helpers::NumberHelper

  def serialize_package(package, options = {})
    package.as_json(only: options[:only] || nil).tap do |serialized|
      # include the package with string amount - currency formatted
      if options.fetch(:include_packages_formatted, true)
        serialized.merge!(
          formatted_price_per_visit: package&.formatted_price_per_visit,
          formatted_total_price: package&.formatted_total_price,
          formatted_fee_per_visit: package&.formatted_fee_per_visit,
          formatted_total_fee: package&.formatted_total_fee,
          formatted_discount: package&.formatted_discount,
          formatted_total_price_without_discount: package&.formatted_total_price_without_discount
        )
      end
    end
  end
end
