Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root to: "inertia_example#index"

  devise_for :users, path: "", path_names: {
    sign_in: "sign-in", sign_out: "sign-out", registration: "auth", sign_up: "sign-up"
  }, controllers: {
    sessions: "users/sessions",
    registrations: "users/registrations"
  }

  devise_scope :user do
    authenticated :user do
      root to: "admin_portal/admins#index", as: :authenticated_root

      namespace :admin_portal, path: "admin-portal" do
        root to: "admins#index"

        # resources :posts
        # resources :users, path: "accounts", as: "account_management"
        resources :admins, path: "admin-management", except: [ :show ] do
          collection do
            get "generate-reset-password-url" => "admins#generate_reset_password_url"
            put "change-password" => "admins#change_password"
          end
        end
      end
    end

    unauthenticated do
      root to: "users/sessions#new"
    end
  end
end
