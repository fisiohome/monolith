# Therapist Search Filter Configuration

## Overview
Dokumentasi lengkap konfigurasi filter untuk pencarian terapis melalui `BatchQueryHelper.filtered_therapists_in_batches`. Sistem ini menggunakan constants untuk mengontrol filter yang dapat dimatikan/dinyalakan sesuai kebutuhan bisnis.

## Filter Configuration Constants

### Location untuk Konfigurasi
`app/services/admin_portal/therapists/batch_query_helper.rb`

### Constants Definition
```ruby
# Constants for bypassing specific filters
ENABLE_SERVICE_FILTERING = false
ENABLE_LOCATION_FILTERING = false  
ENABLE_AVAILABILITY_RULES_FILTERING = false
```

## Filter Details

### 1. Service Filtering (`ENABLE_SERVICE_FILTERING`)

**When Enabled (`true`)**:
- Filter terapis berdasarkan layanan/service yang sesuai
- Apply SPECIAL_TIER logic untuk location-based service resolution
- Hanya terapis dengan service compatible yang ditampilkan

**When Disabled (`false`)**:
- **Tidak ada filter layanan** - semua terapis dari semua layanan ditampilkan
- SPECIAL_TIER logic tidak dijalankan
- Semua therapist services diikutsertakan

**Implementation**:
```ruby
if ENABLE_SERVICE_FILTERING
  original_service = service
  service = AdminPortal::SpecialTierServiceResolver.resolve_service_for_location(
    location: location,
    original_service: service
  )
  
  if service.id != original_service.id
    Rails.logger.info "[BatchQueryHelper] SPECIAL_TIER: Using service '#{service.name}' instead of '#{original_service.name}'"
  end
  
  base_scope = base_scope.where(services: {id: service.id})
end
```

### 2. Location Filtering (`ENABLE_LOCATION_FILTERING`)

**When Enabled (`true`)**:
- Filter berdasarkan lokasi geografis terapis
- Apply Jakarta Pusat special rule (DKI Jakarta area)
- Apply Jabodetabek vs non-Jabodetabek business rules
- Filter berdasarkan availability rules location restrictions

**When Disabled (`false`)**:
- **Tidak ada filter lokasi** - semua terapis dari semua lokasi ditampilkan
- Jakarta Pusat rule tidak aktif
- Jabodetabek geographic rules tidak aktif
- Location-based availability rules tidak diperiksa

**Implementation**:
```ruby
location_ids =
  if ENABLE_LOCATION_FILTERING
    if location.city == "KOTA ADM. JAKARTA PUSAT"
      Location.where(state: "DKI JAKARTA").pluck(:id)
    else
      [location.id]
    end
  else
    # Location filtering disabled - include all locations
    nil
  end
```

### 3. Availability Rules Filtering (`ENABLE_AVAILABILITY_RULES_FILTERING`)

**When Enabled (`true`)**:
- Filter berdasarkan `therapist_appointment_schedules.availability_rules`
- Apply JSON-based location restrictions
- Respect therapist's geographic availability settings
- Combine dengan location filtering untuk geographic rules

**When Disabled (`false`)**:
- **Tidak ada filter availability rules** - semua terapis dianggap tersedia
- JSON availability rules tidak diperiksa
- Location restrictions dari schedule diabaikan
- Semua therapist schedules diikutsertakan

**Implementation**:
```ruby
if ENABLE_AVAILABILITY_RULES_FILTERING && ENABLE_LOCATION_FILTERING
  # Complex Jabodetabek vs non-Jabodetabek logic with availability rules
  # ... (full implementation in source file)
end
```

## Filters yang Tidak Dapat Dimatikan

### Core Business Rules (Always Active)
1. **Employment Status**: Hanya `employment_status = "ACTIVE"`
2. **Gender Preference**: Berdasarkan `preferred_therapist_gender` parameter
3. **Employment Type**: FLAT atau coordinate-based filtering
4. **Address Requirement**: Harus memiliki `active_therapist_address`
5. **Time-based Availability**: Jika `appointment_date_time` disediakan

## Use Cases

### Development & Testing
```ruby
# Matikan semua filter untuk testing
ENABLE_SERVICE_FILTERING = false
ENABLE_LOCATION_FILTERING = false  
ENABLE_AVAILABILITY_RULES_FILTERING = false
```
**Result**: Semua active therapists ditampilkan tanpa batasan

### Production - Full Filtering
```ruby
# Aktifkan semua filter untuk production
ENABLE_SERVICE_FILTERING = true
ENABLE_LOCATION_FILTERING = true  
ENABLE_AVAILABILITY_RULES_FILTERING = true
```
**Result**: Full business rules applied

### Partial Filtering Scenarios

