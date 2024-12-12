class InertiaExampleController < ApplicationController
  before_action :authenticate_user!

  def index
    render inertia: "InertiaExample", props: {
      name: params.fetch(:name, "World")
    }
  end
end
