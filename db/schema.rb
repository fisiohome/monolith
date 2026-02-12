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

ActiveRecord::Schema[8.0].define(version: 2026_02_11_025100) do
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
    t.string "postal_code"
    t.float "coordinates", default: [], array: true
    t.datetime "created_at", default: -> { "now()" }, null: false
    t.datetime "updated_at", default: -> { "now()" }, null: false
    t.text "notes"
    t.uuid "user_id"
    t.index ["location_id"], name: "index_addresses_on_location_id"
    t.index ["user_id"], name: "idx_addresses_user_id", where: "(user_id IS NOT NULL)"
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
    t.string "postal_code"
    t.text "notes"
    t.point "coordinates", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["appointment_id"], name: "idx_appointment_address_histories_appointment_id"
    t.index ["appointment_id"], name: "index_appointment_address_histories_on_appointment_id"
    t.index ["location_id"], name: "idx_appointment_address_histories_location_id"
    t.index ["location_id"], name: "index_appointment_address_histories_on_location_id"
    t.unique_constraint ["appointment_id"], name: "uq_appointment_address_history"
  end

  create_table "appointment_admins", force: :cascade do |t|
    t.uuid "admin_id", null: false
    t.uuid "appointment_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["admin_id"], name: "index_appointment_admins_on_admin_id"
    t.index ["appointment_id"], name: "index_appointment_admins_on_appointment_id"
  end

  create_table "appointment_draft_admins", force: :cascade do |t|
    t.bigint "appointment_draft_id", null: false
    t.uuid "admin_id", null: false
    t.boolean "is_primary", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["admin_id"], name: "index_appointment_draft_admins_on_admin_id"
    t.index ["appointment_draft_id", "admin_id"], name: "idx_on_appointment_draft_id_admin_id_65408e2ee6", unique: true
    t.index ["appointment_draft_id"], name: "index_appointment_draft_admins_on_appointment_draft_id"
    t.index ["is_primary"], name: "index_appointment_draft_admins_on_is_primary"
  end

  create_table "appointment_drafts", force: :cascade do |t|
    t.uuid "admin_pic_id", null: false
    t.uuid "created_by_admin_id", null: false
    t.string "current_step"
    t.jsonb "form_data", default: {}
    t.integer "status", default: 0, null: false
    t.uuid "appointment_id"
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["admin_pic_id"], name: "index_appointment_drafts_on_admin_pic_id"
    t.index ["appointment_id"], name: "index_appointment_drafts_on_appointment_id"
    t.index ["created_by_admin_id"], name: "index_appointment_drafts_on_created_by_admin_id"
    t.index ["expires_at"], name: "index_appointment_drafts_on_expires_at"
    t.index ["status"], name: "index_appointment_drafts_on_status"
  end

  create_table "appointment_evidence_photos", comment: "Stores photo references for appointment evidence in R2", force: :cascade do |t|
    t.bigint "evidence_id", null: false
    t.text "object_key", null: false, comment: "R2 object storage key path"
    t.string "photo_type", limit: 50, comment: "Type of photo: environment, selfie, document, etc."
    t.string "file_name", limit: 255
    t.bigint "file_size"
    t.string "content_type", limit: 100
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
    t.timestamptz "deleted_at"
    t.index ["deleted_at"], name: "idx_appointment_evidence_photos_deleted_at", where: "(deleted_at IS NULL)"
    t.index ["evidence_id"], name: "idx_appointment_evidence_photos_evidence_id"
  end

  create_table "appointment_evidences", comment: "Stores digital evidence/consent for appointments with JWT token proof", force: :cascade do |t|
    t.uuid "appointment_id", null: false
    t.uuid "patient_id", null: false
    t.text "token", null: false, comment: "JWT token containing appointment_id, patient_id, nonce as digital proof"
    t.string "nonce", limit: 50, null: false, comment: "Unique identifier for this evidence submission (timestamp-based)"
    t.float "latitude", comment: "GPS latitude at time of consent"
    t.float "longitude", comment: "GPS longitude at time of consent"
    t.text "user_agent", comment: "Browser/device user agent string"
    t.string "ip_address", limit: 45, comment: "IP address of the submitting client"
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
    t.timestamptz "deleted_at"
    t.text "notes"
    t.index ["appointment_id"], name: "idx_appointment_evidences_appointment_id"
    t.index ["created_at"], name: "idx_appointment_evidences_created_at"
    t.index ["deleted_at"], name: "idx_appointment_evidences_deleted_at", where: "(deleted_at IS NULL)"
    t.index ["patient_id"], name: "idx_appointment_evidences_patient_id"
    t.unique_constraint ["appointment_id"], name: "uq_appointment_evidence"
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

  create_table "appointment_reviews", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "appointment_id", null: false
    t.uuid "user_id", null: false
    t.decimal "rating", precision: 2, scale: 1, null: false
    t.text "liked_aspects", array: true
    t.text "notes"
    t.boolean "is_anonymous", default: false, null: false
    t.boolean "is_visible", default: true, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "deleted_at", precision: nil
    t.index ["appointment_id"], name: "idx_appointment_reviews_appointment_id"
    t.index ["appointment_id"], name: "idx_appointment_reviews_unique_appointment", unique: true, where: "(deleted_at IS NULL)"
    t.index ["created_at"], name: "idx_appointment_reviews_created_at", order: :desc
    t.index ["deleted_at"], name: "idx_appointment_reviews_deleted_at"
    t.index ["is_visible"], name: "idx_appointment_reviews_is_visible"
    t.index ["rating"], name: "idx_appointment_reviews_rating"
    t.index ["user_id"], name: "idx_appointment_reviews_user_id"
    t.check_constraint "rating >= 1.0 AND rating <= 5.0", name: "appointment_reviews_rating_check"
  end

  create_table "appointment_soaps", comment: "SOAP notes for appointments - standard medical documentation format", force: :cascade do |t|
    t.uuid "appointment_id", null: false
    t.uuid "therapist_id", null: false
    t.text "subject", comment: "Subjective: patient complaints, symptoms, medical history reported by patient"
    t.text "objective", comment: "Objective: examination findings, vital signs, measurable observations"
    t.text "assessment", comment: "Assessment: clinical diagnosis, impression, problem list"
    t.text "planning", comment: "Planning: treatment plan, interventions, follow-up schedule, referrals"
    t.text "additional_notes", comment: "Additional notes that do not fit into SOAP categories"
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
    t.timestamptz "deleted_at"
    t.boolean "is_final_visit", default: false, null: false
    t.text "initial_physical_condition"
    t.text "therapy_goal_evaluation"
    t.text "follow_up_therapy_plan"
    t.text "next_physiotherapy_goals"
    t.text "therapy_outcome_summary"
    t.text "notes"
    t.index ["appointment_id"], name: "idx_appointment_soaps_appointment_id"
    t.index ["created_at"], name: "idx_appointment_soaps_created_at"
    t.index ["deleted_at"], name: "idx_appointment_soaps_deleted_at", where: "(deleted_at IS NULL)"
    t.index ["is_final_visit"], name: "idx_appointment_soaps_is_final_visit", where: "(is_final_visit = true)"
    t.index ["therapist_id"], name: "idx_appointment_soaps_therapist_id"
    t.unique_constraint ["appointment_id"], name: "uq_appointment_soap"
  end

  create_table "appointment_status_histories", force: :cascade do |t|
    t.uuid "appointment_id", null: false
    t.string "old_status"
    t.string "new_status", null: false
    t.text "reason"
    t.uuid "changed_by", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["appointment_id"], name: "index_appointment_status_histories_on_appointment_id"
    t.index ["changed_by"], name: "index_appointment_status_histories_on_changed_by"
  end

  create_table "appointments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "therapist_id"
    t.uuid "patient_id", null: false
    t.bigint "service_id", null: false
    t.bigint "package_id", null: false
    t.bigint "location_id", null: false
    t.string "registration_number", null: false
    t.string "status", default: "UNSCHEDULED", null: false
    t.datetime "appointment_date_time"
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
    t.text "status_reason"
    t.uuid "appointment_reference_id"
    t.integer "visit_number", default: 1, null: false
    t.index ["appointment_reference_id", "visit_number"], name: "idx_on_appointment_reference_id_visit_number_7a88e806cc"
    t.index ["location_id"], name: "index_appointments_on_location_id"
    t.index ["package_id"], name: "index_appointments_on_package_id"
    t.index ["patient_id", "appointment_date_time", "status"], name: "idx_appointments_unscheduled", where: "(therapist_id IS NULL)"
    t.index ["patient_id", "appointment_date_time"], name: "idx_appointments_patient_datetime"
    t.index ["patient_id"], name: "index_appointments_on_patient_id"
    t.index ["registration_number", "visit_number"], name: "idx_appointments_registration_visit"
    t.index ["registration_number", "visit_number"], name: "index_appointments_on_registration_number_and_visit_number", unique: true
    t.index ["registration_number"], name: "idx_appointments_registration_number"
    t.index ["service_id"], name: "index_appointments_on_service_id"
    t.index ["status", "appointment_date_time"], name: "idx_appointments_status_datetime"
    t.index ["therapist_id", "appointment_date_time", "status"], name: "idx_appointments_therapist_datetime_status"
    t.index ["therapist_id", "appointment_date_time"], name: "idx_appointments_active_therapist_datetime", where: "((status)::text <> ALL (ARRAY[('CANCELLED'::character varying)::text, ('NO_SHOW'::character varying)::text]))"
    t.index ["therapist_id"], name: "index_appointments_on_therapist_id"
    t.index ["visit_number"], name: "index_appointments_on_visit_number"
  end

  create_table "bank_details", force: :cascade do |t|
    t.string "bank_name", null: false
    t.string "account_number", null: false
    t.string "account_holder_name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["bank_name", "account_number"], name: "index_bank_details_on_bank_name_and_account_number", unique: true
  end

  create_table "booking_drafts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.jsonb "payload", default: {}, null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["updated_at"], name: "idx_booking_drafts_updated_at", order: :desc
    t.index ["user_id"], name: "idx_booking_drafts_user", unique: true
    t.unique_constraint ["user_id"], name: "booking_drafts_user_id_key"
  end

  create_table "feature_flags", primary_key: ["key", "env"], force: :cascade do |t|
    t.string "key", limit: 100, null: false
    t.string "env", limit: 10, null: false
    t.boolean "is_enabled", default: false, null: false
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
    t.index ["key", "env"], name: "idx_feature_flags_key_env"
  end

  create_table "generic_content", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "group_key", limit: 100, null: false
    t.string "content_key", limit: 120, null: false
    t.text "content_value"
    t.boolean "is_active", default: true
    t.timestamptz "created_at", default: -> { "now()" }
    t.timestamptz "updated_at", default: -> { "now()" }
    t.index ["group_key", "content_key"], name: "idx_generic_content_group_key_content_key", unique: true
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

  create_table "order_details", id: :uuid, default: -> { "gen_random_uuid()" }, comment: "Visit-level breakdown linked to appointments", force: :cascade do |t|
    t.uuid "order_id", null: false
    t.uuid "appointment_id"
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["appointment_id"], name: "idx_order_details_appointment"
    t.index ["order_id"], name: "idx_order_details_order"
    t.unique_constraint ["appointment_id"], name: "order_details_appointment_id_key"
  end

  create_table "orders", id: :uuid, default: -> { "gen_random_uuid()" }, comment: "Master order/invoice table for package bookings with financial tracking", force: :cascade do |t|
    t.string "registration_number", limit: 100, null: false, comment: "Matches appointments.registration_number for the same booking"
    t.uuid "booking_draft_id"
    t.uuid "patient_id", null: false
    t.bigint "package_id", null: false
    t.decimal "package_base_price", precision: 10, scale: 2, null: false
    t.decimal "subtotal", precision: 10, scale: 2, null: false
    t.string "discount_type", limit: 20
    t.decimal "discount_value", precision: 10, scale: 2, default: "0.0"
    t.decimal "discount_amount", precision: 10, scale: 2, default: "0.0"
    t.string "voucher_code", limit: 100
    t.decimal "tax_percentage", precision: 5, scale: 2, default: "0.0"
    t.decimal "tax_amount", precision: 10, scale: 2, default: "0.0"
    t.decimal "total_amount", precision: 10, scale: 2, null: false, comment: "Final amount after discount and tax"
    t.decimal "paid_amount", precision: 10, scale: 2, default: "0.0", null: false, comment: "Total amount paid (auto-updated by trigger)"
    t.decimal "remaining_amount", precision: 10, scale: 2, null: false
    t.string "payment_status", limit: 50, default: "UNPAID", null: false, comment: "Auto-updated based on paid_amount vs total_amount"
    t.string "invoice_number", limit: 100
    t.text "invoice_url"
    t.datetime "invoice_due_date", precision: nil
    t.string "status", limit: 50, default: "DRAFT", null: false
    t.text "special_notes"
    t.text "cancellation_reason"
    t.datetime "cancelled_at", precision: nil
    t.datetime "completed_at", precision: nil
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.uuid "user_id", comment: "User who owns/created this order. Used for My Orders endpoint."
    t.uuid "voucher_id"
    t.string "cancelled_by", limit: 20, comment: "Who cancelled: PATIENT, ADMIN, or SYSTEM"
    t.index ["cancelled_by"], name: "idx_orders_cancelled_by", where: "(cancelled_by IS NOT NULL)"
    t.index ["created_at"], name: "idx_orders_created_at", order: :desc
    t.index ["invoice_number"], name: "idx_orders_invoice_number"
    t.index ["package_id"], name: "idx_orders_package"
    t.index ["patient_id"], name: "idx_orders_patient"
    t.index ["payment_status"], name: "idx_orders_payment_status"
    t.index ["registration_number"], name: "idx_orders_registration_number"
    t.index ["status"], name: "idx_orders_status"
    t.index ["user_id"], name: "idx_orders_user_id"
    t.index ["voucher_code"], name: "idx_orders_voucher_code"
    t.index ["voucher_id"], name: "idx_orders_voucher_id"
    t.check_constraint "discount_amount >= 0::numeric AND discount_amount <= subtotal", name: "valid_discount"
    t.check_constraint "discount_type::text = ANY (ARRAY['PERCENTAGE'::character varying::text, 'FIXED'::character varying::text, 'VOUCHER'::character varying::text, 'NONE'::character varying::text])", name: "orders_discount_type_check"
    t.check_constraint "paid_amount >= 0::numeric AND paid_amount <= (total_amount + 100::numeric)", name: "valid_payment"
    t.check_constraint "payment_status::text = ANY (ARRAY['UNPAID'::character varying::text, 'PARTIALLY_PAID'::character varying::text, 'PAID'::character varying::text, 'OVERPAID'::character varying::text, 'REFUNDED'::character varying::text])", name: "orders_payment_status_check"
    t.check_constraint "status::text = ANY (ARRAY['DRAFT'::character varying::text, 'PENDING_PAYMENT'::character varying::text, 'PARTIALLY_PAID'::character varying::text, 'PAID'::character varying::text, 'SCHEDULED'::character varying::text, 'IN_PROGRESS'::character varying::text, 'COMPLETED'::character varying::text, 'CANCELLED'::character varying::text, 'REFUNDED'::character varying::text])", name: "orders_status_check"
    t.unique_constraint ["invoice_number"], name: "orders_invoice_number_key"
    t.unique_constraint ["registration_number"], name: "orders_registration_number_key"
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
    t.index ["patient_id", "active"], name: "idx_patient_addresses_patient_active", where: "(active = true)"
    t.index ["patient_id", "active"], name: "index_patient_addresses_on_patient_id_and_active", unique: true, where: "(active = true)"
    t.index ["patient_id"], name: "index_patient_addresses_on_patient_id"
  end

  create_table "patient_contacts", force: :cascade do |t|
    t.string "contact_name", null: false
    t.string "contact_phone", null: false
    t.string "email"
    t.string "miitel_link"
    t.datetime "created_at", default: -> { "now()" }, null: false
    t.datetime "updated_at", default: -> { "now()" }, null: false
    t.index ["contact_phone"], name: "index_patient_contacts_on_contact_phone", unique: true
    t.index ["email"], name: "index_patient_contacts_on_email", unique: true
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
    t.bigint "patient_contact_id"
    t.uuid "user_id"
    t.datetime "deleted_at", precision: nil
    t.string "patient_number", limit: 20, null: false, comment: "Formatted patient ID (FH-P-0000001) - auto-generated on insert"
    t.index ["deleted_at"], name: "idx_patients_deleted_at"
    t.index ["name", "date_of_birth", "gender"], name: "index_patients_manual_unique", unique: true, where: "((user_id IS NULL) AND (deleted_at IS NULL))"
    t.index ["patient_contact_id"], name: "index_patients_on_patient_contact_id"
    t.index ["patient_number"], name: "idx_patients_patient_number", unique: true
    t.index ["user_id", "name", "date_of_birth", "gender"], name: "index_patients_on_user_id_and_name_and_date_of_birth_and_gender", unique: true, where: "((user_id IS NOT NULL) AND (deleted_at IS NULL))"
  end

  create_table "payments", id: :uuid, default: -> { "gen_random_uuid()" }, comment: "Payment transactions from payment gateways", force: :cascade do |t|
    t.uuid "order_id", null: false
    t.string "payment_method", limit: 50, null: false
    t.string "payment_gateway", limit: 50, null: false
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.string "status", limit: 50, default: "PENDING", null: false
    t.string "gateway_transaction_id", limit: 255, comment: "Unique transaction ID from payment gateway (Xendit, Midtrans, etc.)"
    t.string "gateway_reference_id", limit: 255
    t.text "gateway_payment_url", comment: "Payment URL for customer to complete payment"
    t.text "gateway_callback_url"
    t.text "gateway_response"
    t.text "receipt_url"
    t.datetime "expires_at", precision: nil
    t.datetime "paid_at", precision: nil
    t.datetime "refunded_at", precision: nil
    t.string "customer_email", limit: 255
    t.string "customer_phone", limit: 20
    t.text "description"
    t.text "failure_reason"
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.string "bank_code", limit: 50, comment: "Bank code for bank transfer (BCA, MANDIRI, BNI, etc.)"
    t.string "ewallet_type", limit: 50, comment: "E-wallet type for e-wallet payment (GOPAY, OVO, DANA, LINKAJA, etc.)"
    t.string "payment_channel", limit: 50, comment: "Payment channel used (BCA, MANDIRI, GOPAY, OVO, QRIS, CREDIT_CARD, etc.)"
    t.string "payment_destination", limit: 100, comment: "Virtual account number for bank transfer"
    t.string "payment_method_id", limit: 100, comment: "Payment method ID from payment gateway (for e-wallet and QR code)"
    t.jsonb "payment_details", comment: "Additional payment information in JSON format (source wallet, receipt_id, etc.)"
    t.string "credit_card_token", limit: 100, comment: "Credit card token for tokenized credit card payment"
    t.string "credit_card_charge_id", limit: 100, comment: "Credit card charge ID from payment gateway"
    t.index ["bank_code"], name: "idx_payments_bank_code"
    t.index ["created_at"], name: "idx_payments_created_at", order: :desc
    t.index ["credit_card_token"], name: "idx_payments_credit_card_token"
    t.index ["ewallet_type"], name: "idx_payments_ewallet_type"
    t.index ["gateway_transaction_id"], name: "idx_payments_gateway_transaction"
    t.index ["order_id"], name: "idx_payments_order"
    t.index ["paid_at"], name: "idx_payments_paid_at", order: :desc
    t.index ["payment_channel"], name: "idx_payments_payment_channel"
    t.index ["payment_gateway"], name: "idx_payments_gateway"
    t.index ["status"], name: "idx_payments_status"
    t.check_constraint "amount > 0::numeric", name: "valid_amount"
    t.check_constraint "status::text = ANY (ARRAY['PENDING'::character varying::text, 'PROCESSING'::character varying::text, 'COMPLETED'::character varying::text, 'FAILED'::character varying::text, 'EXPIRED'::character varying::text, 'REFUNDED'::character varying::text, 'CANCELLED'::character varying::text])", name: "payments_status_check"
    t.unique_constraint ["gateway_transaction_id"], name: "payments_gateway_transaction_id_key"
  end

  create_table "reminder_histories", comment: "Tracks appointment reminder emails sent to therapists", force: :cascade do |t|
    t.uuid "therapist_id", null: false, comment: "The therapist who received the reminder"
    t.date "reminder_date", null: false, comment: "The date the appointments are for (not the date sent)"
    t.timestamptz "sent_at", default: -> { "now()" }, null: false, comment: "When the reminder was actually sent"
    t.integer "emails_sent", default: 0, null: false, comment: "Number of emails sent (usually 1)"
    t.integer "appointments", default: 0, null: false, comment: "Number of appointments in the reminder"
    t.string "status", limit: 50, default: "PENDING", null: false, comment: "PENDING, SENT, or FAILED"
    t.text "error_message", comment: "Error details if status is FAILED"
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
    t.index ["reminder_date"], name: "idx_reminder_histories_reminder_date"
    t.index ["status"], name: "idx_reminder_histories_status"
    t.index ["therapist_id", "reminder_date", "status"], name: "idx_reminder_histories_therapist_date_status"
    t.index ["therapist_id"], name: "idx_reminder_histories_therapist_id"
    t.unique_constraint ["therapist_id", "reminder_date"], name: "uq_reminder_histories_therapist_date"
  end

  create_table "reschedule_request_histories", comment: "Audit trail for all reschedule request changes - tracks who did what and when", force: :cascade do |t|
    t.uuid "reschedule_request_id", null: false
    t.string "action", limit: 50, null: false, comment: "CREATED, UPDATED, RESUBMITTED, APPROVED, REJECTED, CANCELLED"
    t.string "old_status", limit: 50
    t.string "new_status", limit: 50, null: false
    t.text "old_request_text"
    t.text "new_request_text"
    t.text "notes"
    t.uuid "changed_by", null: false
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.index ["created_at"], name: "idx_reschedule_request_histories_created_at", order: :desc
    t.index ["reschedule_request_id", "created_at"], name: "idx_reschedule_request_histories_request_time", order: { created_at: :desc }
    t.index ["reschedule_request_id"], name: "idx_reschedule_request_histories_request_id"
    t.check_constraint "action::text = ANY (ARRAY['CREATED'::character varying::text, 'UPDATED'::character varying::text, 'RESUBMITTED'::character varying::text, 'APPROVED'::character varying::text, 'REJECTED'::character varying::text, 'CANCELLED'::character varying::text])", name: "reschedule_request_histories_action_check"
  end

  create_table "reschedule_requests", id: :uuid, default: -> { "gen_random_uuid()" }, comment: "Stores customer requests to reschedule appointments with admin approval workflow", force: :cascade do |t|
    t.uuid "appointment_id", null: false
    t.text "request_text", null: false
    t.string "status", limit: 50, default: "PENDING", null: false, comment: "PENDING, APPROVED, REJECTED, CANCELLED"
    t.uuid "created_by"
    t.uuid "approved_by"
    t.text "rejected_reason"
    t.datetime "requested_new_datetime", precision: nil
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "updated_at", precision: nil, default: -> { "now()" }, null: false
    t.datetime "deleted_at", precision: nil
    t.index ["appointment_id", "created_by"], name: "idx_reschedule_requests_unique_active", unique: true, where: "((deleted_at IS NULL) AND ((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('REJECTED'::character varying)::text])))", comment: "Enforces one active (PENDING/REJECTED) request per appointment per user - forces resubmit via UPDATE"
    t.index ["appointment_id"], name: "idx_reschedule_requests_appointment_id"
    t.index ["created_at"], name: "idx_reschedule_requests_created_at", order: :desc
    t.index ["created_by"], name: "idx_reschedule_requests_created_by"
    t.index ["deleted_at"], name: "idx_reschedule_requests_deleted_at"
    t.index ["status"], name: "idx_reschedule_requests_status"
    t.check_constraint "status::text = ANY (ARRAY['PENDING'::character varying::text, 'APPROVED'::character varying::text, 'REJECTED'::character varying::text, 'CANCELLED'::character varying::text])", name: "reschedule_requests_status_check"
  end

  create_table "revoked_tokens", force: :cascade do |t|
    t.text "token", null: false
    t.datetime "expires_at", precision: nil, null: false
    t.datetime "created_at", precision: nil, null: false
    t.index ["expires_at"], name: "idx_revoked_tokens_expires_at"
    t.index ["token"], name: "idx_revoked_tokens_token"
  end

  create_table "service_credentials", id: :uuid, default: -> { "gen_random_uuid()" }, comment: "Unified service authentication for both internal services (bypass auth) and external SaaS clients (API access)", force: :cascade do |t|
    t.string "service_name", limit: 100, null: false
    t.string "service_token", limit: 255, null: false, comment: "Token for service authentication. Should be strong random string in production."
    t.string "service_type", limit: 20, default: "internal", null: false, comment: "Service type: internal (full bypass) or external (SaaS client with context)"
    t.text "description"
    t.string "client_id", limit: 100, comment: "For external clients: unique client identifier for multi-tenant isolation"
    t.string "client_name", limit: 255
    t.jsonb "client_metadata", comment: "Additional client metadata (billing tier, features, contact info, etc)"
    t.boolean "is_active", default: true, null: false
    t.integer "max_requests_per_minute", default: 1000
    t.jsonb "ip_whitelist", comment: "JSON array of allowed IP addresses/CIDR ranges. NULL allows all IPs."
    t.jsonb "allowed_endpoints", comment: "JSON array of allowed endpoint patterns. NULL allows all endpoints."
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.timestamptz "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.timestamptz "last_used_at"
    t.uuid "created_by"
    t.uuid "bound_user_id", comment: "Optional user ID to lock this service credential to a specific user. Used for external services that should only operate on behalf of one user."
    t.index ["bound_user_id"], name: "idx_service_credentials_bound_user_id", where: "(bound_user_id IS NOT NULL)"
    t.index ["client_id"], name: "idx_service_credentials_client_id", where: "(client_id IS NOT NULL)"
    t.index ["is_active", "service_name"], name: "idx_service_credentials_active"
    t.index ["service_name"], name: "idx_service_credentials_service_name", where: "(is_active = true)"
    t.index ["service_type", "is_active"], name: "idx_service_credentials_type"
    t.check_constraint "service_type::text = ANY (ARRAY['internal'::character varying::text, 'external'::character varying::text])", name: "service_credentials_service_type_check"
    t.unique_constraint ["service_name"], name: "service_credentials_service_name_key"
    t.unique_constraint ["service_token"], name: "service_credentials_service_token_key"
  end

  create_table "service_feedbacks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "patient_name", limit: 100
    t.string "patient_phone", limit: 20
    t.string "therapist_name", limit: 100
    t.integer "communication_rating", limit: 2
    t.integer "service_rating", limit: 2
    t.integer "effectiveness_rating", limit: 2
    t.integer "appearance_rating", limit: 2
    t.string "service_duration_sufficient", limit: 20
    t.text "suggestion"
    t.text "criticism"
    t.text "issue"
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false
    t.uuid "created_by", comment: "UUID of user who created the feedback (from JWT)"
    t.uuid "updated_by", comment: "UUID of user who last updated the feedback (from JWT)"
    t.datetime "updated_at", precision: nil, comment: "Timestamp when feedback was last updated"
    t.uuid "order_id"
    t.index ["created_at"], name: "idx_service_feedbacks_created_at", order: :desc
    t.index ["created_by"], name: "idx_service_feedbacks_created_by"
    t.index ["order_id"], name: "idx_service_feedbacks_order_id"
    t.check_constraint "appearance_rating >= 1 AND appearance_rating <= 5", name: "service_feedbacks_appearance_rating_check"
    t.check_constraint "communication_rating >= 1 AND communication_rating <= 5", name: "service_feedbacks_communication_rating_check"
    t.check_constraint "effectiveness_rating >= 1 AND effectiveness_rating <= 5", name: "service_feedbacks_effectiveness_rating_check"
    t.check_constraint "service_duration_sufficient::text = ANY (ARRAY['Sufficient'::character varying::text, 'Insufficient'::character varying::text])", name: "service_feedbacks_service_duration_sufficient_check"
    t.check_constraint "service_rating >= 1 AND service_rating <= 5", name: "service_feedbacks_service_rating_check"
    t.unique_constraint ["order_id"], name: "uq_service_feedbacks_order_id"
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

  create_table "solid_cable_messages", force: :cascade do |t|
    t.binary "channel", null: false
    t.binary "payload", null: false
    t.datetime "created_at", null: false
    t.bigint "channel_hash", null: false
    t.index ["channel"], name: "index_solid_cable_messages_on_channel"
    t.index ["channel_hash"], name: "index_solid_cable_messages_on_channel_hash"
    t.index ["created_at"], name: "index_solid_cable_messages_on_created_at"
  end

  create_table "solid_cache_entries", force: :cascade do |t|
    t.binary "key", null: false
    t.binary "value", null: false
    t.datetime "created_at", null: false
    t.bigint "key_hash", null: false
    t.integer "byte_size", null: false
    t.index ["byte_size"], name: "index_solid_cache_entries_on_byte_size"
    t.index ["key_hash", "byte_size"], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index ["key_hash"], name: "index_solid_cache_entries_on_key_hash", unique: true
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.string "concurrency_key", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.text "error"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "queue_name", null: false
    t.string "class_name", null: false
    t.text "arguments"
    t.integer "priority", default: 0, null: false
    t.string "active_job_id"
    t.datetime "scheduled_at"
    t.datetime "finished_at"
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.string "queue_name", null: false
    t.datetime "created_at", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.bigint "supervisor_id"
    t.integer "pid", null: false
    t.string "hostname"
    t.text "metadata"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "task_key", null: false
    t.datetime "run_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.string "key", null: false
    t.string "schedule", null: false
    t.string "command", limit: 2048
    t.string "class_name"
    t.text "arguments"
    t.string "queue_name"
    t.integer "priority", default: 0
    t.boolean "static", default: true, null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "scheduled_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.string "key", null: false
    t.integer "value", default: 1, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "sync_logs", id: :uuid, default: -> { "gen_random_uuid()" }, comment: "Tracks appointment synchronization jobs from Google Sheets or Excel file uploads. Stores job status, processing results, errors, and statistics.", force: :cascade do |t|
    t.string "source_type", limit: 20, null: false, comment: "Origin of the sync data. GOOGLE_SHEET = from Google Sheets URL, FILE_UPLOAD = from Excel file upload"
    t.string "source_url", limit: 500, comment: "Original Google Sheets URL (only for GOOGLE_SHEET type)"
    t.string "file_name", limit: 255, comment: "Original filename of uploaded Excel file (only for FILE_UPLOAD type)"
    t.string "sheet_name", limit: 255, comment: "Name of the Excel sheet that was processed. NULL means first/default sheet was used"
    t.string "status", limit: 20, default: "PENDING", null: false, comment: "Current job status: PENDING = queued, PROCESSING = running, SUCCESS = completed successfully, FAILED = completed with errors"
    t.string "r2_path", limit: 500, comment: "Storage path in Cloudflare R2 bucket where the uploaded file is stored"
    t.jsonb "error_details", comment: "JSON array of validation/processing errors. Format: [{row: 10, field: \"therapist_name\", value: \"invalid\", message: \"error description\"}]"
    t.jsonb "summary", comment: "JSON object with sync statistics. Format: {total_rows: 100, inserted: 95, skipped: 0, failed: 5, new_therapists: 2, new_patients: 10}"
    t.datetime "created_at", precision: nil, default: -> { "now()" }, null: false, comment: "Timestamp when the sync job was created/queued"
    t.datetime "completed_at", precision: nil, comment: "Timestamp when the sync job finished (either SUCCESS or FAILED). NULL if still PENDING or PROCESSING"
    t.uuid "created_by", comment: "User who initiated the sync job. NULL if user was deleted"
    t.datetime "cancelled_at", precision: nil, comment: "Timestamp when job was cancelled by user"
    t.datetime "last_heartbeat_at", precision: nil, comment: "Last heartbeat from worker, used for stale job detection"
    t.index ["created_at"], name: "idx_sync_logs_created_at", order: :desc
    t.index ["created_by"], name: "idx_sync_logs_created_by"
    t.index ["last_heartbeat_at"], name: "idx_sync_logs_processing_heartbeat", where: "((status)::text = 'PROCESSING'::text)"
    t.index ["sheet_name"], name: "idx_sync_logs_sheet_name", where: "(sheet_name IS NOT NULL)"
    t.index ["status"], name: "idx_sync_logs_status"
    t.check_constraint "source_type::text = ANY (ARRAY['GOOGLE_SHEET'::character varying::text, 'PRIVATE_GOOGLE_SHEET'::character varying::text, 'FILE_UPLOAD'::character varying::text])", name: "chk_sync_logs_source_type"
    t.check_constraint "status::text = ANY (ARRAY['PENDING'::character varying::text, 'PROCESSING'::character varying::text, 'SUCCESS'::character varying::text, 'FAILED'::character varying::text, 'CANCELLED'::character varying::text])", name: "chk_sync_logs_status"
  end

  create_table "sync_mappings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "external_id", limit: 255, null: false
    t.string "resource_type", limit: 50, null: false
    t.uuid "resource_id", null: false
    t.jsonb "source_info", default: {}
    t.timestamptz "created_at", default: -> { "now()" }
    t.timestamptz "updated_at", default: -> { "now()" }
    t.index ["external_id", "resource_type"], name: "idx_sync_mappings_lookup"
    t.index ["resource_id", "resource_type"], name: "idx_sync_mappings_resource"
  end

  create_table "sync_monolith_logs", id: :uuid, default: -> { "gen_random_uuid()" }, comment: "Audit trail for all sync operations from the monolith system", force: :cascade do |t|
    t.uuid "user_id", null: false, comment: "User who performed the sync"
    t.string "sync_type", null: false, comment: "Type of data synced (therapists, brands, etc.)"
    t.string "status", default: "running", null: false, comment: "Current status of the sync"
    t.text "ui_message", comment: "Brief message shown to users in UI"
    t.text "logger_message", comment: "Detailed message with item names and reasons"
    t.text "details", comment: "Full error stack traces or additional details"
    t.datetime "started_at", comment: "When the sync operation started"
    t.datetime "completed_at", comment: "When the sync operation completed"
    t.datetime "created_at", default: -> { "now()" }, null: false
    t.datetime "updated_at", default: -> { "now()" }, null: false
    t.index ["status"], name: "index_sync_monolith_logs_on_status"
    t.index ["sync_type"], name: "index_sync_monolith_logs_on_sync_type"
    t.index ["user_id", "created_at"], name: "index_sync_monolith_logs_on_user_id_and_created_at"
    t.index ["user_id", "sync_type"], name: "index_sync_monolith_logs_on_user_id_and_sync_type"
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
    t.integer "max_advance_booking_in_days", default: 60, null: false
    t.integer "min_booking_before_in_hours", default: 24, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "max_daily_appointments", default: 4, null: false
    t.json "availability_rules"
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
    t.virtual "therapist_type", type: :string, limit: 20, as: "\nCASE\n    WHEN (employment_type = 'KARPIS'::employment_type_enum) THEN 'internal'::text\n    WHEN (employment_type = 'FLAT'::employment_type_enum) THEN 'external'::text\n    ELSE 'external'::text\nEND", stored: true
    t.index ["modalities"], name: "index_therapists_on_modalities", using: :gin
    t.index ["phone_number"], name: "index_therapists_on_phone_number", unique: true
    t.index ["registration_number"], name: "index_therapists_on_registration_number", unique: true
    t.index ["service_id"], name: "index_therapists_on_service_id"
    t.index ["specializations"], name: "index_therapists_on_specializations", using: :gin
    t.index ["user_id"], name: "index_therapists_on_user_id"
  end

  create_table "user_addresses", comment: "User addresses relationship (similar to therapist_addresses)", force: :cascade do |t|
    t.uuid "user_id", null: false
    t.bigint "address_id", null: false
    t.boolean "active", default: false, comment: "Whether this is the active/primary address for the user"
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
    t.index ["active"], name: "idx_user_addresses_active"
    t.index ["address_id"], name: "idx_user_addresses_address_id"
    t.index ["user_id"], name: "idx_user_addresses_user_id"
  end

  create_table "user_roles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "role", limit: 50, null: false
    t.timestamptz "created_at", null: false
    t.timestamptz "updated_at", null: false
    t.timestamptz "deleted_at"
    t.index ["deleted_at"], name: "idx_user_roles_deleted_at"
    t.index ["role"], name: "idx_user_roles_role"
    t.index ["user_id"], name: "idx_user_roles_user_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.text "email", null: false
    t.text "encrypted_password", null: false
    t.text "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip", limit: 45
    t.string "last_sign_in_ip", limit: 45
    t.text "unconfirmed_email"
    t.timestamptz "created_at"
    t.timestamptz "updated_at"
    t.datetime "last_online_at"
    t.datetime "suspend_at"
    t.datetime "suspend_end"
    t.string "first_name", limit: 255, comment: "User first name (moved from customers table)"
    t.string "last_name", limit: 255, comment: "User last name (moved from customers table)"
    t.string "phone_number", limit: 50, comment: "User phone number (moved from customers table)"
    t.string "registration_source", limit: 50, comment: "Platform/channel where user registered from (e.g., WEB, MOBILE_ANDROID, MOBILE_IOS, ADMIN_PANEL). Used for acquisition analytics and tracking."
    t.index ["email"], name: "idx_users_email", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["first_name"], name: "idx_users_first_name"
    t.index ["last_name"], name: "idx_users_last_name"
    t.index ["phone_number"], name: "idx_users_phone_number"
    t.index ["registration_source"], name: "idx_users_registration_source"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "voucher_packages", force: :cascade do |t|
    t.uuid "voucher_id", null: false
    t.bigint "package_id", null: false
    t.datetime "created_at", precision: nil, null: false
    t.index ["voucher_id", "package_id"], name: "uq_voucher_packages", unique: true
  end

  create_table "voucher_usages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "voucher_id", null: false
    t.uuid "order_id", null: false
    t.uuid "user_id", null: false
    t.decimal "used_amount", precision: 10, scale: 2, null: false
    t.datetime "created_at", precision: nil, null: false
    t.index ["voucher_id", "order_id"], name: "uq_voucher_usage_order", unique: true
  end

  create_table "vouchers", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "code", limit: 50, null: false
    t.string "name", limit: 255
    t.text "description"
    t.string "discount_type", limit: 20, null: false
    t.decimal "discount_value", precision: 10, scale: 2, null: false
    t.decimal "max_discount_amount", precision: 10, scale: 2
    t.decimal "min_order_amount", precision: 10, scale: 2
    t.integer "quota", null: false
    t.integer "used_count", default: 0, null: false
    t.datetime "valid_from", precision: nil
    t.datetime "valid_until", precision: nil
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", precision: nil, null: false
    t.datetime "updated_at", precision: nil, null: false
    t.datetime "deleted_at", precision: nil
    t.index ["code"], name: "uq_vouchers_code", unique: true, where: "(deleted_at IS NULL)"
    t.index ["deleted_at"], name: "idx_vouchers_deleted_at"
  end

  add_foreign_key "addresses", "locations"
  add_foreign_key "addresses", "users", name: "fk_addresses_user_id_users", on_delete: :nullify
  add_foreign_key "admins", "users"
  add_foreign_key "appointment_address_histories", "appointments"
  add_foreign_key "appointment_address_histories", "locations"
  add_foreign_key "appointment_admins", "admins"
  add_foreign_key "appointment_admins", "appointments"
  add_foreign_key "appointment_draft_admins", "admins"
  add_foreign_key "appointment_draft_admins", "appointment_drafts"
  add_foreign_key "appointment_drafts", "admins", column: "admin_pic_id"
  add_foreign_key "appointment_drafts", "admins", column: "created_by_admin_id"
  add_foreign_key "appointment_drafts", "appointments"
  add_foreign_key "appointment_evidence_photos", "appointment_evidences", column: "evidence_id", name: "appointment_evidence_photos_evidence_id_fkey", on_delete: :cascade
  add_foreign_key "appointment_evidences", "appointments", name: "appointment_evidences_appointment_id_fkey", on_delete: :cascade
  add_foreign_key "appointment_evidences", "patients", name: "appointment_evidences_patient_id_fkey", on_delete: :cascade
  add_foreign_key "appointment_package_histories", "appointments"
  add_foreign_key "appointment_package_histories", "packages"
  add_foreign_key "appointment_reviews", "appointments", name: "fk_appointment_reviews_appointment", on_delete: :cascade
  add_foreign_key "appointment_reviews", "users", name: "fk_appointment_reviews_user", on_delete: :cascade
  add_foreign_key "appointment_soaps", "appointments", name: "appointment_soaps_appointment_id_fkey", on_delete: :cascade
  add_foreign_key "appointment_soaps", "therapists", name: "appointment_soaps_therapist_id_fkey", on_delete: :cascade
  add_foreign_key "appointment_status_histories", "appointments"
  add_foreign_key "appointments", "appointments", column: "appointment_reference_id"
  add_foreign_key "appointments", "locations"
  add_foreign_key "appointments", "packages"
  add_foreign_key "appointments", "patients"
  add_foreign_key "appointments", "services"
  add_foreign_key "appointments", "therapists"
  add_foreign_key "booking_drafts", "users", name: "booking_drafts_user_id_fkey", on_delete: :cascade
  add_foreign_key "location_services", "locations"
  add_foreign_key "location_services", "services"
  add_foreign_key "order_details", "appointments", name: "order_details_appointment_id_fkey", on_delete: :nullify
  add_foreign_key "order_details", "orders", name: "order_details_order_id_fkey", on_delete: :cascade
  add_foreign_key "orders", "booking_drafts", name: "orders_booking_draft_id_fkey", on_delete: :nullify
  add_foreign_key "orders", "packages", name: "orders_package_id_fkey"
  add_foreign_key "orders", "patients", name: "orders_patient_id_fkey"
  add_foreign_key "packages", "services"
  add_foreign_key "patient_addresses", "addresses"
  add_foreign_key "patient_addresses", "patients"
  add_foreign_key "patient_medical_records", "appointments"
  add_foreign_key "patients", "users", name: "patients_user_id_fkey"
  add_foreign_key "payments", "orders", name: "payments_order_id_fkey", on_delete: :cascade
  add_foreign_key "reminder_histories", "therapists", name: "fk_reminder_histories_therapist", on_delete: :cascade
  add_foreign_key "reschedule_request_histories", "reschedule_requests", name: "fk_reschedule_request_histories_request", on_delete: :cascade
  add_foreign_key "reschedule_request_histories", "users", column: "changed_by", name: "fk_reschedule_request_histories_changed_by", on_delete: :nullify
  add_foreign_key "reschedule_requests", "appointments", name: "fk_reschedule_requests_appointment", on_delete: :cascade
  add_foreign_key "reschedule_requests", "users", column: "approved_by", name: "fk_reschedule_requests_approved_by", on_delete: :nullify
  add_foreign_key "reschedule_requests", "users", column: "created_by", name: "fk_reschedule_requests_created_by", on_delete: :nullify
  add_foreign_key "service_credentials", "users", column: "bound_user_id", name: "service_credentials_bound_user_id_fkey", on_delete: :nullify
  add_foreign_key "service_credentials", "users", column: "created_by", name: "service_credentials_created_by_fkey", on_delete: :nullify
  add_foreign_key "service_feedbacks", "orders", name: "fk_service_feedbacks_order", on_delete: :cascade
  add_foreign_key "service_feedbacks", "users", column: "created_by", name: "service_feedbacks_created_by_fkey", on_delete: :nullify
  add_foreign_key "service_feedbacks", "users", column: "updated_by", name: "service_feedbacks_updated_by_fkey", on_delete: :nullify
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "sync_logs", "users", column: "created_by", name: "sync_logs_created_by_fkey", on_delete: :nullify
  add_foreign_key "sync_monolith_logs", "users", on_delete: :cascade
  add_foreign_key "therapist_addresses", "addresses"
  add_foreign_key "therapist_addresses", "therapists"
  add_foreign_key "therapist_adjusted_availabilities", "therapist_appointment_schedules"
  add_foreign_key "therapist_appointment_schedules", "therapists"
  add_foreign_key "therapist_bank_details", "bank_details"
  add_foreign_key "therapist_bank_details", "therapists"
  add_foreign_key "therapist_documents", "therapists"
  add_foreign_key "therapist_weekly_availabilities", "therapist_appointment_schedules"
  add_foreign_key "therapists", "users", name: "therapists_user_id_fkey", on_update: :cascade, on_delete: :cascade
  add_foreign_key "user_addresses", "addresses", name: "user_addresses_address_id_fkey", on_delete: :cascade
  add_foreign_key "user_addresses", "users", name: "fk_users_addresses"
  add_foreign_key "user_addresses", "users", name: "user_addresses_user_id_fkey", on_delete: :cascade
  add_foreign_key "user_roles", "users", name: "fk_users_roles"
  add_foreign_key "user_roles", "users", name: "user_roles_user_id_fkey", on_update: :cascade, on_delete: :cascade
  add_foreign_key "voucher_packages", "packages", name: "fk_voucher_packages_package", on_delete: :cascade
  add_foreign_key "voucher_packages", "vouchers", name: "fk_voucher_packages_voucher", on_delete: :cascade
  add_foreign_key "voucher_usages", "orders", name: "fk_voucher_usages_order"
  add_foreign_key "voucher_usages", "vouchers", name: "fk_voucher_usages_voucher"
end
