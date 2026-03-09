# frozen_string_literal: true

require "test_helper"
require "ostruct"

module AdminPortal
  class SpecialTierServiceResolverTest < ActiveSupport::TestCase
    # Test pure class methods without database dependencies

    test "extract_base_brand removes SPECIAL_TIER suffix" do
      assert_equal "FISIOHOME", SpecialTierServiceResolver.extract_base_brand("FISIOHOME_SPECIAL_TIER")
      assert_equal "WICARAKU", SpecialTierServiceResolver.extract_base_brand("WICARAKU_SPECIAL_TIER")
    end

    test "extract_base_brand handles basic service names" do
      assert_equal "FISIOHOME", SpecialTierServiceResolver.extract_base_brand("FISIOHOME")
      assert_equal "WICARAKU", SpecialTierServiceResolver.extract_base_brand("WICARAKU")
      assert_equal "OTHER", SpecialTierServiceResolver.extract_base_brand("OTHER_BRAND")
    end

    test "special_tier_brand? identifies special tier brands" do
      assert SpecialTierServiceResolver.special_tier_brand?("FISIOHOME")
      assert SpecialTierServiceResolver.special_tier_brand?("FISIOHOME_SPECIAL_TIER")
      assert SpecialTierServiceResolver.special_tier_brand?("WICARAKU")
      assert SpecialTierServiceResolver.special_tier_brand?("WICARAKU_SPECIAL_TIER")
      assert_not SpecialTierServiceResolver.special_tier_brand?("OTHER_BRAND")
      assert_not SpecialTierServiceResolver.special_tier_brand?("OTHER_SPECIAL_TIER")
    end

    test "special_tier_service_name returns correct special tier names" do
      assert_equal "FISIOHOME_SPECIAL_TIER", SpecialTierServiceResolver.special_tier_service_name("FISIOHOME")
      assert_equal "WICARAKU_SPECIAL_TIER", SpecialTierServiceResolver.special_tier_service_name("WICARAKU")
      assert_equal "FISIOHOME_SPECIAL_TIER", SpecialTierServiceResolver.special_tier_service_name("FISIOHOME_SPECIAL_TIER")
      assert_nil SpecialTierServiceResolver.special_tier_service_name("OTHER_BRAND")
    end

    test "SPECIAL_TIER_BRANDS constant contains expected brands" do
      expected_brands = ["FISIOHOME", "WICARAKU"]
      assert_equal expected_brands, SpecialTierServiceResolver::SPECIAL_TIER_BRANDS
    end

    test "resolve_service_name_for_location returns special tier when available" do
      # Mock location with services
      location = OpenStruct.new(id: 1)
      location_services_cache = {
        1 => Set.new(["FISIOHOME", "FISIOHOME_SPECIAL_TIER"])
      }

      service_name = SpecialTierServiceResolver.resolve_service_name_for_location(
        location: location,
        original_service_name: "FISIOHOME",
        location_services_cache: location_services_cache
      )

      assert_equal "FISIOHOME_SPECIAL_TIER", service_name
    end

    test "resolve_service_name_for_location falls back to basic when special tier not available" do
      # Mock location without special tier
      location = OpenStruct.new(id: 1)
      location_services_cache = {
        1 => Set.new(["FISIOHOME"])
      }

      service_name = SpecialTierServiceResolver.resolve_service_name_for_location(
        location: location,
        original_service_name: "FISIOHOME",
        location_services_cache: location_services_cache
      )

      assert_equal "FISIOHOME", service_name
    end

    test "resolve_service_name_for_location returns original for non-special brands" do
      # Mock location
      location = OpenStruct.new(id: 1)
      location_services_cache = {1 => Set.new([])}

      service_name = SpecialTierServiceResolver.resolve_service_name_for_location(
        location: location,
        original_service_name: "OTHER_BRAND",
        location_services_cache: location_services_cache
      )

      assert_equal "OTHER_BRAND", service_name
    end
  end
end
