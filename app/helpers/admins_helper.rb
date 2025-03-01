module AdminsHelper
  def serialize_admin(admin, options = {})
    admin.as_json(
      only: options[:only],
      include: {
        user: {
          only: %i[id email is_online? last_online_at last_sign_in_at current_sign_in_ip last_sign_in_ip suspend_at suspend_end],
          methods: %i[is_online? suspended?]
        }
      }
    )
  end
end
