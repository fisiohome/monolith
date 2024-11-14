# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# for seeding the accounts
puts "Seed accounts starting..."

# seeding the default super admins
puts "Seed Super Admin..."

super_admin = User.where(email: "super_admin@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
end
Admin.find_or_initialize_by(user: super_admin) do |admin|
  admin.admin_type = 'SUPER_ADMIN'
  admin.name = 'Super Admin'
end.save!

super_admin_2 = User.where(email: "super_admin_2@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
  user.suspend_at = Time.current
end
Admin.find_or_initialize_by(user: super_admin_2) do |admin|
  admin.admin_type = 'SUPER_ADMIN'
  admin.name = 'Super Admin 2'
end.save!

super_admin_3 = User.where(email: "super_admin_3@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
end
Admin.find_or_initialize_by(user: super_admin_3) do |admin|
  admin.admin_type = 'SUPER_ADMIN'
  admin.name = 'Super Admin 3'
end.save!

puts "Seed Super Admin finished..."

# seeding the default admin l1's
puts "Seed Admin L1..."

admin_l1 = User.where(email: "admin_l1@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
end
Admin.find_or_initialize_by(user: admin_l1) do |admin|
  admin.admin_type = 'ADMIN_L1'
  admin.name = 'Admin L1'
end.save!

admin_l1_2 = User.where(email: "admin_l1_2@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
end
Admin.find_or_initialize_by(user: admin_l1_2) do |admin|
  admin.admin_type = 'ADMIN_L1'
  admin.name = 'Admin L1 2'
end.save!

puts "Seed Admin L1 finished..."

# seeding the default admin l2's
puts "Seed Admin L2..."

admin_l2 = User.where(email: "admin_l2@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
end
Admin.find_or_initialize_by(user: admin_l2) do |admin|
  admin.admin_type = 'ADMIN_L2'
  admin.name = 'Admin L2'
end.save!

admin_l2_2 = User.where(email: "admin_l2_2@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
end
Admin.find_or_initialize_by(user: admin_l2_2) do |admin|
  admin.admin_type = 'ADMIN_L2'
  admin.name = 'Admin L2 2'
end.save!

puts "Seed Admin L2 finished..."

# seeding the default admin l3's
puts "Seed Admin L3..."

admin_l3 = User.where(email: "admin_l3@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
end
Admin.find_or_initialize_by(user: admin_l3) do |admin|
  admin.admin_type = 'ADMIN_L3'
  admin.name = 'Admin L3'
end.save!

admin_l3_2 = User.where(email: "admin_l3_2@fisiohome.id").first_or_create do |user|
  user.password = "Fisiohome123!"
  user.password_confirmation = "Fisiohome123!"
end
Admin.find_or_initialize_by(user: admin_l3_2) do |admin|
  admin.admin_type = 'ADMIN_L3'
  admin.name = 'Admin L3 2'
end.save!

puts "Seed Admin L3 finished..."

puts "Seed accounts finished..."
