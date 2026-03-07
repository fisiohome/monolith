# Therapist Search Business Rules

## Overview
Dokumentasi lengkap business logic yang digunakan dalam pencarian terapis feasible melalui `BatchQueryHelper` dan `AvailabilityService`.

## 1. Location Resolution Rules

### Jakarta Pusat Special Rule
**Business Rule**: "Jakarta Pusat therapists can serve any DKI Jakarta location"

```ruby
if location.city == "KOTA ADM. JAKARTA PUSAT"
  Location.where(state: "DKI JAKARTA").pluck(:id)
else
  [location.id]
end
```

**Logic**:
- Jika pasien minta Jakarta Pusat → semua terapis dari DKI Jakarta bisa melayani
- Jika lokasi lain → hanya terapis dari lokasi tersebut yang bisa melayani
- Tujuan: Meningkatkan availability untuk Jakarta Pusat sebagai pusat bisnis

## 2. Base Filtering Rules

### Active Status Requirement
- Hanya terapis dengan `employment_status = "ACTIVE"`
- Terapis yang suspend, resigned, atau non-aktif tidak akan ditampilkan

### Service Compatibility
- Terapis harus memiliki service yang sesuai dengan request
- Join dengan tabel `services` untuk validasi compatibility
- Filter: `services.id = service.id`

### Address Requirement
- Terapis harus memiliki `active_therapist_address`
- Alamat harus memiliki lokasi yang valid
- Digunakan untuk perhitungan jarak dan location-based filtering

## 3. Employment Type Rules

### Default Behavior
```ruby
"therapists.employment_type = :flat OR (addresses.latitude <> 0 AND addresses.longitude <> 0)"
```

**Logic**:
- **FLAT Type**: Terapis dengan tipe kerja FLAT (flat rate) selalu ditampilkan
- **Coordinate-based**: Terapis dengan latitude/longitude valid (untuk distance calculation)
- Tujuan: Mendukung sistem perhitungan jarak untuk scheduling

### Specific Employment Type
- Jika parameter `employment_type` spesifik (KARPIS, FULL_TIME, dll)
- Hanya terapis dengan tipe tersebut yang akan ditampilkan
- Override default behavior

## 4. Jabodetabek Geographic Rules

### Jabodetabek Areas
**Keywords**: `["JAKARTA", "BOGOR", "DEPOK", "TANGERANG", "BEKASI", "KEPULAUAN SERIBU"]`

### For Jabodetabek Locations (Permissive)
```ruby
base_scope.where(
  "(therapist_appointment_schedules.availability_rules IS NULL OR " \
  "therapist_appointment_schedules.availability_rules::text = '[]' OR " \
  "NOT EXISTS (SELECT 1 FROM json_array_elements(therapist_appointment_schedules.availability_rules) " \
  "WHERE value->>'location' = 'true') OR " \
  "addresses.location_id IN (?))",
  location_ids
)
```

**Logic**:
- **No availability rules**: Terapis available everywhere
- **Empty rules array**: Terapis available everywhere  
- **No location restrictions**: Terapis available everywhere
- **Address in target location**: Terapis available for location
- **Business Rule**: Jabodetabek therapists dapat melayani lokasi Jabodetabek mana saja

### For Non-Jabodetabek Locations (Restrictive)
```ruby
base_scope.where(
  "(" \
  "  (addresses.location_id NOT IN (?) AND " \
  "   (therapist_appointment_schedules.availability_rules IS NULL OR " \
  "    therapist_appointment_schedules.availability_rules::text = '[]' OR " \
  "    NOT EXISTS (SELECT 1 FROM json_array_elements(therapist_appointment_schedules.availability_rules) " \
  "                WHERE value->>'location' = 'true'))) OR " \
  "  addresses.location_id IN (?)" \
  ")",
  jabodetabek_location_ids,
  location_ids
)
```

**Logic**:
- **Non-Jabodetabek therapists**: Available tanpa location restrictions
- **Jabodetabek therapists**: Dikecualikan kecuali secara eksplisit diizinkan
- **Local therapists**: Diprioritaskan untuk lokasi non-Jabodetabek
- **Business Rule**: Melindungi pasar lokal dari kompetisi terapis Jabodetabek

## 5. Gender Preference Rules

### Implementation
```ruby
if params[:preferred_therapist_gender].present? && params[:preferred_therapist_gender] != "NO PREFERENCE"
  base_scope = base_scope.where(gender: params[:preferred_therapist_gender])
end
```

**Logic**:
- **NO PREFERENCE**: Semua gender ditampilkan (default)
- **MALE/FEMALE**: Hanya terapis dengan gender sesuai yang ditampilkan
- **Database-level filtering**: Dilakukan di SQL level untuk performance

## 6. Availability Checking Rules

### Adjacent Appointment Address Logic

