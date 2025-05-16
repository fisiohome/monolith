class MakePostalCodeOptionalInAddresses < ActiveRecord::Migration[8.0]
  def change
    change_column_null :addresses, :postal_code, true
  end
end
