class ApplicationController < ActionController::Base
  include Pagy::Backend

  include Auth
  include ErrorHandler
  # include InertiaCsrf
  include InertiaFlash
  include InertiaJson
  include InertiaAdminPortal

  include ApplicationHelper
  include UsersHelper

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
end
