module Admin
  class UsersController < ApplicationController
  before_action :set_user, only: %i[ show edit update destroy ]

  # inertia_share flash: -> { flash.to_hash }

  # GET /users
  def index
    page = params.fetch(:page, 1)
    limit = params.fetch(:limit, 10)
    sort_by = params.fetch(:sort_by, "current_sign_in_at")
    sort_direction = params.fetch(:sort_direction, "asc")
    # @users = User.order(@sort_by).page(@page).per(@per_page)
    # @user_paginated = { data: @users  }

    ## grouping the sort by queries
    # ensure that both are arrays
    sort_by = Array(sort_by)
    sort_direction = Array(sort_direction)
    # build the order query
    order_query = sort_by.zip(sort_direction).map do |sort, direction|
      direction = "asc" unless %w[asc desc].include?(direction)
      "#{sort} #{direction}" if User.column_names.include?(sort)
    end.compact.join(", ")

    @pagy, @users = pagy(User.order(order_query), page: page, limit: limit)

    puts @pagy.inspect

    render inertia: "Admin/User/Index", props: {
      users: @users.map do |user|
        serialize_user(user)
      end
    }
  end

  # GET /users/1
  def show
    render inertia: "Admin/User/Show", props: {
      user: serialize_user(@user)
    }
  end

  # GET /users/new
  def new
    @user = User.new
    render inertia: "Admin/User/New", props: {
      user: serialize_user(@user)
    }
  end

  # GET /users/1/edit
  def edit
    render inertia: "Admin/User/Edit", props: {
      user: serialize_user(@user)
    }
  end

  # POST /users
  def create
    @user = User.new(user_params)

    if @user.save
      redirect_to root_path, notice: "User was successfully created."
    else
      redirect_to new_user_url, inertia: { errors: @user.errors }
    end
  end

  # PATCH/PUT /users/1
  def update
    if @user.update(user_params)
      redirect_to root_path, notice: "User was successfully updated."
    else
      redirect_to edit_user_url(@user), inertia: { errors: @user.errors }
    end
  end

  # DELETE /users/1
  def destroy
    @user.destroy!
    redirect_to root_path, notice: "User was successfully destroyed."
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_user
      @user = User.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def user_params
      params.require(:user).permit(:email)
    end

    def serialize_user(user)
      deep_transform_keys_to_camel_case(
        user.as_json(only: %i[
          id email sign_in_count last_online_at current_sign_in_at last_sign_in_at current_sign_in_ip last_sign_in_ip created_at updated_at
        ])
      )
    end
  end
end
