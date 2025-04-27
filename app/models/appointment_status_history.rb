class AppointmentStatusHistory < ApplicationRecord
  # * define the associations
  belongs_to :appointment
  belongs_to :changer, class_name: "User", foreign_key: "changed_by"

  # * define the validations
  validates :new_status, :changed_by, presence: true
end
