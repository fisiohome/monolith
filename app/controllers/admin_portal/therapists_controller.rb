module AdminPortal
  class TherapistsController < ApplicationController
    before_action :set_therapist, only: %i[ show edit update destroy ]

    # GET /therapists
    def index
      @therapists = Therapist.all
      render inertia: "AdminPortal/Therapist/Index", props: deep_transform_keys_to_camel_case({
        therapists: @therapists.map do |therapist|
          serialize_therapist(therapist)
        end
      })
    end

    # GET /therapists/1
    def show
      render inertia: "Therapist/Show", props: {
        therapist: serialize_therapist(@therapist)
      }
    end

    # GET /therapists/new
    def new
      @therapist = Therapist.new
      render inertia: "AdminPortal/Therapist/New", props: deep_transform_keys_to_camel_case({
        therapist: @therapist,
        genders: Therapist.genders.map { |key, value| value },
        employment_types: Therapist.employment_types.map { |key, value| value },
        employment_statuses: Therapist.employment_statuses.map { |key, value| value }
      })
    end

    # GET /therapists/1/edit
    def edit
      render inertia: "Therapist/Edit", props: {
        therapist: serialize_therapist(@therapist)
      }
    end

    # POST /therapists
    def create
      @therapist = Therapist.new(therapist_params)

      if @therapist.save
        redirect_to @therapist, notice: "Therapist was successfully created."
      else
        redirect_to new_therapist_url, inertia: { errors: @therapist.errors }
      end
    end

    # PATCH/PUT /therapists/1
    def update
      if @therapist.update(therapist_params)
        redirect_to @therapist, notice: "Therapist was successfully updated."
      else
        redirect_to edit_therapist_url(@therapist), inertia: { errors: @therapist.errors }
      end
    end

    # DELETE /therapists/1
    def destroy
      @therapist.destroy!
      redirect_to therapists_url, notice: "Therapist was successfully destroyed."
    end

    private
      # Use callbacks to share common setup or constraints between actions.
      def set_therapist
        @therapist = Therapist.find(params[:id])
      end

      # Only allow a list of trusted parameters through.
      def therapist_params
        params.fetch(:therapist, {})
      end

      def serialize_therapist(therapist)
        therapist.as_json(
          only: %i[ id ],
          include: {
            user: {
              only: %i[ id email ]
            }
          }
        )
      end
  end
end
