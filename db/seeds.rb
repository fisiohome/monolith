# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# Helper for logging with colors and timestamps
def log_message(message, type = :info)
  colors = {
    info: "\e[34m", # Blue
    success: "\e[32m", # Green
    warn: "\e[33m", # Yellow
    error: "\e[31m" # Red
  }
  reset = "\e[0m"
  time = Time.zone.now.strftime("%Y-%m-%d %H:%M:%S")
  color = colors[type] || colors[:info]
  Rails.logger.debug { "#{color}[#{time}] #{message}#{reset}" }
end

# for seeding the services and locations
Rails.logger.debug ""
log_message("=== Starting to create the services and locations... ===", :info)

# seeding the locations
log_message("Creating the locations...", :info)

# country name and country code based on https://api.countrystatecity.in/play as uppercase value
# FOR INDONESIAN COUNTRY BASED ON https://api.cahyadsn.com/
begin
  locations = [
    {country: "INDONESIA", country_code: "ID", state: "DKI JAKARTA", city: "KOTA ADM. JAKARTA SELATAN"},
    {country: "INDONESIA", country_code: "ID", state: "DKI JAKARTA", city: "KOTA ADM. JAKARTA BARAT"},
    {country: "INDONESIA", country_code: "ID", state: "DKI JAKARTA", city: "KOTA ADM. JAKARTA TIMUR"},
    {country: "INDONESIA", country_code: "ID", state: "DKI JAKARTA", city: "KOTA ADM. JAKARTA UTARA"},
    {country: "INDONESIA", country_code: "ID", state: "DKI JAKARTA", city: "KOTA ADM. JAKARTA PUSAT"},
    {country: "INDONESIA", country_code: "ID", state: "BANTEN", city: "KOTA TANGERANG SELATAN"},
    {country: "INDONESIA", country_code: "ID", state: "BANTEN", city: "KAB. TANGERANG"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA BARAT", city: "KOTA BOGOR"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA BARAT", city: "KAB. BOGOR"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA BARAT", city: "KOTA BANDUNG"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA BARAT", city: "KAB. BANDUNG"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA BARAT", city: "KAB. BANDUNG BARAT"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA BARAT", city: "KOTA BEKASI"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA BARAT", city: "KAB. BEKASI"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA BARAT", city: "KOTA DEPOK"},
    {country: "INDONESIA", country_code: "ID", state: "DAERAH ISTIMEWA YOGYAKARTA", city: "KOTA YOGYAKARTA"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TENGAH", city: "KOTA SEMARANG"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TENGAH", city: "KAB. SEMARANG"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TENGAH", city: "KOTA SURAKARTA"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TIMUR", city: "KOTA MALANG"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TIMUR", city: "KAB. MALANG"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TIMUR", city: "KOTA BATU"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TIMUR", city: "KOTA SURABAYA"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TIMUR", city: "KAB. SIDOARJO"},
    {country: "INDONESIA", country_code: "ID", state: "JAWA TIMUR", city: "KAB. GRESIK"}
  ]

  locations.each_with_index do |loc, index|
    location = Location.find_or_initialize_by(city: loc[:city])
    location.assign_attributes(loc)
    location.save!
    log_message("Location #{index + 1}/#{locations.size} created/updated: #{loc[:city]}, #{loc[:state]}", :success)
  end
rescue => e
  log_message("Error while seeding locations: #{e.message}", :error)
end

log_message("Locations seeding completed", :info)

# seeding the services
Rails.logger.debug ""
log_message("Creating the services...", :info)

begin
  services = [
    {name: "FISIOHOME", code: "FH", active: true},
    {name: "PUSAT_OKUPASI", code: "PO", active: true},
    {name: "WICARAKU", code: "W", active: true},
    {name: "PERAWAT_HOMECARE", code: "PH", active: true},
    {name: "CAREGIVER_HOMECARE", code: "PH", active: true},
    {name: "AESTHETIC_HOMECARE", code: "PH", active: true}
  ]

  services.each_with_index do |item, index|
    service = Service.find_or_initialize_by(name: item[:name])
    service.assign_attributes(item)
    service.save!
    log_message("Service #{index + 1}/#{services.size} created/updated: #{item[:name]}, #{item[:code]}", :success)
  end
