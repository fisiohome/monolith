class IndonesianArea < ApplicationRecord
  def self.provinces
    all.select { |area| area.area_type == "PROVINCE" }
  end

  def self.cities
    all.select { |area| area.area_type == "CITY" }
  end
end
