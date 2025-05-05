# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# country name and country code based on https://api.countrystatecity.in/play as uppercase value
# FOR INDONESIAN COUNTRY BASED ON https://api.cahyadsn.com/
# * seeding the indonesian areas
Rails.logger.info "\n🌱 Starting Indonesian Areas seeding..."
INDONESIAN_AREAS.each do |area_data|
  area = IndonesianArea.find_by(code: area_data[:code])

  if area
    Rails.logger.info "✅ Area exists: #{area_data[:name]} (Code: #{area_data[:code]})"
  else
    IndonesianArea.create!(area_data)
    Rails.logger.info "🆕 Created Area: #{area_data[:name]} (Code: #{area_data[:code]})"
  end
end
Rails.logger.info "✅ Indonesian Areas seeding completed.\n"

# * seeding the our locations
Rails.logger.info "\n🌱 Starting Locations seeding..."
LOCATIONS_DATA.each do |location_data|
  location = Location.find_by(
    country: location_data[:country],
    state: location_data[:state],
    city: location_data[:city]
  )

  if location
    Rails.logger.info "✅ Location exists: #{location.city}, #{location.state}, #{location.country}"
  else
    location = Location.create!(location_data)
    Rails.logger.info "🆕 Created Location: #{location.city}, #{location.state}, #{location.country}"
  end
end
Rails.logger.info "✅ Locations seeding completed.\n"

# * seeding the our LocationServices
Rails.logger.info "\n🌱 Starting LocationServices seeding..."
LOCATION_SERVICES_DATA.each do |entry|
  service = Service.find_by(name: entry[:service_name])

  unless service
    Rails.logger.warn "⚠️ Service not found: #{entry[:service_name]}"
    next
  end

  entry[:cities].each do |city_name|
    location = Location.find_by(city: city_name)

    unless location
      Rails.logger.warn "⚠️ Location not found for city: #{city_name}"
      next
    end

    LocationService.find_or_create_by!(location: location, service: service)
    Rails.logger.info "🔗 Linked Service '#{service.name}' to Location '#{location.city}'"
  end
end
Rails.logger.info "✅ LocationServices seeding completed.\n"

# * seeding the brands
Rails.logger.info "\n🌱 Starting Brands seeding..."

SERVICES_DATA.each do |service_data|
  service = Service.find_by(name: service_data[:name])

  if service
    Rails.logger.info "✅ Brand exists: #{service_data[:name]} (Brand ID: #{service.id})"
  else
    service = Service.create!(service_data)
    Rails.logger.info "🆕 Created Brand: #{service_data[:name]} (Brand ID: #{service.id})"
  end
end

# * seeding the default admins
Rails.logger.info "\n🌱 Starting Admins and Users seeding..."
ADMINS_DATA.each do |admin_data|
  user = User.find_by(email: admin_data[:email])

  if user
    Rails.logger.info "✅ User exists: #{admin_data[:email]} (User ID: #{user.id})"
  else
    user = User.create!(
      email: admin_data[:email],
      password: "Fisiohome123!",
      password_confirmation: "Fisiohome123!"
    )
    Rails.logger.info "🆕 Created User: #{admin_data[:email]} (User ID: #{user.id})"
  end

  admin = Admin.find_by(user_id: user.id)

  if admin
    Rails.logger.info "✅ Admin exists for #{admin_data[:email]} (Admin ID: #{admin.id})"
  else
    Admin.create!(
      user_id: user.id,
      name: admin_data[:name],
      admin_type: admin_data[:admin_type]
    )
    Rails.logger.info "🆕 Created Admin for #{admin_data[:email]} (User ID: #{user.id})"
  end
end
Rails.logger.info "✅ Admins and Users seeding completed.\n"
