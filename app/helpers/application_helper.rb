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

  def deep_transform_keys_to_camel_case(hash)
    hash.deep_transform_keys { |key| key.to_s.camelize(:lower) }
  end

  def deep_transform_keys_to_snake_case(hash)
    hash.deep_transform_keys { |key| key.to_s.underscore }
  end
end
