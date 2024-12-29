module AdminPortal
  class DashboardsController < ApplicationController
    def index
      # --- Admins ---
      @total_admins = Admin.count
      @active_admins = Admin.joins(:user).where(["users.suspend_at IS NULL OR (users.suspend_end IS NOT NULL AND users.suspend_end < ?)", Time.current]).count
      @admins_by_type = Admin.group(:admin_type).count
      @this_month_admins = Admin.where(
        created_at: Time.current.all_month
      ).count

      @last_month_admins = Admin.where(
        created_at: 1.month.ago.all_month
      ).count

      @percentage_increment_admins = if @last_month_admins.positive?
        ((@this_month_admins - @last_month_admins) / @last_month_admins.to_f) * 100
      else
        0
      end

      # --- Therapists ---
      @total_therapists = Therapist.count
      @therapists_by_gender = Therapist.group(:gender).count
      @therapists_by_employment_status = Therapist.group(:employment_status).count
      @therapists_by_employment_type = Therapist.group(:employment_type).count
      @therapists_by_service = Therapist.joins(:service).group("services.name").count

      # Example: monthly increment of new therapists
      @this_month_therapists = Therapist.where(
        created_at: Time.current.all_month
      ).count

      @last_month_therapists = Therapist.where(
        created_at: 1.month.ago.all_month
      ).count

      @percentage_increment_therapists = if @last_month_therapists.positive?
        ((@this_month_therapists - @last_month_therapists) / @last_month_therapists.to_f) * 100
      else
        0
      end

      # --- Services ---
      @total_services = Service.count
      @active_services = Service.where(active: true).count

      # --- Locations ---
      @total_locations = Location.count
      @top_5_cities_with_therapists = Location
        .joins(addresses: :therapist_addresses)
        .where(therapist_addresses: {active: true})
        .group(:city)
        .order("COUNT(therapist_addresses.id) DESC")
        .limit(5)
        .count

      # --- LocationServices ---
      @total_location_services = LocationService.distinct.count(:location_id)
      @active_location_services = LocationService.where(active: true).distinct.count(:location_id)

      # Render with Inertia
      render inertia: "AdminPortal/Dashboard/Index", props: {
        admins: InertiaRails.defer {
          sleep(0.001)
          {
            total: @total_admins,
            active: @active_admins,
            by_type: @admins_by_type,
            this_month: @this_month_admins,
            last_month: @last_month_admins,
            percentage_increment_monthly: @percentage_increment_admins
          }
        },
        therapists: InertiaRails.defer {
          sleep(0.001)
          {
            total: @total_therapists,
            by_gender: @therapists_by_gender,
            by_employment_status: @therapists_by_employment_status,
            by_employment_type: @therapists_by_employment_type,
            by_service: @therapists_by_service,
            this_month: @this_month_therapists,
            last_month: @last_month_therapists,
            percentage_increment_monthly: @percentage_increment_therapists
          }
        },
        services: InertiaRails.defer {
          sleep(0.001)
          {
            total: @total_services,
            active: @active_services,
            location_registered: {
              total: @total_location_services,
              active: @active_location_services
            }
          }
        },
        locations: InertiaRails.defer {
          sleep(0.001)
          {
            total: @total_locations,
            top_5_cities_with_therapists: @top_5_cities_with_therapists
          }
        }
      }
    end
  end
end
