Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", :as => :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  get "manifest" => "rails/pwa#manifest", :as => :pwa_manifest
  get "service-worker" => "rails/pwa#service_worker", :as => :pwa_service_worker

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

        resources :dashboards, only: [:index]
        resources :therapists, path: "therapist-management" do
          collection do
            get "generate-reset-password-url" => "therapists#generate_reset_password_url"
            put "change-password" => "therapists#change_password"
          end
        end

        resources :admins, path: "admin-management", except: [:show, :edit] do
          collection do
            get "generate-reset-password-url" => "admins#generate_reset_password_url"
            put "change-password" => "admins#change_password"
          end
        end

        resources :services, only: [:index, :create, :update, :destroy] do
          collection do
            put "update-status" => "services#update_status"
          end
        end

        resources :locations, only: [:index] do
          collection do
            post "create-bulk" => "locations#create_bulk"
            put "update-bulk" => "locations#update_bulk"
            delete "delete-bulk" => "locations#destroy_bulk"
          end
        end
      end
    end

    unauthenticated do
      root to: "users/sessions#new"
    end
  end
end
