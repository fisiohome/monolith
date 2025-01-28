module TherapistsHelper
  def serialize_therapist(therapist)
    therapist.as_json(only: %i[id name batch phone_number registration_number modalities specializations employment_status employment_type gender]).tap do |therapist_serialize|
      # serialize the therapist user accounts
      therapist_serialize["user"] = therapist.user.as_json(
        only: %i[id email is_online? last_online_at last_sign_in_at current_sign_in_ip last_sign_in_ip suspend_at suspend_end],
        methods: %i[is_online? suspended?]
      )

      # serizlie the therapist service
      therapist_serialize["service"] = therapist.service.as_json(only: %i[id name code])

      # serialize the therapist bank details
      therapist_serialize["bank_details"] = therapist.therapist_bank_details.map do |therapist_bank|
        therapist_bank.bank_detail.attributes.merge(active: therapist_bank.active)
      end

      # serialize the therapist addresses
      therapist_serialize["addresses"] = therapist.therapist_addresses.map do |therapist_address|
        therapist_address.address.attributes.merge(
          active: therapist_address.active,
          location: therapist_address.address.location.attributes
        )
      end
    end
  end
end
