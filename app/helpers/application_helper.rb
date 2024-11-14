module ApplicationHelper
  def deep_transform_keys_to_camel_case(hash)
    hash.deep_transform_keys { |key| key.to_s.camelize(:lower) }
  end

  def deep_transform_keys_to_snake_case(hash)
    hash.deep_transform_keys { |key| key.to_s.underscore }
  end
end