rescue => e
  log_message("Error while seeding services: #{e.message}", :error)
end

log_message("Services seeding completed", :info)

# # seeding location_services: All services in all locations
# puts ""
# log_message("Seeding the association location_services...", :info)

# begin
#   locations = Location.all
#   services = Service.all

#   if locations.empty? || services.empty?
#     log_message("No locations or services found. Skipping location_services seeding.", :warn)
#   else
#     locations.each_with_index do |location, loc_index|
#       services.each_with_index do |service, svc_index|
#         location_service = LocationService.find_or_initialize_by(location_id: location.id, service_id: service.id)
#         location_service.active = true # Set active status as needed
#         location_service.save!

#         log_message("LocationService #{loc_index + 1}/#{locations.size}, Service #{svc_index + 1}/#{services.size} created: " \
#                     "Location: #{location.city}, Service: #{service.name}", :success)
#       end
#     end
#     log_message("All location_services seeded successfully.", :success)
#   end
# rescue => e
#   log_message("Error while seeding location_services: #{e.message}", :error)
# end
log_message("=== Services and locations seeding completed ===", :info)

# for seeding the accounts
log_message("=== Starting to seed accounts... ===", :info)

# seeding the default super admins
log_message("Creating the Super Admins...", :info)

begin
  super_admins = [
    {email: "tech@fisiohome.id", name: "Tech Admin"},
    {email: "dendy@fisiohome.id", name: "Dendy"},
    {email: "hasnal@fisiohome.id", name: "Hasnal"}
  ]

  super_admins.each_with_index do |admin_data, index|
    user = User.where(email: admin_data[:email]).first_or_create do |user|
      user.password = "Fisiohome123!"
      user.password_confirmation = "Fisiohome123!"
    end

    admin = Admin.find_or_initialize_by(user: user)
    admin.admin_type = "SUPER_ADMIN"
    admin.name = admin_data[:name]
    admin.save!

    log_message("Super Admin #{index + 1}/#{super_admins.size} created/updated: #{admin_data[:email]} (#{admin_data[:name]})", :success)
  end
rescue => e
  log_message("Error while seeding Super Admins: #{e.message}", :error)
end

log_message("Super Admins seeding completed", :info)

# seeding the default other admin
Rails.logger.debug ""
log_message("Creating the other admins...", :info)

begin
  other_admins = [
    {email: "tech_admin_backlog@fisiohome.id", name: "Tech Admin Backlog"},
    {email: "tech_admin_l1@fisiohome.id", name: "Tech Admin L1"},
    {email: "tech_admin_l2@fisiohome.id", name: "Tech Admin L2"},
    {email: "tech_admin_l3@fisiohome.id", name: "Tech Admin L3"}
  ]

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

    log_message("Super Admin #{index + 1}/#{other_admins.size} created/updated: #{admin_data[:email]} (#{admin_data[:name]})", :success)
  end
rescue => e
  log_message("Error while seeding Super Admins: #{e.message}", :error)
end

log_message("Other admins seeding completed", :info)

# seeding the default therapists
Rails.logger.debug ""
log_message("Creating the therapists...", :info)

