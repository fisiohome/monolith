class MakePostalCodeOptionalInApptAddressHistory < ActiveRecord::Migration[8.0]
  def change
    change_column_null :appointment_address_histories, :postal_code, true
  end
end