#### Previous Appointment Location
```ruby
previous_appointment = day_appointments
  .select { |apt| apt.appointment_date_time < @appointment_date_time_server_time }
  .max_by(&:appointment_date_time)

@previous_appointment_location = extract_location_details(previous_appointment)
```

**Business Rule**: "Use previous appointment location as starting point"

**Logic**:
- Cari appointment sebelumnya di hari yang sama
- Ambil yang paling dekat dengan waktu request
- Extract alamat dari `address_history`
- Digunakan untuk travel time calculation

#### Next Appointment Location
```ruby
next_appointment = day_appointments
  .select { |apt| apt.appointment_date_time > @appointment_date_time_server_time }
  .min_by(&:appointment_date_time)

@next_appointment_location = extract_location_details(next_appointment)
```

**Business Rule**: "Consider next appointment location for scheduling decisions"

### Location Details Extraction
```ruby
def extract_location_details(appointment)
  return nil unless appointment&.address_history&.address_line
  
  visit_address = appointment&.address_history
  {
    id: appointment.id,
    registration_number: appointment.registration_number,
    address: visit_address.address_line,
    latitude: visit_address.latitude,
    longitude: visit_address.longitude,
    coordinates: visit_address.coordinates
  }
end
```

**Data Extracted**:
- Appointment ID dan registration number
- Complete address line
- GPS coordinates (latitude/longitude)
- Digunakan untuk distance dan travel time calculation

## 7. Batch Processing Rules

### Implementation
```ruby
loop do
  therapist_ids = base_scope.limit(batch_size).offset(batch_offset).pluck(:id)
  break if therapist_ids.empty?
  
  batch_therapists = Therapist.includes(active_address: :location).where(id: therapist_ids).to_a
  # Process batch...
end
```

**Purpose**:
- **Memory Management**: Mengurangi memory usage untuk dataset besar
- **Performance**: Mencegah timeout untuk query kompleks
- **Progress Tracking**: Memungkinkan logging dan monitoring
- **Default Batch Size**: 100 records per batch

## 8. Preloading Optimization Rules

### Appointments Preloading
```ruby
all_appointments = Appointment
  .where(therapist_id: therapist_ids)
  .where(appointment_date_time: appointment_date.all_day)
  .where.not(status: ["CANCELLED", "UNSCHEDULED", "ON HOLD", "PENDING THERAPIST ASSIGNMENT"])
  .includes(:location)
  .group_by(&:therapist_id)
```

**Rules**:
- Load semua appointments untuk therapist dalam batch
- Exclude status yang tidak relevan (cancelled, unscheduled, etc.)
- Include location data untuk menghindari N+1 queries
- Group by therapist_id untuk efficient access

### Schedules Preloading
```ruby
therapist_schedules = TherapistAppointmentSchedule
  .where(therapist_id: therapist_ids)
  .includes(:therapist_weekly_availabilities, :therapist_adjusted_availabilities)
  .index_by(&:therapist_id)
```

**Rules**:
- Load semua schedules untuk therapist dalam batch
- Include weekly dan adjusted availabilities
- Index by therapist_id untuk O(1) access
- Menghindari N+1 queries pada availability checking

## 9. Time Zone Handling Rules

### Implementation
```ruby
therapist_time_zone = @schedule.time_zone.presence || Time.zone.name
appointment_date_time_in_tz = @appointment_date_time_server_time.in_time_zone(therapist_time_zone)
current_date_time_in_tz = Time.current.in_time_zone(therapist_time_zone)
```

**Rules**:
- Gunakan therapist's time zone untuk accurate scheduling
- Default ke system time zone jika therapist tidak punya setting
- Convert semua waktu ke therapist's timezone untuk comparison
- Penting untuk availability checking yang akurat

## 10. Admin Bypass Rules

### Configuration
```ruby
BYPASS_ADVANCE_BOOKING_FOR_ADMIN = true
```

**Rules**:
- Admin internal bisa bypass advance booking limits
- Tidak ada strict validation untuk admin users
- Memungkinkan special cases dan bulk scheduling
- Configuration-based untuk flexibility

## Summary of Business Logic Flow

1. **Location Resolution**: Tentukan area coverage (Jakarta Pusat rule)
2. **Base Filtering**: Active status, service compatibility, address requirement
3. **Employment Type**: FLAT atau coordinate-based filtering
4. **Geographic Rules**: Jabodetabek vs non-Jabodetabek logic
5. **Personal Preferences**: Gender filtering
6. **Batch Processing**: Process dalam batch untuk performance
7. **Availability Checking**: Adjacent appointments, time zones, constraints
8. **Optimizations**: Preloading, caching, database-level filtering

## Key Design Principles

- **Performance Optimization**: Database-level filtering, batch processing, preloading
- **Business Flexibility**: Configuration-based rules, admin bypass capabilities
- **Geographic Considerations**: Special handling untuk Jakarta Pusat dan Jabodetabek
- **Real-world Logic**: Travel time, adjacent appointments, therapist availability
- **Scalability**: Batch processing untuk large datasets
