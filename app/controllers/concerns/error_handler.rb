module ErrorHandler
  extend ActiveSupport::Concern

  included do
    rescue_from StandardError, with: :inertia_error_page
  end

  private

  def inertia_error_page(exception)
    # Raise the exception in the local environment for detailed debugging
    raise exception if Rails.env.development?

    # Determine the appropriate status code based on the exception
    status = ActionDispatch::ExceptionWrapper.new(nil, exception).status_code

    # Render the Inertia error page with the status code as a prop
    render inertia: "Error", props: {status: status}, status: status
  end
end
