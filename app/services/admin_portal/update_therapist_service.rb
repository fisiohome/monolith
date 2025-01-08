module AdminPortal
  class UpdateTherapistService
    def initialize(therapist, therapist_params)
      Rails.logger.info("Preparing to update the therapist using service: UpdateTherapistService.")
      @therapist = therapist
      @params = therapist_params
    end

    def call
      Rails.logger.info("Starting process to update therapist.")
      ActiveRecord::Base.transaction do
        update_user
        update_therapist
        update_bank_details
        update_addresses

        # return the therapist or other objects you may need
        Rails.logger.debug { "Therapist: #{@therapist.inspect} " }
        @therapist
      end
    end

    private

    def update_user
      return if @params[:user].blank?

      @therapist.user.update!(@params[:user].compact_blank)
      Rails.logger.info("Updated user with email: #{@therapist.user.email}.")
    end

    def update_therapist
      therapist_attrs = @params.except(:user, :bank_details, :addresses, :service, :specializations, :modalities)
      @therapist.update!(therapist_attrs)

      # handle specializations and modalities explicitly
      if @params[:specializations].present?
        @therapist.update!(specializations: @params[:specializations])
        Rails.logger.info("Updated therapist specializations: #{@therapist.specializations}.")
      end

      if @params[:modalities].present?
        @therapist.update!(modalities: @params[:modalities])
        Rails.logger.info("Updated therapist modalities: #{@therapist.modalities}}.")
      end

      # update service if provided
      if @params[:service].present?
        @therapist.update!(service_id: @params[:service][:id])
        Rails.logger.info("Updated therapist service: #{@params[:service][:name]}.")
      end

      Rails.logger.info("Updated therapist profile with name: #{@therapist.name}.")
    end

    def update_bank_details
      return if @params[:bank_details].blank?

      existing_bank_detail_ids = @therapist.bank_details.pluck(:id)
      new_bank_detail_ids = @params[:bank_details].pluck(:id).compact

      # Remove bank details not included in the update parameters
      (existing_bank_detail_ids - new_bank_detail_ids).each do |id|
        @therapist.bank_details.find(id).destroy
      end

      bank_details_count = 0
      @params[:bank_details].each do |bank_detail_params|
        bank_detail = BankDetail.find_or_initialize_by(id: bank_detail_params[:id])
        bank_detail.update!(bank_detail_params.except(:active))
        TherapistBankDetail.find_or_initialize_by(therapist: @therapist, bank_detail: bank_detail).update!(active: bank_detail_params[:active] || false)
        bank_details_count += 1
      end
      Rails.logger.info("Updated #{bank_details_count} bank detail(s).")
    end

    def update_addresses
      return if @params[:addresses].blank?

      existing_address_ids = @therapist.addresses.pluck(:id)
      new_address_ids = @params[:addresses].pluck(:id).compact

      # Remove addresses not included in the update parameters
      (existing_address_ids - new_address_ids).each do |id|
        @therapist.addresses.find(id).destroy
      end

      addresses_count = 0
      @params[:addresses].each do |addr_params|
        location = Location.find_by(city: addr_params[:city])

        address = Address.find_or_initialize_by(id: addr_params[:id])
        address.update!(
          location_id: location&.id,
          address: addr_params[:address],
          postal_code: addr_params[:postal_code],
          latitude: 0.0,
          longitude: 0.0,
          coordinates: [0.0, 0.0]
        )

        TherapistAddress.find_or_initialize_by(therapist_id: @therapist.id, address_id: address.id).update!(active: addr_params[:active] || false)
        addresses_count += 1
      end
      Rails.logger.info("Updated #{addresses_count} address(es).")
    end
  end
end