#### Service Only
```ruby
ENABLE_SERVICE_FILTERING = true
ENABLE_LOCATION_FILTERING = false  
ENABLE_AVAILABILITY_RULES_FILTERING = false
```
**Use Case**: Hanya filter by layanan, semua lokasi tersedia

#### Location Only
```ruby
ENABLE_SERVICE_FILTERING = false
ENABLE_LOCATION_FILTERING = true  
ENABLE_AVAILABILITY_RULES_FILTERING = false
```
**Use Case**: Geographic filtering tanpa service restrictions

#### Availability Rules Only
```ruby
ENABLE_SERVICE_FILTERING = false
ENABLE_LOCATION_FILTERING = false  
ENABLE_AVAILABILITY_RULES_FILTERING = true
```
**Use Case**: Hanya availability rules, tanpa geographic restrictions

## Impact Analysis

### Performance Impact
- **Service Filtering**: Medium impact (join dengan services table)
- **Location Filtering**: High impact (complex geographic SQL)
- **Availability Rules**: High impact (JSON parsing dan complex WHERE clauses)

### Business Impact
- **Service Filtering**: Penting untuk service compatibility
- **Location Filtering**: Kritis untuk geographic business rules
- **Availability Rules**: Penting untuk therapist scheduling preferences

## Monitoring & Logging

### Log Messages
```ruby
# Service filtering disabled
Rails.logger.info "[BatchQueryHelper] Location: #{location.city}, Service: All Services (filter disabled)"

# Service filtering enabled
Rails.logger.info "[BatchQueryHelper] Location: #{location.city}, Service: #{service.name}"
```

### Performance Monitoring
- Batch processing logs tetap aktif
- Total count tracking untuk semua filter combinations
- Progress logging untuk large datasets

## Configuration Management

### Environment-specific Settings
```ruby
# Development - more permissive
ENABLE_SERVICE_FILTERING = false
ENABLE_LOCATION_FILTERING = false
ENABLE_AVAILABILITY_RULES_FILTERING = false

# Production - full business rules
ENABLE_SERVICE_FILTERING = true
ENABLE_LOCATION_FILTERING = true
ENABLE_AVAILABILITY_RULES_FILTERING = true
```

### Dynamic Configuration (Future Enhancement)
```ruby
# Potential future enhancement
class TherapistSearchConfig
  def self.service_filtering_enabled?
    ENV.fetch('THERAPIST_SERVICE_FILTERING', 'true') == 'true'
  end
  
  def self.location_filtering_enabled?
    ENV.fetch('THERAPIST_LOCATION_FILTERING', 'true') == 'true'
  end
  
  def self.availability_rules_filtering_enabled?
    ENV.fetch('THERAPIST_AVAILABILITY_FILTERING', 'true') == 'true'
  end
end
```

## Testing Strategies

### Unit Tests
```ruby
# Test each filter independently
describe 'BatchQueryHelper filter configuration' do
  it 'respects ENABLE_SERVICE_FILTERING constant' do
    # Test service filtering on/off
  end
  
  it 'respects ENABLE_LOCATION_FILTERING constant' do
    # Test location filtering on/off
  end
  
  it 'respects ENABLE_AVAILABILITY_RULES_FILTERING constant' do
    # Test availability rules filtering on/off
  end
end
```

### Integration Tests
- Test semua filter combinations
- Verify business rules dengan berbagai settings
- Performance testing untuk setiap configuration

## Troubleshooting

### Common Issues
1. **Empty Results**: Cek apakah semua filters disabled
2. **Performance Issues**: Matikan complex filters untuk testing
3. **Business Logic Errors**: Verify constants settings

### Debug Commands
```ruby
# Check current filter settings
Rails.logger.info "Service Filtering: #{AdminPortal::Therapists::BatchQueryHelper::ENABLE_SERVICE_FILTERING}"
Rails.logger.info "Location Filtering: #{AdminPortal::Therapists::BatchQueryHelper::ENABLE_LOCATION_FILTERING}"
Rails.logger.info "Availability Rules: #{AdminPortal::Therapists::BatchQueryHelper::ENABLE_AVAILABILITY_RULES_FILTERING}"
```

## Related Documentation

- **Business Rules**: `/docs/therapists/therapist-search-business-rules.md`
- **Query Optimization**: `/docs/therapists/therapist-query-optimization.md`
- **Feasibility API**: `/docs/therapists/therapist-feasible-api-optimization.md`

## Migration Guide

### From Hardcoded Logic to Constants
1. Identify existing filter logic
2. Wrap dengan conditional constants
3. Test dengan berbagai combinations
4. Update documentation
5. Deploy dengan monitoring

### Best Practices
- Gunakan constants untuk semua business rule switches
- Document setiap configuration option
- Test semua filter combinations
- Monitor performance impact
- Keep backward compatibility when possible
