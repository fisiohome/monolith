module ApplicationHelper
  # from https://github.com/ruby-china/ruby-china/blob/master/app/helpers/application_helper.rb
  MOBILE_USER_AGENTS = "palm|blackberry|nokia|phone|midp|mobi|symbian|chtml|ericsson|minimo|" \
    "audiovox|motorola|samsung|telit|upg1|windows ce|ucweb|astel|plucker|" \
    "x320|x240|j2me|sgh|portable|sprint|docomo|kddi|softbank|android|mmp|" \
    'pdxgw|netfront|xiino|vodafone|portalmmm|sagem|mot-|sie-|ipod|up\\.b|' \
    "webos|amoi|novarra|cdm|alcatel|pocket|iphone|mobileexplorer|mobile"
  def is_mobile?
    agent_str = request.user_agent.to_s.downcase
    return false if /ipad/.match?(agent_str)
    agent_str =~ Regexp.new(MOBILE_USER_AGENTS)
  end

  # Recursively transforms all hash keys to camelCase format.
  # @param hash [Hash] the hash to transform
  # @return [Hash] hash with all keys in camelCase
  def deep_transform_keys_to_camel_case(hash)
    hash.deep_transform_keys { |key| key.to_s.camelize(:lower) }
  end

  # Recursively transforms all hash keys to snake_case format.
  # @param hash [Hash] the hash to transform
  # @return [Hash] hash with all keys in snake_case
  def deep_transform_keys_to_snake_case(hash)
    hash.deep_transform_keys { |key| key.to_s.underscore }
  end

  # Normalizes a value to a boolean (true/false) or nil.
  def normalize_boolean(value)
    return nil if value.nil? || (value.respond_to?(:empty?) && value.empty?)
    return value if value == true || value == false

    case value.to_s.strip.downcase
    when "true", "1", "yes", "y" then true
    when "false", "0", "no", "n" then false
    end
  end
end
