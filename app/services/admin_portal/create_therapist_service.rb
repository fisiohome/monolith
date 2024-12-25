module AdminPortal
  class CreateTherapistService
    def initialize(therapist_params)
      Rails.logger.info("Preparing to create the therapist using service: CreateTherapistService.")
      @params = therapist_params
    end

    def call
      Rails.logger.info("Starting process to create therapist.")
      ActiveRecord::Base.transaction do
        create_user
        create_therapist
        create_bank_details
        create_addresses

        # return the therapist or other objects you may need
        @therapist
      end
    end

    private

    def create_user
      @user = User.create!(@params[:user])
      Rails.logger.info("Created user with email: #{@user.email}.")
    end

    def create_therapist
      therapist_attrs = @params.except(:user, :bank_details, :addresses, :service)
      @therapist = Therapist.new(therapist_attrs.merge(user_id: @user.id))

      if @params[:service].present?
        @therapist.service_id = @params[:service][:id]
      end

      @therapist.save!
      Rails.logger.info("Created therapist profile with name: #{@therapist.name}.")
    end

    def create_bank_details
      return if @params[:bank_details].blank?

      bank_details_count = 0
      @params[:bank_details].each do |bank_detail_params|
        bank_detail = BankDetail.create!(bank_detail_params.except(:active))
        TherapistBankDetail.create!(
          therapist: @therapist,
          bank_detail: bank_detail,
          active: bank_detail_params[:active] || false
        )
        bank_details_count += 1
      end
      Rails.logger.info("Created #{bank_details_count} bank detail(s).")
    end

    def create_addresses
      return if @params[:addresses].blank?

      addresses_count = 0
      @params[:addresses].each do |addr_params|
        location = Location.find_by(city: addr_params[:city])

        address = Address.create!(
          location_id: location&.id,
          address: addr_params[:address],
          postal_code: addr_params[:postal_code],
          latitude: 0.0,
          longitude: 0.0,
          coordinates: [0.0, 0.0]
        )

        TherapistAddress.create!(
          therapist_id: @therapist.id,
          address_id: address.id,
          active: addr_params[:active] || false
        )
        addresses_count += 1
      end
      Rails.logger.info("Created #{addresses_count} address(es).")
    end
  end
end
