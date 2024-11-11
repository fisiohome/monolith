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
    sessions: "users/sessions"
  }

  devise_scope :user do
    authenticated :user do
      root to: "admin/users#index", as: :authenticated_root

      namespace :admin do
        root to: "users#index"

        resources :posts
        resources :users, path: "accounts", as: "account_management"
      end
    end

    unauthenticated do
      root to: "users/sessions#new"
    end
  end


  get "inertia-example", to: "inertia_example#index"
end
