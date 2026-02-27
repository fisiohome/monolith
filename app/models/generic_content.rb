class GenericContent < ApplicationRecord
  validates :group_key, presence: true, length: {maximum: 100}
  validates :content_key, presence: true, length: {maximum: 120}
  validates :is_active, inclusion: {in: [true, false]}

  validates :content_key, uniqueness: {scope: :group_key}

  scope :active, -> { where(is_active: true) }

  # Helper method to get content value by group and key
  def self.get_value(group_key, content_key, default_value = nil)
    content = active.find_by(group_key: group_key, content_key: content_key)
    content ? content.content_value : default_value
  end

  # Helper method to get integer value
  def self.get_integer_value(group_key, content_key, default_value = 0)
    value = get_value(group_key, content_key)
    value&.to_i || default_value
  rescue
    default_value
  end
end
