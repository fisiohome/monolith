# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# for seeding the services and locations
Rails.logger.info ""
Rails.logger.info("=== Starting to create the services and locations... ===")

# seeding the locations
Rails.logger.info("Creating the locations...")

# country name and country code based on https://api.countrystatecity.in/play as uppercase value
# FOR INDONESIAN COUNTRY BASED ON https://api.cahyadsn.com/
begin
  locations = LOCATIONS_DATA

  locations.each_with_index do |loc, index|
    location = Location.find_or_initialize_by(city: loc[:city])
    location.assign_attributes(loc)
    location.save!
    Rails.logger.debug { "Location #{index + 1}/#{locations.size} created/updated: #{loc[:city]}, #{loc[:state]}" }
  end
rescue => e
  Rails.logger.error("Error while seeding locations: #{e.message}")
end

Rails.logger.info("Locations seeding completed")

# seeding the services
Rails.logger.info ""
Rails.logger.info("Creating the brands...")

begin
  services = SERVICES_DATA

  services.each_with_index do |item, index|
    service = Service.find_or_initialize_by(name: item[:name])
    service.assign_attributes(item)
    service.save!
    Rails.logger.debug { "Brand #{index + 1}/#{services.size} created/updated: #{item[:name]}, #{item[:code]}" }
  end
rescue => e
  Rails.logger.error("Error while seeding brands: #{e.message}")
end

Rails.logger.info("Brands seeding completed")

# Seeding the packages
Rails.logger.info("")
Rails.logger.info("Creating the packages...")

begin
  # check if the services is existed
  services = Service.all
  raise "No service founds. Skipping the packages seeding." if services.empty?

  packages_list = PACKAGES_DATA

  packages_list.each do |service_package|
    service = Service.find_by(name: service_package[:service_name])
    next unless service # Skip if the service does not exist

    service_package[:packages].each_with_index do |pkg, index|
      total_price = (pkg[:number_of_visit] * pkg[:price_per_visit]) - (pkg[:discount] || 0)
      total_fee = pkg[:number_of_visit] * pkg[:fee_per_visit]

      package = Package.find_or_initialize_by(service: service, name: pkg[:name])
      package.assign_attributes(pkg.merge(total_price: total_price, total_fee: total_fee))
      package.save!

      Rails.logger.debug { "Package #{index + 1}/#{service_package[:packages].size} for brand #{service.name} created/updated: #{pkg[:name]}" }
    end
  end
rescue => e
  Rails.logger.error("Error while seeding packages: #{e.message}")
end
Rails.logger.info("")
Rails.logger.info("Packages seeding completed")

# # seeding location_services: All services in all locations
Rails.logger.info ""
Rails.logger.info("Create the association location_services...")

begin
  # check if the services is existed
  services = Service.all
  raise "No service founds. Skipping the packages seeding." if services.empty?

  # check if the locations is existed
  locations = Location.all
  raise "No location founds. Skipping the packages seeding." if locations.empty?

  location_service_list = LOCATION_SERVICES_DATA

  location_service_list.each do |location_service|
    service = Service.find_by(name: location_service[:service_name])
    next unless service # Skip if the service does not exist

    location_service[:cities].each_with_index do |city, index|
      location = Location.find_by(city:)

      # Link location and service
      LocationService.find_or_create_by!(location_id: location.id, service_id: service.id) { |ls| ls.active = true }
      Rails.logger.debug { "Linked Service '#{service.name}' to Location '#{location.city}'" }
    end
  end
rescue => e
  Rails.logger.error("Error while seeding location_services: #{e.message}")
end
Rails.logger.info ""
Rails.logger.info("=== Brands and locations seeding completed ===")

# for seeding the accounts
Rails.logger.info ""
Rails.logger.info("=== Starting to seed accounts... ===")

# seeding the default super admins
Rails.logger.info("")
Rails.logger.info("Creating the Super Admins...")

begin
  super_admins = SUPER_ADMINS_DATA

  super_admins.each_with_index do |admin_data, index|
    user = User.where(email: admin_data[:email]).first_or_create do |user|
      user.password = "Fisiohome123!"
      user.password_confirmation = "Fisiohome123!"
    end

    admin = Admin.find_or_initialize_by(user: user)
    admin.admin_type = "SUPER_ADMIN"
    admin.name = admin_data[:name]
    admin.save!

    Rails.logger.debug { "Super Admin #{index + 1}/#{super_admins.size} created/updated: #{admin_data[:email]} (#{admin_data[:name]})" }
  end
