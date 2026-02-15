class VoucherPackage < ApplicationRecord
  belongs_to :voucher
  belongs_to :package

  validates :voucher_id, uniqueness: {scope: :package_id}
end
