Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", :as => :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  get "manifest" => "rails/pwa#manifest", :as => :pwa_manifest
  get "service-worker" => "rails/pwa#service_worker", :as => :pwa_service_worker

  # route for the dashboard jobs controller
  # docs: https://github.com/rails/mission_control-jobs
  mount MissionControl::Jobs::Engine, at: "/jobs"

  # Defines the root path route ("/")
  # root to: "inertia_example#index"

  devise_for :users, path: "", path_names: {
    sign_in: "sign-in", sign_out: "sign-out", registration: "auth", sign_up: "sign-up", password: "auth/password"
  }, controllers: {
    sessions: "users/sessions",
    registrations: "users/registrations",
    passwords: "users/passwords"
  }

  devise_scope :user do
    authenticated :user do
      root to: "admin_portal/dashboards#index", as: :authenticated_root

      namespace :admin_portal, path: "admin-portal" do
        root to: "dashboards#index"

        # resources :users, path: "accounts", as: "account_management"
        put "suspend" => "users#suspend_account"
        put "activate" => "users#activate_account"
        get "therapist-schedules" => "therapists#schedules"

        resources :dashboards, only: [:index]

        resources :appointments, only: [:index, :new] do
          collection do
            post "book" => "appointments#create"
            put ":id/cancel" => "appointments#cancel"
            put ":id/update-pic" => "appointments#update_pic"
            put ":id/update-status" => "appointments#update_status"
            get ":id/reschedule" => "appointments#reschedule_page", :as => :reschedule_page
            put ":id/reschedule" => "appointments#reschedule", :as => :reschedule
          end
        end

        namespace :settings do
          get "account_security"
          get "appearance"
        end

        resources :availabilities, only: [:index] do
          collection do
            put "upsert" => "availabilities#upsert"
          end
        end

        resources :therapists, path: "therapist-management" do
          collection do
            get "generate-reset-password-url" => "therapists#generate_reset_password_url"
            put "change-password" => "therapists#change_password"
            put "sync-data-master" => "therapists#sync_data_master"
          end
        end

        resources :admins, path: "admin-management", except: [:show, :edit] do
          collection do
            get "generate-reset-password-url" => "admins#generate_reset_password_url"
            put "change-password" => "admins#change_password"
            put "sync-data-master" => "admins#sync_data_master"
          end
        end

        resources :patients, path: "patient-management", only: [:index, :update]

        resources :services, only: [:index, :create, :update, :edit, :destroy] do
          collection do
            put "update-status" => "services#update_status"
            put "sync-data-master" => "services#sync_data_master"
          end
        end

        resources :locations, only: [:index] do
          collection do
            post "create-bulk" => "locations#create_bulk"
            put "update-bulk" => "locations#update_bulk"
            delete "delete-bulk" => "locations#destroy_bulk"
            put "sync-data-master" => "locations#sync_data_master"
          end
        end
      end

      namespace :api do
        namespace :v1 do
          resources :services, only: [:index]
        end
      end
    end

    unauthenticated do
      root to: "users/sessions#new"
    end
  end
end
