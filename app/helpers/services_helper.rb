module ServicesHelper
  include ActionView::Helpers::NumberHelper

  def serialize_service(service, options = {})
    service.as_json(only: options[:only] || nil).tap do |serialized_service|
      # flatten the location_services and their associated locations
      if options[:include_locations]
        serialized_service["locations"] = service.location_services.map do |location_service|
          location_service.location.as_json(
            only: options[:only_location_services] || nil
          ).merge(active: location_service.active)
        end
      end

      # include the packages
      if options[:include_packages]
        serialized_service["packages"] = service.packages.map do |package|
          package_data = package.as_json(
            only: options[:only_packages] || nil
          )

          if options[:include_packages_formatted]
            package_data.merge!(
              formatted_price_per_visit: package.formatted_price_per_visit,
              formatted_total_price: package.formatted_total_price,
              formatted_fee_per_visit: package.formatted_fee_per_visit,
              formatted_total_fee: package.formatted_total_fee,
              formatted_discount: package.formatted_discount
            )
          end

          package_data
        end
      end

      # get the prices total grouping by currencies
      if options[:include_packages] && options[:include_total_package_prices]
        packages_grouped_by_currency = service.packages.group_by(&:currency)
        serialized_service["total_package_prices"] = packages_grouped_by_currency.map do |currency, packages|
          total_price = packages.sum(&:total_price)
          total_fee = packages.sum(&:total_fee)
          {
            currency: currency,
            total_price: total_price,
            formatted_total_price: number_to_currency(total_price, unit: currency, precision: 2, format: "%u %n"),
            total_fee: total_fee,
            formatted_total_fee: number_to_currency(total_fee, unit: currency, precision: 2, format: "%u %n")
          }
        end
      end
    end
  end
end
