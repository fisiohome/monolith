# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_04_23_042745) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  # Custom types defined in this database.
  # Note that some types may not work with other database engines. Be careful if changing database.
  create_enum "employment_status_enum", ["ACTIVE", "HOLD", "INACTIVE"]
  create_enum "employment_type_enum", ["KARPIS", "FLAT"]
  create_enum "gender_enum", ["MALE", "FEMALE"]

  create_table "addresses", force: :cascade do |t|
    t.bigint "location_id", null: false
    t.float "latitude", null: false
    t.float "longitude", null: false
    t.text "address", null: false
    t.string "postal_code", null: false
    t.float "coordinates", default: [], array: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "notes"
    t.index ["location_id"], name: "index_addresses_on_location_id"
  end

  create_table "admins", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "admin_type"
    t.string "name"
    t.uuid "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_admins_on_user_id"
  end

  create_table "appointment_address_histories", force: :cascade do |t|
    t.uuid "appointment_id", null: false
    t.bigint "location_id", null: false
    t.float "latitude", null: false
    t.float "longitude", null: false
    t.text "address_line", null: false
    t.string "postal_code", null: false
    t.text "notes"
    t.point "coordinates", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["appointment_id"], name: "index_appointment_address_histories_on_appointment_id"
    t.index ["location_id"], name: "index_appointment_address_histories_on_location_id"
  end

  create_table "appointment_admins", force: :cascade do |t|
    t.uuid "admin_id", null: false
    t.uuid "appointment_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["admin_id"], name: "index_appointment_admins_on_admin_id"
    t.index ["appointment_id"], name: "index_appointment_admins_on_appointment_id"
  end

  create_table "appointment_package_histories", force: :cascade do |t|
    t.uuid "appointment_id", null: false
    t.bigint "package_id", null: false
    t.string "name", null: false
    t.string "currency", null: false
    t.integer "number_of_visit", default: 1, null: false
    t.decimal "price_per_visit", null: false
    t.decimal "discount"
    t.decimal "total_price", null: false
    t.decimal "fee_per_visit", null: false
    t.decimal "total_fee", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["appointment_id"], name: "index_appointment_package_histories_on_appointment_id"
    t.index ["package_id"], name: "index_appointment_package_histories_on_package_id"
  end

  create_table "appointments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "therapist_id"
    t.uuid "patient_id", null: false
    t.bigint "service_id", null: false
    t.bigint "package_id", null: false
    t.bigint "location_id", null: false
    t.string "registration_number", null: false
    t.string "status", null: false
    t.datetime "appointment_date_time", null: false
    t.string "preferred_therapist_gender", null: false
    t.string "referral_source"
    t.string "other_referral_source"
    t.boolean "fisiohome_partner_booking", default: false, null: false
    t.string "fisiohome_partner_name"
    t.string "other_fisiohome_partner_name"
    t.string "voucher_code"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["location_id"], name: "index_appointments_on_location_id"
    t.index ["package_id"], name: "index_appointments_on_package_id"
    t.index ["patient_id"], name: "index_appointments_on_patient_id"
    t.index ["registration_number"], name: "index_appointments_on_registration_number", unique: true
    t.index ["service_id"], name: "index_appointments_on_service_id"
    t.index ["therapist_id"], name: "index_appointments_on_therapist_id"
  end

  create_table "bank_details", force: :cascade do |t|
    t.string "bank_name", null: false
    t.string "account_number", null: false
    t.string "account_holder_name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["bank_name", "account_number"], name: "index_bank_details_on_bank_name_and_account_number", unique: true
  end

  create_table "indonesian_areas", force: :cascade do |t|
    t.string "code"
    t.string "name"
    t.string "area_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "location_services", force: :cascade do |t|
    t.bigint "location_id", null: false
    t.bigint "service_id", null: false
    t.boolean "active", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["location_id", "service_id"], name: "index_location_services_on_location_and_service", unique: true
    t.index ["location_id"], name: "index_location_services_on_location_id"
    t.index ["service_id"], name: "index_location_services_on_service_id"
  end

  create_table "locations", force: :cascade do |t|
    t.string "country", null: false
    t.string "country_code", null: false
    t.string "state", null: false
    t.string "city", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["city"], name: "index_locations_on_city", unique: true
  end

  create_table "packages", force: :cascade do |t|
    t.bigint "service_id", null: false
    t.string "name", null: false
    t.boolean "active", default: false, null: false
    t.string "currency", null: false
    t.integer "number_of_visit", default: 1, null: false
    t.decimal "price_per_visit", null: false
    t.decimal "discount"
    t.decimal "total_price", null: false
    t.decimal "fee_per_visit", null: false
    t.decimal "total_fee", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["service_id"], name: "index_packages_on_service_id"
  end

  create_table "patient_addresses", force: :cascade do |t|
    t.uuid "patient_id", null: false
    t.bigint "address_id", null: false
    t.boolean "active", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["address_id"], name: "index_patient_addresses_on_address_id"
    t.index ["patient_id", "active"], name: "index_patient_addresses_on_patient_id_and_active", unique: true, where: "(active = true)"
    t.index ["patient_id"], name: "index_patient_addresses_on_patient_id"
  end

  create_table "patient_contacts", force: :cascade do |t|
    t.string "contact_name", null: false
    t.string "contact_phone", null: false
    t.string "email"
    t.string "miitel_link"
    t.uuid "patient_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["contact_phone"], name: "index_patient_contacts_on_contact_phone", unique: true
    t.index ["email"], name: "index_patient_contacts_on_email", unique: true
    t.index ["patient_id"], name: "index_patient_contacts_on_patient_id"
  end

  create_table "patient_medical_records", force: :cascade do |t|
    t.uuid "appointment_id", null: false
    t.text "illness_onset_date"
    t.text "complaint_description", null: false
    t.text "condition", null: false
    t.text "medical_history"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["appointment_id"], name: "index_patient_medical_records_on_appointment_id"
  end

  create_table "patients", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.date "date_of_birth", null: false
    t.enum "gender", null: false, enum_type: "gender_enum"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name", "date_of_birth", "gender"], name: "index_patients_on_name_and_date_of_birth_and_gender", unique: true
  end

  create_table "services", force: :cascade do |t|
    t.string "name", null: false
    t.string "code", null: false
    t.boolean "active", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.index ["name"], name: "index_services_on_name", unique: true
  end

  create_table "therapist_addresses", force: :cascade do |t|
    t.uuid "therapist_id", null: false
    t.bigint "address_id", null: false
    t.boolean "active", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["address_id"], name: "index_therapist_addresses_on_address_id"
    t.index ["therapist_id", "active"], name: "index_therapist_addresses_on_therapist_id_and_active", unique: true, where: "(active = true)"
    t.index ["therapist_id"], name: "index_therapist_addresses_on_therapist_id"
  end

  create_table "therapist_adjusted_availabilities", force: :cascade do |t|
    t.bigint "therapist_appointment_schedule_id", null: false
    t.date "specific_date", null: false
    t.time "start_time"
    t.time "end_time"
    t.string "reason"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["therapist_appointment_schedule_id", "specific_date", "start_time", "end_time"], name: "index_therapist_adjusted_availabilities_on_schedule_and_time", unique: true
    t.index ["therapist_appointment_schedule_id"], name: "idx_on_therapist_appointment_schedule_id_dddb00587e"
  end

  create_table "therapist_appointment_schedules", force: :cascade do |t|
    t.uuid "therapist_id", null: false
    t.integer "appointment_duration_in_minutes", default: 90, null: false
    t.integer "buffer_time_in_minutes", default: 30, null: false
    t.string "time_zone", default: "Asia/Jakarta", null: false
    t.boolean "available_now", default: true, null: false
    t.date "start_date_window"
    t.date "end_date_window"
    t.integer "max_advance_booking_in_days", default: 14, null: false
    t.integer "min_booking_before_in_hours", default: 24, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["therapist_id"], name: "index_therapist_appointment_schedules_on_therapist_id"
  end

  create_table "therapist_bank_details", force: :cascade do |t|
    t.uuid "therapist_id", null: false
    t.bigint "bank_detail_id", null: false
    t.boolean "active", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["bank_detail_id"], name: "index_therapist_bank_details_on_bank_detail_id"
    t.index ["therapist_id", "active"], name: "index_therapist_bank_details_on_therapist_id_and_active", unique: true, where: "(active = true)"
    t.index ["therapist_id"], name: "index_therapist_bank_details_on_therapist_id"
  end

  create_table "therapist_documents", force: :cascade do |t|
    t.string "contract_document"
    t.string "registration_certificate_document"
    t.date "registration_certificate_valid_period"
    t.string "agreement_document"
    t.string "curriculum_vitae_document"
    t.string "standard_operating_procedure_document"
    t.uuid "therapist_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["therapist_id"], name: "index_therapist_documents_on_therapist_id"
  end

  create_table "therapist_registration_counters", force: :cascade do |t|
    t.string "service_code", null: false
    t.integer "last_number", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["service_code"], name: "index_therapist_registration_counters_on_service_code", unique: true
  end

  create_table "therapist_weekly_availabilities", force: :cascade do |t|
    t.bigint "therapist_appointment_schedule_id", null: false
    t.string "day_of_week", null: false
    t.time "start_time", null: false
    t.time "end_time", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["therapist_appointment_schedule_id", "day_of_week", "start_time", "end_time"], name: "index_therapist_weekly_availabilities_on_schedule_and_time", unique: true
    t.index ["therapist_appointment_schedule_id"], name: "idx_on_therapist_appointment_schedule_id_71a804a72f"
  end

  create_table "therapists", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "phone_number", null: false
    t.string "registration_number", null: false
    t.enum "gender", null: false, enum_type: "gender_enum"
    t.integer "batch", null: false
    t.string "specializations", default: [], array: true
    t.string "modalities", default: [], array: true
    t.enum "employment_type", null: false, enum_type: "employment_type_enum"
    t.enum "employment_status", null: false, enum_type: "employment_status_enum"
    t.uuid "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "service_id"
    t.index ["modalities"], name: "index_therapists_on_modalities", using: :gin
    t.index ["phone_number"], name: "index_therapists_on_phone_number", unique: true
    t.index ["registration_number"], name: "index_therapists_on_registration_number", unique: true
    t.index ["service_id"], name: "index_therapists_on_service_id"
    t.index ["specializations"], name: "index_therapists_on_specializations", using: :gin
    t.index ["user_id"], name: "index_therapists_on_user_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.string "unconfirmed_email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "last_online_at"
    t.datetime "suspend_at"
    t.datetime "suspend_end"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "addresses", "locations"
  add_foreign_key "admins", "users"
  add_foreign_key "appointment_address_histories", "appointments"
  add_foreign_key "appointment_address_histories", "locations"
  add_foreign_key "appointment_admins", "admins"
  add_foreign_key "appointment_admins", "appointments"
  add_foreign_key "appointment_package_histories", "appointments"
  add_foreign_key "appointment_package_histories", "packages"
  add_foreign_key "appointments", "locations"
  add_foreign_key "appointments", "packages"
  add_foreign_key "appointments", "patients"
  add_foreign_key "appointments", "services"
  add_foreign_key "appointments", "therapists"
  add_foreign_key "location_services", "locations"
  add_foreign_key "location_services", "services"
  add_foreign_key "packages", "services"
  add_foreign_key "patient_addresses", "addresses"
  add_foreign_key "patient_addresses", "patients"
  add_foreign_key "patient_contacts", "patients"
  add_foreign_key "patient_medical_records", "appointments"
  add_foreign_key "therapist_addresses", "addresses"
  add_foreign_key "therapist_addresses", "therapists"
  add_foreign_key "therapist_adjusted_availabilities", "therapist_appointment_schedules"
  add_foreign_key "therapist_appointment_schedules", "therapists"
  add_foreign_key "therapist_bank_details", "bank_details"
  add_foreign_key "therapist_bank_details", "therapists"
  add_foreign_key "therapist_documents", "therapists"
  add_foreign_key "therapist_weekly_availabilities", "therapist_appointment_schedules"
  add_foreign_key "therapists", "users"
end
