THERAPISTS_DATA = [
  {
    email: "techtherapist1@fisiohome.id",
    name: "Tech Therapist Male",
    phone_number: "+6281234567890",
    gender: "MALE",
    batch: 1,
    specializations: ["Muskuloskeletal", "Neuromuskuler"],
    modalities: ["IR", "TENS", "US"],
    employment_type: "KARPIS",
    employment_status: "ACTIVE",
    # service_id: Service.find_by(name: "FISIOHOME").id,
    service_name: "FISIOHOME", # Use the service name instead of querying here
    addresses_attributes: [
      {
        city: "KOTA ADM. JAKARTA SELATAN", # Use city name instead of querying
        # location_id: Location.find_by(city: "KOTA ADM. JAKARTA SELATAN").id,
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
        account_holder_name: "Tech Therapist Male".upcase,
        active: true
      }
    ]
  },
  {
    email: "techtherapist2@fisiohome.id",
    name: "Tech Therapist Female",
    phone_number: "+6281234567891",
    gender: "FEMALE",
    batch: 1,
    specializations: ["Perawat aestetik injeksi wajah dan Infus"],
    modalities: ["Alat infus dan Injeksi untuk wajah dan bahan2 lain strerilisasi"],
    employment_type: "FLAT",
    employment_status: "HOLD",
    # service_id: Service.find_by(name: "PERAWAT_HOMECARE").id,
    service_name: "PERAWAT_HOMECARE", # Use the service name instead of querying here
    addresses_attributes: [
      {
        # location_id: Location.find_by(city: "KOTA BANDUNG").id,
        city: "KOTA BANDUNG", # Use city name instead of querying
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
        account_holder_name: "Tech Therapist Female".upcase,
        active: true
      },
      {
        bank_name: "BNI",
        account_number: "1122334455",
        account_holder_name: "Tech Therapist Female".upcase,
        active: false
      },
      {
        bank_name: "BRI",
        account_number: "5566778899",
        account_holder_name: "Tech Therapist Female".upcase,
        active: false
      }
    ]
  }
].freeze
