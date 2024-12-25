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

ActiveRecord::Schema[8.0].define(version: 2024_12_03_170200) do
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

  create_table "bank_details", force: :cascade do |t|
    t.string "bank_name", null: false
    t.string "account_number", null: false
    t.string "account_holder_name", null: false
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

  create_table "services", force: :cascade do |t|
    t.string "name", null: false
    t.string "code", null: false
    t.boolean "active", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
  add_foreign_key "location_services", "locations"
  add_foreign_key "location_services", "services"
  add_foreign_key "therapist_addresses", "addresses"
  add_foreign_key "therapist_addresses", "therapists"
  add_foreign_key "therapist_bank_details", "bank_details"
  add_foreign_key "therapist_bank_details", "therapists"
  add_foreign_key "therapist_documents", "therapists"
  add_foreign_key "therapists", "services"
  add_foreign_key "therapists", "users"
end
