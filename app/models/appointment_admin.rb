class AppointmentAdmin < ApplicationRecord
  # * define the associations
  belongs_to :admin
  belongs_to :appointment
end
