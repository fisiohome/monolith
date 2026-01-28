require "test_helper"

class AppointmentTest < ActiveSupport::TestCase
  def setup
    @service = services(:fisiohome_special_tier)
    @user = User.create!(email: "rina@example.com", password: "password")
    @therapist = therapists(:therapist_one)
    @patient_contact = PatientContact.create!(
      contact_name: "Budi",
      contact_phone: "6289172818",
      email: "budi@yopmail.com"
    )
    @patient = Patient.create!(
      name: "Budi",
      date_of_birth: "2000-01-01",
      gender: "MALE",
      patient_contact: @patient_contact
    )
    @package = Package.create!(
      service: @service,
      name: "Paket 1",
      currency: "IDR",
      number_of_visit: 1,
      price_per_visit: 100_000,
      total_price: 100_000,
      fee_per_visit: 70_000,
      total_fee: 70_000,
      active: true
    )
    @location = Location.create!(
      country: "Indonesia",
      country_code: "ID",
      state: "Jakarta",
      city: "Jakarta"
    )
    @schedule = TherapistAppointmentSchedule.create!(
      therapist: @therapist,
      appointment_duration_in_minutes: 60,
      buffer_time_in_minutes: 15,
      max_daily_appointments: 4,
      available_now: true
    )
    @future_time = 2.days.from_now
    @patient_medical_record = {
      complaint_description: "Shoulder pain",
      illness_onset_date: "2 weeks ago",
      condition: "NORMAL",
      medical_history: "just flu"
    }
  end

  test "blocks a 5th appointment for a therapist with informative error, about max_daily_appointments" do
    @patient_contacts = []
    @patients = []
    4.times do |i|
      contact = PatientContact.create!(contact_name: "Patient#{i}", contact_phone: "6289172123#{i}", email: "patient#{i}@yopmail.com")
      @patient_contacts << contact
      @patients << Patient.create!(name: "Patient#{i}", date_of_birth: "2000-01-01", gender: "MALE", patient_contact: contact)
    end

    4.times do |i|
      Appointment.create!(
        therapist: @therapist,
        patient: @patients[i], # again, different patients
        service: @service,
        package: @package,
        location: @location,
        appointment_date_time: @future_time.change(hour: 8 + i),
        preferred_therapist_gender: "NO PREFERENCE"
      )
    end

    # 5th appointment, another patient
    new_patient_contact = PatientContact.create!(contact_name: "Overflow", contact_phone: "628917212321", email: "overflow@yopmail.com")
    new_patient = Patient.create!(name: "Overflow", date_of_birth: "2000-01-01", gender: "MALE", patient_contact: new_patient_contact)
    appt = Appointment.new(
      therapist: @therapist,
      patient: new_patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 14),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    assert_equal 4, Appointment.where(therapist: @therapist, appointment_date_time: @future_time.all_day).count

    assert_not appt.valid?
    assert_includes appt.errors[:base].join, "already assigned 4 appointments"
    assert_includes appt.errors[:base].join, "Please choose another day"
  end

  test "does not allow appointments in the past, about appointment_date_time_in_the_future" do
    appt = Appointment.new(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: 1.day.ago,
      preferred_therapist_gender: "NO PREFERENCE"
    )
    assert_not appt.valid?
    assert_includes appt.errors[:appointment_date_time], "must be in the future"
  end

  test "validates uniqueness of registration_number and visit_number combination" do
    multi_visit_package = Package.create!(
      service: @service,
      name: "Paket 2 Kunjungan",
      currency: "IDR",
      number_of_visit: 2,
      price_per_visit: 100_000,
      total_price: 200_000,
      fee_per_visit: 70_000,
      total_fee: 140_000,
      active: true
    )
    # First appointment is valid
    first_appt = Appointment.create!(
      patient: @patient,
      service: @service,
      package: multi_visit_package,
      location: @location,
      registration_number: "UNIQUE_REG",
      visit_number: 1,
      appointment_date_time: @future_time.change(hour: 10),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # Duplicate registration_number and visit_number is invalid
    duplicate_appt = Appointment.new(
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      registration_number: "UNIQUE_REG",
      visit_number: 1,
      appointment_date_time: @future_time.change(hour: 12),
      preferred_therapist_gender: "NO PREFERENCE"
    )
    assert_not duplicate_appt.valid?
    assert_includes duplicate_appt.errors[:registration_number], "has already been taken"

    # Same registration_number but different visit_number is valid
    series_appt = Appointment.new(
      patient: @patient,
      service: @service,
      package: multi_visit_package,
      location: @location,
      registration_number: "UNIQUE_REG",
      visit_number: 2,
      appointment_date_time: @future_time.change(hour: 14),
      preferred_therapist_gender: "NO PREFERENCE",
      appointment_reference_id: first_appt.id
    )
    assert series_appt.valid?
  end

  test "auto-generates a registration_number if none is provided, about generate_registration_number" do
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      # note: no registration_number
      appointment_date_time: @future_time.change(hour: 9),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # Should be SERVICECODE-XXXXXX (6 digits)
    assert_match(/\A#{@service.code.upcase}-\d{6}\z/, appt.registration_number)
  end

  test "prevents overlapping appointments for the same patient, about no_overlapping_appointments" do
    # Existing appointment: 10:00-11:00
    Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 10),
      preferred_therapist_gender: "NO PREFERENCE"
    )
    # Try overlapping: 10:30-11:30
    appt = Appointment.new(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 10, min: 30),
      preferred_therapist_gender: "NO PREFERENCE"
    )
    assert_not appt.valid?
    assert_includes appt.errors[:appointment_date_time].join, "overlaps with"
  end

  test "prevents duplicate appointment time for the same patient, about no_duplicate_appointment_time" do
    # first appointment at 9am
    Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 9),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # second one exactly same time
    appt = Appointment.new(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 9),
      preferred_therapist_gender: "NO PREFERENCE"
    )
    assert_not appt.valid?
    assert_includes appt.errors[:appointment_date_time].join, "already has an appointment"
  end

  test "initial visit must have an appointment date/time, about initial_visit_requirements" do
    appt = Appointment.new(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      preferred_therapist_gender: "NO PREFERENCE"
      # note: no appointment_date_time
    )
    assert_not appt.valid?
    assert_includes appt.errors[:appointment_date_time], "must be present for initial visit"
  end

  test "start_time and end_time return the correctly formatted strings, about return start_time and end_time" do
    # given 60min duration + 15min buffer
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 8, min: 5),
      preferred_therapist_gender: "NO PREFERENCE"
    )
    # starts at 08:05, ends at 09:20
    assert_equal "08:05", appt.start_time
    assert_equal "09:20", appt.end_time
  end

  test "total_duration_minutes returns correct sum of duration and buffer, about return total_duration_minutes" do
    sched = @therapist.therapist_appointment_schedule
    expected = sched.appointment_duration_in_minutes + sched.buffer_time_in_minutes
    appt = Appointment.new(therapist: @therapist)
    assert_equal expected, appt.total_duration_minutes
  end

  test "preferred therapist gender OTHER normalizes to NO PREFERENCE" do
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 9),
      preferred_therapist_gender: "OTHER"
    )

    assert_equal "NO PREFERENCE", appt.preferred_therapist_gender
  end

  test "requires a therapist when marking an appointment paid, about validate_paid_requires_therapist" do
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 11),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # simulate a paid-reschedule: drop therapist and flip to paid
    appt.therapist = nil
    appt.status = "paid"
    appt.valid?  # trigger validations

    assert_includes appt.errors[:therapist_id], "must be selected when rescheduling a paid appointment"
  end

  test "visit_number cannot exceed package's total visits, about validate_visit_sequence" do
    small_pkg = Package.create!(
      service: @service,
      name: "Small Pack",
      currency: "IDR",
      number_of_visit: 2,
      price_per_visit: 50_000,
      total_price: 100_000,
      fee_per_visit: 35_000,
      total_fee: 70_000,
      active: true
    )
    appt = Appointment.new(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: small_pkg,
      location: @location,
      visit_number: 3,
      appointment_date_time: @future_time.change(hour: 9),
      preferred_therapist_gender: "NO PREFERENCE"
    )
    assert_not appt.valid?
    assert_includes appt.errors[:visit_number], "exceeds package's total visits of 2"
  end

  test "initial visit automatically spawns unscheduled series appointments, about create_series_appointments" do
    # ─── Setup a 3-visit package ──────────────────────────────────────────────────
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      currency: "IDR",
      number_of_visit: 3,
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )

    # ─── Create the FIRST visit (visit_number defaults to 1) ─────────────────────
    first_visit = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time.change(hour: 9),
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      skip_auto_series_creation: false
    )

    # ─── Expectations ────────────────────────────────────────────────────────────
    assert_equal 2, first_visit.series_appointments.count, "should create two follow-up visits"

    assert first_visit.series_appointments.all? { |c| c.registration_number == first_visit.registration_number },
      "all series appointments should have the same registration number as the initial visit"

    visit_numbers = first_visit.series_appointments.order(:visit_number).pluck(:visit_number)
    assert_equal [2, 3], visit_numbers, "follow-ups should be visit #2 and #3"

    assert first_visit.series_appointments.all?(&:unscheduled?), "each child should start UNSCHEDULED"
    assert first_visit.series_appointments.all? { |c| c.appointment_reference_id == first_visit.id },
      "each child should point back to the initial visit"

    # every child gets a stubbed or copied medical record
    assert first_visit.series_appointments.all? { |c| c.patient_medical_record.present? },
      "each child visit should have its own medical record"
  end

  test "requires other_referral_source if referral_source is 'Other', about referral_source and other_referral_source validation" do
    # 1. A normal scenario should be valid (referral_source != "Other")
    normal_appt = Appointment.new(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 9),
      preferred_therapist_gender: "NO PREFERENCE",
      referral_source: "Instagram"    # Not "Other"
    )
    assert normal_appt.valid?, "Appointment should be valid when referral_source != 'Other'"

    # 2. If referral_source is "Other", then other_referral_source is required
    other_appt = Appointment.new(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 10),
      preferred_therapist_gender: "NO PREFERENCE",
      referral_source: "Other"        # Must fill in other_referral_source
    )
    assert_not other_appt.valid?
    assert_includes other_appt.errors[:other_referral_source], "can't be blank"

    # 3. Fix it by providing other_referral_source
    other_appt.other_referral_source = "Google Ads"
    assert other_appt.valid?, "Appointment should be valid once other_referral_source is set"
  end

  test "validates Fisiohome partner booking requirements, about fisiohome_partner_name and other_fisiohome_partner_name validation" do
    # Scenario 1: Valid when partner booking is false (default)
    appt = Appointment.new(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time.change(hour: 9),
      preferred_therapist_gender: "NO PREFERENCE",
      fisiohome_partner_booking: false
    )
    assert appt.valid?, "Should be valid when not a partner booking"

    # Scenario 2: Invalid when partner booking is true but no partner selected
    appt.fisiohome_partner_booking = true
    assert_not appt.valid?
    assert_includes appt.errors[:fisiohome_partner_name], "is not included in the list"

    # Scenario 3: Valid with partner name from list
    appt.fisiohome_partner_name = "Cosmart"
    assert appt.valid?, "Should accept valid partner name"

    # Scenario 4: Requires 'other' name when partner is 'Other'
    appt.fisiohome_partner_name = "Other"
    assert_not appt.valid?
    assert_includes appt.errors[:other_fisiohome_partner_name], "can't be blank"

    # Scenario 5: Valid with 'Other' and explanation
    appt.other_fisiohome_partner_name = "HealthPlus Clinic"
    assert appt.valid?, "Should accept 'Other' with explanation"
  end

  test "snapshots package_history on create, about snapshot_package_history" do
    # create the appointment (no explicit history yet)
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      # we omit registration_number to let the callback generate it
      appointment_date_time: @future_time.change(hour: 10),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # it should have created exactly one package_history
    ph = appt.package_history
    assert_not_nil ph, "expected a package_history record to be created"

    # and its fields should match the package at creation time
    assert_equal @package.id, ph.package_id
    assert_equal @package.name, ph.name
    assert_equal @package.currency, ph.currency
    assert_equal @package.number_of_visit, ph.number_of_visit
    assert_equal @package.price_per_visit, ph.price_per_visit
    assert_nil @package.discount, "Expected package discount to be nil"
    assert_nil ph.discount, "Expected package history discount to be nil"
    assert_equal @package.total_price, ph.total_price
    assert_equal @package.fee_per_visit, ph.fee_per_visit
    assert_equal @package.total_fee, ph.total_fee
  end

  test "allows valid status transitions, about valid_status_transition" do
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      status: :pending_patient_approval
    )

    assert appt.update(status: :pending_payment)
    assert appt.update(status: :paid)
    assert appt.update(status: :cancelled)
  end

  test "cancelling the initial visit cascades to every series appointment, about cascade_cancellation" do
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      currency: "IDR",
      number_of_visit: 3,
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )
    first_visit = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user,
      skip_auto_series_creation: false
    )

    # ── Sanity check ────────────────────────────────────────────────────────────
    assert_equal 2, first_visit.series_appointments.count, "setup should have spawned two child visits"
    assert first_visit.series_appointments.all?(&:unscheduled?), "children start UNSCHEDULED"

    # ── Perform the cancellation ───────────────────────────────────────────────
    first_visit.status_reason = "Patient requested"
    first_visit.updater = @user
    assert first_visit.cancel!, "initial visit cancellation should succeed"

    # ── Expectations ───────────────────────────────────────────────────────────
    first_visit.reload
    assert_equal "cancelled", first_visit.status

    first_visit.series_appointments.each do |child|
      child.reload
      assert_equal "cancelled", child.status, "series visit #{child.visit_number} should also be cancelled"
      assert_equal first_visit.id, child.appointment_reference_id, "child should still point to its root"
    end
  end

  test "assign_therapist! moves UNSCHEDULED → PENDING PATIENT APPROVAL and records history, about assign_therapist!" do
    first_visit = Appointment.create!(
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user
    )

    # sanity check
    assert_equal "pending_therapist_assignment", first_visit.status

    # fill in the scheduling data exactly as ops would
    first_visit.therapist = @therapist
    first_visit.appointment_date_time = 3.days.from_now.change(hour: 10)
    first_visit.status_reason = "Therapist assigned by OPS"
    first_visit.updater = @user

    assert_difference "AppointmentStatusHistory.count", 1 do
      assert first_visit.assign_therapist!, "method should succeed when therapist & time are present"
    end

    # expectations
    first_visit.reload
    assert_equal "pending_patient_approval", first_visit.status

    last_history = first_visit.status_histories.order(:created_at).last
    assert_equal "PENDING THERAPIST ASSIGNMENT", last_history.old_status
    assert_equal "PENDING PATIENT APPROVAL", last_history.new_status
    assert_equal @user.id, last_history.changed_by
    assert_equal "Therapist assigned by OPS", last_history.reason
  end

  test "a series visit cannot advance to a status that is ahead of its root, about series_status_cannot_outpace_root" do
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      currency: "IDR",
      number_of_visit: 3,
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )
    first_visit = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user,
      skip_auto_series_creation: false
    )

    # sanity check
    child = first_visit.series_appointments.order(:visit_number).first
    assert child.unscheduled?, "child should start UNSCHEDULED"

    # Try to move the child to PENDING PATIENT APPROVAL (allowed transition from UNSCHEDULED)
    child.assign_attributes(
      status: :pending_patient_approval,
      therapist: @therapist,
      appointment_date_time: 4.days.from_now.change(hour: 10),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    assert_not child.valid?, "validation should fail because root is still PENDING THERAPIST ASSIGNMENT"
    assert_includes child.errors[:status].join,
      "cannot be ahead of first visit (#{first_visit.registration_number}) status (Awaiting Therapist)",
      "error message should mention the root appointment"
  end

  test "initial visit cannot be moved to a date later than any series visit, about validate_initial_visit_position" do
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      currency: "IDR",
      number_of_visit: 3,
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )
    first_visit = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      therapist: @therapist,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user,
      skip_auto_series_creation: false
    )

    # sanity check
    assert_equal "pending_patient_approval", first_visit.status

    # update the series appointment to pending patient approval as well
    child = first_visit.series_appointments.order(:visit_number).first
    child.update!(
      status: :pending_patient_approval,
      therapist: @therapist,
      appointment_date_time: 4.days.from_now.change(hour: 10),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # Try to reschedule the first visit *after* its series visit
    first_visit.appointment_date_time = 5.days.from_now.change(hour: 11)

    assert_not first_visit.valid?, "validation should fail when first visit is moved beyond a series visit"

    # Error must reference the offending child appointment
    msg = first_visit.errors[:appointment_date_time].join
    assert_includes msg, "must occur before any another visit series (#{child.registration_number})",
      "message should mention the child registration number"
  end

  test "formatted_discount and formatted_total_price work as expected, about formatted_discount and formatted_total_price" do
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE"
    )

    assert_equal "IDR 100,000.00", appt.formatted_total_price
    assert_equal "IDR 0.00", appt.formatted_discount
  end

  test "visit_progress returns visit number out of total, about visit_progress" do
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      visit_number: 1,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE"
    )

    assert_equal "1/1", appt.visit_progress
  end

  test "series_completion returns completed visits over total, about series_completion" do
    pkg = Package.create!(service: @service, name: "Series", number_of_visit: 3, currency: "IDR", price_per_visit: 1, total_price: 3, fee_per_visit: 1, total_fee: 3, active: true)

    initial = Appointment.create!(
      patient: @patient,
      service: @service,
      package: pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record
    )
    assert_equal "0/2", initial.series_completion
  end

  test "next_available_visit_number returns next number if valid, about next_available_visit_number" do
    pkg = Package.create!(service: @service, name: "Series", number_of_visit: 3, currency: "IDR", price_per_visit: 1, total_price: 3, fee_per_visit: 1, total_fee: 3, active: true)

    initial = Appointment.create!(
      patient: @patient,
      service: @service,
      package: pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record
    )

    assert_equal 2, initial.next_available_visit_number
  end

  test "next_visit_progress returns correct format or nil, about next_visit_progress" do
    pkg = Package.create!(service: @service, name: "Series", number_of_visit: 3, currency: "IDR", price_per_visit: 1, total_price: 3, fee_per_visit: 1, total_fee: 3, active: true)

    initial = Appointment.create!(
      patient: @patient,
      service: @service,
      package: pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record
    )

    assert_equal "2/3", initial.next_visit_progress
  end

  test "needs_scheduling? returns true only when unscheduled with no date, about needs_scheduling?" do
    appt = Appointment.new(status: :unscheduled, appointment_date_time: nil)
    assert appt.needs_scheduling?
  end

  test "series_available? returns true when package has multiple visits, about series_available?" do
    pkg = Package.new(number_of_visit: 3)
    appt = Appointment.new(package: pkg)
    assert appt.series_available?
  end

  test "status_human_readable returns correct hash, about status_human_readable" do
    appt = Appointment.new(status: :paid)
    assert_equal "Confirmed", appt.status_human_readable[:name]
  end

  test "all_visits_in_series returns full set sorted, about all_visits_in_series" do
    triple_pkg = Package.create!(
      service: @service,
      name: "Series3",
      number_of_visit: 3,
      currency: "IDR",
      price_per_visit: 1,
      total_price: 3,
      fee_per_visit: 1,
      total_fee: 3,
      active: true
    )
    initial = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      skip_auto_series_creation: false
    )

    all_visits = initial.all_visits_in_series
    assert_equal 3, all_visits.length
    assert_equal 1, all_visits.first.visit_number
    assert_equal [2, 3], all_visits.drop(1).map(&:visit_number)
  end

  test "cancellable? returns true for initial or if parent cancelled, about cancellable?" do
    appt = Appointment.new(visit_number: 1)
    assert appt.initial_visit?
    assert appt.cancellable?

    parent = Appointment.create!(
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE"
    )
    parent.cancel!

    series = Appointment.new(reference_appointment: parent, visit_number: 2)
    assert series.cancellable?
  end

  test "patient_approve! updates status and records history" do
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      updater: @user,
      status_reason: "Patient agreed",
      patient_medical_record_attributes: @patient_medical_record
    )

    assert appt.patient_approve!
    assert_equal "pending_payment", appt.reload.status
  end

  test "mark_paid! updates status and records history" do
    appt = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      updater: @user,
      status_reason: "Paid by QRIS",
      patient_medical_record_attributes: @patient_medical_record
    )
    appt.patient_approve!

    assert appt.mark_paid!
    assert_equal "paid", appt.reload.status
  end

  test "series appointment must match package and patient of reference, about validate_series_requirements" do
    initial = Appointment.create!(
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record
    )

    # Different package & patient
    other_patient_contact = PatientContact.create!(contact_name: "Other", contact_phone: "62891721231", email: "other@yopmail.com")
    other_patient = Patient.create!(name: "Other", date_of_birth: "2000-01-01", gender: "FEMALE", patient_contact: other_patient_contact)
    other_package = Package.create!(
      service: @service, name: "Different", currency: "IDR", number_of_visit: 1,
      price_per_visit: 100_000, total_price: 100_000, fee_per_visit: 70_000, total_fee: 70_000, active: true
    )

    series = Appointment.new(
      reference_appointment: initial,
      patient: other_patient,
      package: other_package,
      service: @service,
      location: @location,
      visit_number: 2,
      appointment_date_time: @future_time + 1.day,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record
    )

    assert_not series.valid?
    assert_includes series.errors[:package_id], "must match reference appointment's package"
    assert_includes series.errors[:patient_id], "must match reference appointment's patient"
  end

  test "unscheduled appointment must not have therapist or appointment_date_time, about unscheduled_appointment_requirements" do
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      currency: "IDR",
      number_of_visit: 3,
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )
    first_visit = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      therapist: @therapist,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user,           # <- will be copied to histories
      skip_auto_series_creation: false
    )

    # sanity check
    assert_equal "pending_patient_approval", first_visit.status
    child = first_visit.series_appointments.order(:visit_number).first
    child.update!(
      status: :pending_patient_approval,
      therapist: @therapist,
      appointment_date_time: 4.days.from_now.change(hour: 10),
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # Now make it invalid by assigning status :unscheduled but keeping the other fields
    child.assign_attributes(status: :unscheduled)
    assert_not child.valid?
    assert_includes child.errors[:appointment_date_time], "must be blank for unscheduled appointments"
    assert_includes child.errors[:therapist_id], "cannot be assigned to unscheduled appointments"
  end

  test "blocks invalid status transitions for non-superadmin users, about valid_status_transition edge case" do
    appt = Appointment.create!(
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # Try jumping to "paid" from pending_therapist_assignment
    appt.status = "paid"
    appt.valid?  # should trigger validation

    assert_includes appt.errors[:status], "invalid transition from Awaiting Therapist to Confirmed"
  end

  test "valid_for_scheduling? returns true only when time and therapist present, about valid_for_scheduling?" do
    appt = Appointment.new
    assert_not appt.send(:valid_for_scheduling?)  # should be private

    appt.therapist = @therapist
    assert_not appt.send(:valid_for_scheduling?)

    appt.appointment_date_time = @future_time
    assert appt.send(:valid_for_scheduling?)
  end

  test "next_visits returns the next visit in series, about next_visits" do
    pkg = Package.create!(service: @service, name: "Series", number_of_visit: 3, currency: "IDR", price_per_visit: 1, total_price: 3, fee_per_visit: 1, total_fee: 3, active: true)

    first = Appointment.create!(
      patient: @patient,
      service: @service,
      package: pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record
    )

    second = first.series_appointments.find_by(visit_number: 2)
    assert_nil second
    assert_nil first.next_visits
  end

  test "series visit must be after initial and before next, about validate_series_visit_position" do
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      currency: "IDR",
      number_of_visit: 3,
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )
    initial = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      therapist: @therapist,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      skip_auto_series_creation: false
    )

    # manually schedule 3rd visit
    third = initial.series_appointments.find_by(visit_number: 3)
    third.update!(
      appointment_date_time: @future_time + 5.days,
      therapist: @therapist,
      status: :pending_patient_approval,
      status_reason: "reschedule",
      updater: @user
    )

    # set 2nd visit after 3rd → should be invalid
    second = initial.series_appointments.find_by(visit_number: 2)
    second.appointment_date_time = @future_time + 6.days
    second.therapist = @therapist
    second.status = :pending_patient_approval

    assert_not second.valid?
    assert_includes second.errors[:appointment_date_time].join, "must be before visit 3"
  end

  test "min_datetime and max_datetime return correct bounds for series visits, about min_datetime and max_datetime" do
    # ─── Setup a 3-visit package ────────────────────────────────────────────────
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Series",
      currency: "IDR",
      number_of_visit: 3,
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )

    # ─── Create the FIRST visit at a known time ─────────────────────────────────
    t0 = @future_time.change(hour: 9)
    first = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      therapist: @therapist,
      appointment_date_time: t0,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      skip_auto_series_creation: false
    )

    # ─── Grab the auto-built series appointments ────────────────────────────────
    second = first.series_appointments.find_by(visit_number: 2)
    third = first.series_appointments.find_by(visit_number: 3)

    # ─── Schedule them at t1 = t0 + 1.day, t2 = t0 + 2.days ────────────────────
    t1 = t0 + 1.day
    t2 = t0 + 2.days

    [second, third].each do |appt|
      appt.update!(
        therapist: @therapist,
        appointment_date_time: ((appt.visit_number == 2) ? t1 : t2),
        status: :pending_patient_approval,
        preferred_therapist_gender: "NO PREFERENCE"
      )
    end

    # ─── Assertions for the model helpers ───────────────────────────────────────
    # First visit: no previous, next is the 2nd
    assert_nil first.min_datetime
    assert_equal t1, first.max_datetime

    # Second visit: prev is first, next is third
    assert_equal t0, second.min_datetime
    assert_equal t2, second.max_datetime

    # Third visit: prev is second, no next
    assert_equal t1, third.min_datetime
    assert_nil third.max_datetime
  end

  test "hold! puts a series appointment on hold and cascades to other appointments in series" do
    # Create a package with multiple visits
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      number_of_visit: 3,
      currency: "IDR",
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )

    # Create an initial appointment with auto-created series
    initial = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user,
      skip_auto_series_creation: false
    )

    # Ensure series appointments were created
    series_appointments = initial.series_appointments
    assert_equal 2, series_appointments.count

    # Schedule the second appointment
    second_appt = series_appointments.find_by(visit_number: 2)
    second_appt.update!(
      appointment_date_time: @future_time + 1.week,
      therapist: @therapist,
      status: :pending_patient_approval
    )

    # Put the second appointment on hold
    assert second_appt.hold!

    # Verify the second appointment is on hold and details are cleared
    second_appt.reload
    assert_equal "on_hold", second_appt.status
    assert_nil second_appt.appointment_date_time
    assert_nil second_appt.therapist_id

    # Verify the third appointment is also on hold
    third_appt = series_appointments.find_by(visit_number: 3)
    third_appt.reload
    assert_equal "on_hold", third_appt.status

    # Verify the initial appointment is NOT on hold (remains in its original status)
    initial.reload
    assert_not_equal "on_hold", initial.status
  end

  test "cascade_hold only affects series visits with visit_number > 1 and not paid status" do
    # Create a package with 3 visits
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      currency: "IDR",
      number_of_visit: 3,
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )

    # Create initial visit
    first_visit = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      therapist: @therapist,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user,
      skip_auto_series_creation: false
    )
    first_visit.update!(status: :pending_payment)
    first_visit.update!(status: :paid)
    first_visit.update!(status: :completed)

    # Get series visits
    second_visit = first_visit.series_appointments.find_by(visit_number: 2)
    third_visit = first_visit.series_appointments.find_by(visit_number: 3)

    # Set up the second visit as completed
    second_visit.update!(
      status: :pending_patient_approval,
      therapist: @therapist,
      appointment_date_time: @future_time + 2.days,
      preferred_therapist_gender: "NO PREFERENCE"
    )
    second_visit.update!(status: :pending_payment)
    second_visit.update!(status: :paid)
    second_visit.update!(status: :completed)

    # Set up the third visit as pending
    third_visit.update!(
      status: :pending_patient_approval,
      therapist: @therapist,
      appointment_date_time: @future_time + 4.days,
      preferred_therapist_gender: "NO PREFERENCE"
    )

    # Put hold from first visit which should change on hold to all non-paid series visits
    first_visit.hold!

    # Reload all appointments to get updated statuses
    first_visit.reload
    second_visit.reload
    third_visit.reload

    # First visit should remain on hold
    assert_equal "completed", first_visit.status, "First visit should remain completed"

    # Second visit should remain paid (not affected by cascade)
    assert_equal "completed", second_visit.status, "Second visit should remain completed"

    # Third visit should be changed to on hold
    assert_equal "on_hold", third_visit.status, "Third visit should be changed to on hold"
  end

  test "on_hold appointments have their appointment_date_time and therapist_id cleared" do
    # Create a package with multiple visits
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      number_of_visit: 3,
      currency: "IDR",
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )

    # Create an initial appointment with auto-created series
    initial = Appointment.create!(
      therapist: @therapist,
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user,
      skip_auto_series_creation: false
    )

    # Schedule the second appointment
    second_appt = initial.series_appointments.find_by(visit_number: 2)
    second_appt.update!(
      appointment_date_time: @future_time + 1.week,
      therapist: @therapist,
      status: :pending_patient_approval
    )

    # Verify it has appointment_date_time and therapist_id
    assert_not_nil second_appt.appointment_date_time
    assert_not_nil second_appt.therapist_id

    # Update status to on_hold directly
    second_appt.update(status: :on_hold)

    # Verify appointment_date_time and therapist_id are cleared
    second_appt.reload
    assert_nil second_appt.appointment_date_time
    assert_nil second_appt.therapist_id
  end

  test "unscheduled appointments can be put on hold" do
    # Create a package with multiple visits
    triple_pkg = Package.create!(
      service: @service,
      name: "3-Visit Bundle",
      number_of_visit: 3,
      currency: "IDR",
      price_per_visit: 100_000,
      total_price: 300_000,
      fee_per_visit: 70_000,
      total_fee: 210_000,
      active: true
    )

    # Create an initial appointment with auto-created series
    initial = Appointment.create!(
      patient: @patient,
      service: @service,
      package: triple_pkg,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE",
      patient_medical_record_attributes: @patient_medical_record,
      updater: @user,
      skip_auto_series_creation: false
    )

    # Get the third appointment (which should be unscheduled)
    third_appt = initial.series_appointments.find_by(visit_number: 3)
    assert_equal "unscheduled", third_appt.status

    # Put it on hold
    assert third_appt.hold!

    # Verify it's now on hold
    third_appt.reload
    assert_equal "on_hold", third_appt.status
  end

  test "generates incremental registration_number" do
    # First appointment for a service
    appt1 = Appointment.create!(
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time,
      preferred_therapist_gender: "NO PREFERENCE"
    )
    assert_equal "#{@service.code.upcase}-000001", appt1.registration_number

    # Second appointment for the same service
    appt2 = Appointment.create!(
      patient: @patient,
      service: @service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time + 1.hour,
      preferred_therapist_gender: "NO PREFERENCE"
    )
    assert_equal "#{@service.code.upcase}-000002", appt2.registration_number

    # Appointment for a different service
    other_service = Service.create!(name: "Other Service", code: "OTH", active: true)
    appt3 = Appointment.create!(
      patient: @patient,
      service: other_service,
      package: @package,
      location: @location,
      appointment_date_time: @future_time + 2.hours,
      preferred_therapist_gender: "NO PREFERENCE"
    )
    assert_equal "#{other_service.code.upcase}-000001", appt3.registration_number
  end
end