begin
  therapists_data = [
    {
      email: "therapist1@fisiohome.id",
      name: "Therapist One",
      phone_number: "+6281234567890",
      gender: "MALE",
      batch: 1,
      specializations: ["Muskuloskeletal", "Neuromuskuler"],
      modalities: ["IR", "TENS", "US"],
      employment_type: "KARPIS",
      employment_status: "ACTIVE",
      service_id: Service.find_by(name: "FISIOHOME").id,
      addresses_attributes: [
        {
          location_id: Location.find_by(city: "KOTA ADM. JAKARTA SELATAN").id,
          latitude: 0.0,
          longitude: 0.0,
          coordinates: [0.0, 0.0],
          address: "Jl. Jend. Sudirman No.1, Jakarta Selatan",
          postal_code: "12345",
          active: true
        }
      ],
      bank_details_attributes: [
        {
          bank_name: "BCA",
          account_number: "1234567890",
          account_holder_name: "Therapist One".upcase,
          active: true
        }
      ]
    },
    {
      email: "therapist2@fisiohome.id",
      name: "Therapist Two",
      phone_number: "+6281234567891",
      gender: "FEMALE",
      batch: 1,
      specializations: ["Perawat aestetik injeksi wajah dan Infus"],
      modalities: ["Alat infus dan Injeksi untuk wajah dan bahan2 lain strerilisasi"],
      employment_type: "FLAT",
      employment_status: "HOLD",
      service_id: Service.find_by(name: "PUSAT_OKUPASI").id,
      addresses_attributes: [
        {
          location_id: Location.find_by(city: "KOTA BANDUNG").id,
          latitude: 0.0,
          longitude: 0.0,
          coordinates: [0.0, 0.0],
          address: "Jl. Asia Afrika No.2, Bandung",
          postal_code: "67890",
          active: true
        }
      ],
      bank_details_attributes: [
        {
          bank_name: "MANDIRI",
          account_number: "0987654321",
          account_holder_name: "Therapist Two".upcase,
          active: true
        },
        {
          bank_name: "BNI",
          account_number: "1122334455",
          account_holder_name: "Therapist Two".upcase,
          active: false
        },
        {
          bank_name: "BRI",
          account_number: "5566778899",
          account_holder_name: "Therapist Two".upcase,
          active: false
        }
      ]
    }
  ]

  therapists_data.each_with_index do |therapist_data, therapist_index|
    # create or update user
    user = User.where(email: therapist_data[:email]).first_or_create do |user|
      user.password = "Therapist123!"
      user.password_confirmation = "Therapist123!"

      log_message("User created: #{therapist_data[:email]}", :success)
    end

    # create or update therapist and related records
    therapist = Therapist.find_or_initialize_by(user_id: user.id)
    therapist.assign_attributes(therapist_data.except(:email, :addresses_attributes, :bank_details_attributes).merge(user_id: user.id))
    therapist.save!

    therapist_data[:bank_details_attributes].each_with_index do |bank_data, bank_index|
      bank_detail = BankDetail.find_or_initialize_by(bank_name: bank_data[:bank_name], account_number: bank_data[:account_number])
      bank_detail.assign_attributes(bank_data.except(:active))
      bank_detail.save!

      TherapistBankDetail.find_or_initialize_by(therapist: therapist, bank_detail: bank_detail).update!(active: bank_data[:active])

      log_message("Bank Detail #{bank_index + 1}/#{therapist_data[:bank_details_attributes].size} created/updated: #{bank_data[:bank_name]} - #{bank_data[:account_number]}", :success)
    end

    therapist_data[:addresses_attributes].each_with_index do |address_data, address_index|
      address = Address.find_or_initialize_by(address: address_data[:address])
      address.assign_attributes(address_data.except(:active))
      address.save!

      TherapistAddress.find_or_initialize_by(therapist: therapist, address: address).update!(active: address_data[:active])

      log_message("Address #{address_index + 1}/#{therapist_data[:addresses_attributes].size} created/updated: #{address_data[:address]}", :success)
    end

    log_message("Therapist #{therapist_index + 1}/#{therapists_data.size} created/updated: #{therapist.name}", :success)
  end
rescue => e
  log_message("Error while seeding therapists: #{e.message}", :error)
end

log_message("Therapists seeding completed", :info)

log_message("=== All accounts seeding completed ===", :info)
Rails.logger.debug ""
