require "securerandom"

def generate_therapist_data(index)
  gender = index.even? ? "MALE" : "FEMALE"
  name = "Tech Therapist #{gender.capitalize} #{index + 3}"
  email = "techtherapist#{index + 3}@fisiohome.id"
  phone_number = "+628123456789#{index + 2}"
  batch = (index % 3) + 1
  specializations = index.even? ? ["Muskuloskeletal", "Neuromuskuler"] : ["Perawat aestetik injeksi wajah dan Infus"]
  modalities = index.even? ? ["IR", "TENS", "US"] : ["Alat infus dan Injeksi untuk wajah dan bahan2 lain strerilisasi"]
  employment_type = index.even? ? "KARPIS" : "FLAT"
  employment_status = ["ACTIVE", "HOLD", "INACTIVE"].sample # Randomize employment status
  service_name = index.even? ? "FISIOHOME" : "PERAWAT_HOMECARE"
  city = index.even? ? "KOTA ADM. JAKARTA SELATAN" : "KOTA BANDUNG"
  address = index.even? ? "Jl. Jend. Sudirman No.#{index + 1}, Jakarta Selatan" : "Jl. Asia Afrika No.#{index + 1}, Bandung"
  postal_code = index.even? ? "12345" : "67890"
  bank_name = index.even? ? "BCA" : "MANDIRI"
  account_number = SecureRandom.random_number(10**10).to_s.rjust(10, "0")

  {
    email: email,
    name: name,
    phone_number: phone_number,
    gender: gender,
    batch: batch,
    specializations: specializations,
    modalities: modalities,
    employment_type: employment_type,
    employment_status: employment_status, # Randomized employment status
    service_name: service_name,
    addresses_attributes: [
      {
        city: city,
        latitude: 0.0,
        longitude: 0.0,
        coordinates: [0.0, 0.0],
        address: address,
        postal_code: postal_code,
        active: true
      }
    ],
    bank_details_attributes: [
      {
        bank_name: bank_name,
        account_number: account_number,
        account_holder_name: name.upcase,
        active: true
      }
    ]
  }
end

THERAPISTS_DATA = (1..2).map { |i| generate_therapist_data(i) }

THERAPISTS_DATA.each_with_index do |therapist, index|
  Rails.logger.info "Therapist #{index + 1}:"
  Rails.logger.info therapist
  Rails.logger.info "\n"
end
