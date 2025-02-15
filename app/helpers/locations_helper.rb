module LocationsHelper
  def serialize_location(location, options = {})
    location.as_json(only: options[:only] || nil)
  end
end
