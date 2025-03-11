module AdminPortal
  class SettingsController < ApplicationController
    def account_security
      render inertia: "Auth/EditPassword", props: deep_transform_keys_to_camel_case({
        user: current_user.as_json
      })
    end

    def appearance
      render inertia: "AdminPortal/Settings/Appearance", props: deep_transform_keys_to_camel_case({
        user: current_user.as_json
      })
    end
  end
end