rescue => e
  Rails.logger.error("Error while seeding Super Admins: #{e.message}")
end
Rails.logger.info("")
Rails.logger.info("Super Admins seeding completed")

# seeding the default other admin
Rails.logger.info ""
Rails.logger.info("Creating the other admins...")

begin
  other_admins = OTHER_ADMINS_DATA

  other_admins.each_with_index do |admin_data, index|
    user = User.where(email: admin_data[:email]).first_or_create do |user|
      user.password = "Fisiohome123!"
      user.password_confirmation = "Fisiohome123!"
    end

    admin = Admin.find_or_initialize_by(user: user)

    case admin_data[:name]
    when "Tech Admin Backlog"
      admin.admin_type = "ADMIN_BACKLOG"
    when "Tech Admin L1"
      admin.admin_type = "ADMIN_L1"
    when "Tech Admin L2"
      admin.admin_type = "ADMIN_L2"
    when "Tech Admin L3"
      admin.admin_type = "ADMIN_L3"
    end

    admin.name = admin_data[:name]
    admin.save!

    Rails.logger.debug { "Super Admin #{index + 1}/#{other_admins.size} created/updated: #{admin_data[:email]} (#{admin_data[:name]})" }
  end
rescue => e
  Rails.logger.error("Error while seeding Super Admins: #{e.message}")
end
Rails.logger.info("")
Rails.logger.info("Other admins seeding completed")

# seeding the default therapists
Rails.logger.info ""
Rails.logger.info("Creating the therapists...")

begin
  therapists_data = THERAPISTS_DATA

  therapists_data.each_with_index do |therapist_data, therapist_index|
    # Find service and location IDs
    service_id = Service.find_by(name: therapist_data[:service_name])&.id
    addresses_attributes = therapist_data[:addresses_attributes].map do |address_data|
      location_id = Location.find_by(city: address_data[:city])&.id
      address_data.merge(location_id: location_id).except(:city)
    end

    # create or update user
    user = User.where(email: therapist_data[:email]).first_or_create do |user|
      user.password = "Therapist123!"
      user.password_confirmation = "Therapist123!"

      Rails.logger.debug { "User created: #{therapist_data[:email]}" }
    end

    # create or update therapist and related records
    therapist = Therapist.find_or_initialize_by(user_id: user.id)
    therapist.assign_attributes(
      therapist_data.except(
        :email, :service_name, :addresses_attributes, :bank_details_attributes
      )
      .merge(
        user_id: user.id, service_id: service_id
      )
    )
    therapist.save!

    therapist_data[:bank_details_attributes].each_with_index do |bank_data, bank_index|
      bank_detail = BankDetail.find_or_initialize_by(bank_name: bank_data[:bank_name], account_number: bank_data[:account_number])
      bank_detail.assign_attributes(bank_data.except(:active))
      bank_detail.save!

      TherapistBankDetail.find_or_initialize_by(therapist: therapist, bank_detail: bank_detail).update!(active: bank_data[:active])

      Rails.logger.debug { "Bank Detail #{bank_index + 1}/#{therapist_data[:bank_details_attributes].size} created/updated: #{bank_data[:bank_name]} - #{bank_data[:account_number]}" }
    end

    addresses_attributes.each_with_index do |address_data, address_index|
      address = Address.find_or_initialize_by(address: address_data[:address])
      address.assign_attributes(address_data.except(:active))
      address.save!

      TherapistAddress.find_or_initialize_by(therapist: therapist, address: address).update!(active: address_data[:active])

      Rails.logger.debug { "Address #{address_index + 1}/#{addresses_attributes.size} created/updated: #{address_data[:address]}" }
    end

    Rails.logger.debug { "Therapist #{therapist_index + 1}/#{therapists_data.size} created/updated: #{therapist.name}" }
  end
rescue => e
  Rails.logger.error("Error while seeding therapists: #{e.message}")
end
Rails.logger.info("")
Rails.logger.info("Therapists seeding completed")

Rails.logger.info("")
Rails.logger.info("=== All accounts seeding completed ===")
