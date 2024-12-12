require "application_system_test_case"

class TherapistsTest < ApplicationSystemTestCase
  setup do
    @therapist = therapists(:one)
  end

  test "visiting the index" do
    visit therapists_url
    assert_selector "h1", text: "Therapists"
  end

  test "should create therapist" do
    visit therapists_url
    click_on "New therapist"

    click_on "Create Therapist"

    assert_text "Therapist was successfully created"
    click_on "Back"
  end

  test "should update Therapist" do
    visit therapist_url(@therapist)
    click_on "Edit this therapist", match: :first

    click_on "Update Therapist"

    assert_text "Therapist was successfully updated"
    click_on "Back"
  end

  test "should destroy Therapist" do
    visit therapist_url(@therapist)
    click_on "Destroy this therapist", match: :first

    assert_text "Therapist was successfully destroyed"
  end
end
