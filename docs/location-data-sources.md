# Location Data Sources Documentation

## Overview

This document explains the sources and structure of location data used in the Fisiohome Monolith application. The location data is seeded through the database seeding process and includes Indonesian administrative areas, operational locations, and service coverage mappings.

## Data Sources

### 1. Indonesian Administrative Areas

**Source**: `config/initializers/seeders/indonesian_areas.rb`

**API Reference**: 
- **Country/State/City Data**: https://api.countrystatecity.in/play (as uppercase values)
- **Indonesian Specific Data**: https://api.cahyadsn.com/

**Structure**:
```ruby
INDONESIAN_AREAS = [
  {code: "11", name: "ACEH", area_type: "PROVINCE"},
  {code: "11.01", name: "KAB. ACEH SELATAN", area_type: "CITY"},
  {code: "11.71", name: "KOTA BANDA ACEH", area_type: "CITY"},
  # ... complete list of all Indonesian provinces and cities
]
```

**Coverage**: 
- 38 provinces
- 514 cities/regencies (Kabupaten and Kota)
- Complete administrative hierarchy with standardized codes
- Includes all major Indonesian administrative divisions

**Key Features**:
- **Standardized Coding**: Uses Indonesian BPS (Statistics Indonesia) coding system
- **Area Types**: Differentiates between PROVINCE, CITY (Kabupaten/Kota)
- **Hierarchical Structure**: Province codes (2 digits) and City codes (province.xx format)

### 2. Operational Locations

**Source**: `config/initializers/seeders/locations.rb`

**Coverage**: Focus on operational areas in Java, particularly Jakarta metropolitan area

**Structure**:
```ruby
LOCATIONS_DATA = [
  {
    country: "INDONESIA", 
    country_code: "ID", 
    state: "DKI JAKARTA", 
    city: "KOTA ADM. JAKARTA SELATAN"
  },
  # ... other operational locations
]
```

**Operational Coverage**:
- **DKI Jakarta**: All 5 administrative cities (Selatan, Barat, Timur, Utara, Pusat)
- **Banten**: Tangerang Selatan City, Tangerang Regency
- **West Java**: Bogor City/Regency, Bandung City/Regency, Bandung Barat Regency, Bekasi City/Regency, Depok City

**Geographic Focus**: Jabodetabek (Jakarta-Bogor-Depok-Tangerang-Bekasi) metropolitan area

### 3. Service Coverage Mapping

**Source**: `config/initializers/seeders/location_services.rb`

**Purpose**: Maps which services are available in which cities

**Structure**:
```ruby
LOCATION_SERVICES_DATA = [
  {
    service_name: "FISIOHOME_SPECIAL_TIER",
    cities: [
      "KOTA ADM. JAKARTA SELATAN", 
      "KOTA ADM. JAKARTA BARAT", 
      # ... other covered cities
    ]
  }
]
```

**Service Coverage**:
- **FISIOHOME_SPECIAL_TIER**: Covers all Jakarta administrative cities, Tangerang (City & Selatan), Bekasi (City & Regency)
- **Total Coverage**: 10 cities in the Jabodetabek area

### 4. Service Definitions

**Source**: `config/initializers/seeders/services.rb`

**Available Services**:
1. **FISIOHOME_SPECIAL_TIER**: Premium service for Jakarta, Tangerang, Bali, and Bekasi
2. **FISIOHOME**: Standard service (exclude special tier)
3. **WICARAKU_SPECIAL_TIER**: Wicaraku premium service for same areas
4. **WICARAKU**: Wicaraku standard service
5. **PUSAT_OKUPASI**: Occupational therapy services (Jabodetabek and beyond)
6. **PERAWAT_HOMECARE**: Nursing home care services (Jabodetabek and beyond)

## Data Seeding Process

### Execution Order (`db/seeds.rb`):

1. **Indonesian Areas** (Lines 14-25)
   - Seeds all Indonesian provinces and cities
   - Uses `find_or_create_by` to prevent duplicates
   - Logs creation/updates with emoji indicators

2. **Operational Locations** (Lines 27-43)
   - Seeds specific operational locations
   - Validates against country, state, city combination
   - Focus on business operational areas

3. **Location Services Mapping** (Lines 45-67)
   - Links services to specific cities
   - Validates service and city existence
   - Creates service availability mappings

4. **Service Definitions** (Lines 69-81)
   - Seeds service brands/brands
   - Includes service descriptions and codes

## Data Structure Relationships

```
Indonesian Areas (Master Data)
    |
    v
Operational Locations (Subset of Areas)
    |
    v
Location Services (Service Coverage)
    |
    v
Services (Service Definitions)
```

## API Integration Notes

### Country/State/City API
- **Provider**: CountryStateCity API
- **URL**: https://api.countrystatecity.in/play
- **Format**: Uppercase values
- **Usage**: Reference for country names and codes

### Indonesian-Specific API
- **Provider**: Cahyadsn API
- **URL**: https://api.cahyadsn.com/
- **Specialization**: Indonesian administrative areas
- **Usage**: Detailed Indonesian regional data

## Geographic Coverage Summary

### Primary Coverage (Jabodetabek)
- **DKI Jakarta**: 5 administrative cities
- **Banten**: 2 cities (Tangerang Selatan, Tangerang Regency)
- **West Java**: 6 cities (Bogor, Bandung, Bekasi areas)

### Secondary Coverage
- **Complete Indonesian Coverage**: All 38 provinces and 514 cities for reference data
- **Service Expansion**: Ready for expansion to other Indonesian cities

## Data Quality and Validation

### Validation Rules
- **Unique Identification**: Each location identified by country-state-city combination
- **Code Standardization**: Indonesian areas use BPS coding system
- **Service Mapping**: Only maps to existing cities and services
- **Idempotent Seeding**: Safe to run multiple times without duplicates

### Logging and Monitoring
- **Comprehensive Logging**: Each seeding operation logged with status
- **Error Handling**: Warnings for missing services or locations
- **Progress Tracking**: Clear indicators for created vs existing records

## Maintenance and Updates

### Adding New Locations
1. Update `LOCATIONS_DATA` in `config/initializers/seeders/locations.rb`
2. Update `LOCATION_SERVICES_DATA` if services should cover new locations
3. Run `bin/rails db:seed` to apply changes

### Updating Service Coverage
1. Modify `LOCATION_SERVICES_DATA` to add/remove city coverage
2. Ensure cities exist in `LOCATIONS_DATA`
3. Re-seed to apply service mapping changes

### API Data Refresh
- Periodic validation against source APIs recommended
- Indonesian administrative divisions may change with government updates
- Consider automated sync with source APIs for future implementations

## Usage in Application

### Location Validation
- Therapist addresses validate against Indonesian areas
- Service availability checked through location services mapping
- Geographic restrictions enforced through location data

### Service Availability
- Real-time service coverage based on location services mapping
- Service tier differentiation (special vs standard)
- Geographic business logic implementation

This documentation provides a comprehensive overview of how location data is sourced, structured, and maintained within the Fisiohome application ecosystem.
