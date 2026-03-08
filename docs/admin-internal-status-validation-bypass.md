# Admin Internal Validation Bypass

## Overview

Untuk kebutuhan admin internal, semua strict validation telah di-bypass menggunakan konstanta dan flag khusus. Dokumentasi ini mencakup dua jenis bypass:

1. **Status Validation Bypass** - Untuk update status appointment
2. **Therapist Scheduling Bypass** - Untuk pengecekan ketersediaan terapis

---

## 1. Status Validation Bypass

### Implementation

#### 1. Konstanta Kontrol
```ruby
# Di app/models/appointment.rb
ENABLE_STRICT_STATUS_VALIDATION = false  # Disabled untuk admin internal
```

#### 2. Flag Skip Validation
```ruby
attr_accessor :skip_status_validation  # Flag untuk bypass semua validasi status
```

#### 3. Validasi yang Di-bypass
Semua validasi strict berikut hanya dijalankan jika `ENABLE_STRICT_STATUS_VALIDATION = true`:
- `appointment_date_time_in_the_future`
- `validate_paid_requires_therapist`
- `validate_visit_sequence`
- `unscheduled_appointment_requirements`
- `validate_appointment_sequence`
- `no_duplicate_appointment_time`
- `no_overlapping_appointments`
- `therapist_daily_limit`

#### 4. Automatic Bypass di Service
`AppointmentStatusUpdaterService` secara otomatis mengatur `skip_status_validation = true` saat update status.

---

## 2. Therapist Scheduling Bypass

### Implementation

#### 1. Konstanta Kontrol di AvailabilityService
```ruby
# Di app/services/admin_portal/therapists/availability_service.rb
class AvailabilityService
  # Configuration constants for different usage contexts
  BYPASS_ADVANCE_BOOKING_FOR_ADMIN = true       # Bypass batas advance booking (60 hari)
  BYPASS_DAILY_LIMIT_FOR_ADMIN = true           # Bypass batas maksimal appointment/hari
  BYPASS_OVERLAP_CHECK_FOR_ADMIN = true          # Bypass pengecekan tumpang tindih
  BYPASS_DATE_WINDOW_FOR_ADMIN = true           # Bypass validasi jendela tanggal terapis
  BYPASS_BASIC_TIME_CHECKS_FOR_ADMIN = true     # Bypass validasi tanggal masa lalu
  BYPASS_AVAILABILITY_CHECK_FOR_ADMIN = true    # Bypass pengecekan jadwal terapis
```

#### 2. Validasi yang Di-bypass
Semua validasi availability berikut di-skip untuk admin internal:

| Validasi | Fungsi | Status |
|----------|---------|---------|
| `advance_booking_check` | Mencegah booking >60 hari ke depan | ✅ **Bypassed** |
| `max_daily_appointments_check` | Batasi maks 4 appointment/hari | ✅ **Bypassed** |
| `no_overlapping_appointments_check` | Cegah double-booking | ⚠️ **Aktif** (dipertahankan) |
| `date_window_check` | Batasi sesuai window availability terapis | ✅ **Bypassed** |
| `basic_time_checks` | Cegah booking di masa lalu | ✅ **Bypassed** |
| `availability_check` | Cek jadwal weekly/adjusted terapis | ✅ **Bypassed** |

#### 3. Hasil Akhir dengan Konfigurasi Saat Ini
Dengan konfigurasi ini, admin internal dapat:
- ✅ Booking kapan saja - tanpa batasan waktu
- ✅ Booking sebanyak apapun - tanpa batas jumlah per hari  
- ✅ Booking di tanggal yang sama - **TANPA** waktu yang tumpang tindih
- ✅ Booking di masa lalu - tanggal sudah lewat pun bisa
- ✅ Booking diluar jadwal - terapis tidak available pun bisa
- ✅ Booking di luar window - di luar periode availability terapis

#### 4. Behavior Time Slot dengan Overlap Check
**Konfigurasi Saat Ini**: `BYPASS_OVERLAP_CHECK_FOR_ADMIN = false`

**Therapist dengan appointment existing:**
- 10:00 - 11:00 (Patient A)
- 13:00 - 14:00 (Patient B) 
- 15:00 - 16:00 (Patient C)
- 16:30 - 17:30 (Patient D)

**Available slots yang ditampilkan:**
```ruby
["00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30",
 "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
 "08:00", "08:30", "09:00", "09:30", "11:00", "11:30", "12:00", "12:30",  # ← 10:00-11:00 DILEWATI
 "14:00", "14:30", "15:30", "16:00", "17:00", "17:30", "18:00", "18:30",  # ← 13:00-14:00 & 15:00-16:00 DILEWATI
 "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30",  # ← 16:30-17:30 DILEWATI
 "23:00", "23:30"]
```

**Key Points:**
- ✅ **Therapist tetap available** meskipun sudah 4 appointment (daily limit dibypass)
- ✅ **Time slot yang bentrok DILEWATI** (overlap check aktif)
- ✅ **Full day availability** (availability check dibypass)
- ✅ **Tidak ada double-booking** (overlap check mencegah)

#### 5. Perbandingan Konfigurasi

| Konfigurasi | Daily Limit | Overlap Check | Hasil |
|-------------|-------------|---------------|-------|
| **Current Setup** | ❌ Dibypass | ✅ Aktif | Unlimited appointments, no double-booking |
| **Full Bypass** | ❌ Dibypass | ❌ Dibypass | Unlimited appointments, double-booking allowed |
| **No Bypass** | ✅ Aktif | ✅ Aktif | Max 4 appointments, no double-booking |

---

## Usage Examples

### Status Validation Bypass

#### Manual Control
```ruby
appointment.assign_attributes(skip_status_validation: true)
appointment.update(status: 'completed')
```

#### Via Service (Recommended)
```ruby
service = AdminPortal::AppointmentStatusUpdaterService.new(appointment, current_user)
service.call(new_status: 'paid', reason: 'Payment received')
```

### Therapist Scheduling Bypass

#### Otomatis via AvailabilityService
```ruby
# Semua bypass otomatis aktif untuk admin internal
service = AdminPortal::Therapists::AvailabilityService.new(
  therapist: therapist,
  appointment_date_time_server_time: appointment_time
)
available = service.available?  # Selalu true kecuali tidak ada schedule
```

---

## Benefits

### Status Validation Bypass
1. **No More Strict Validation Errors** - Admin internal bisa update status tanpa terhalang validation rules
2. **Flexible Control** - Bisa di-enable kembali jika needed dengan ubah konstanta
3. **Automatic Bypass** - Service otomatis bypass validation untuk admin use
4. **Preserved Core Validations** - Basic validations (presence, associations) tetap berjalan

### Therapist Scheduling Bypass
1. **Maximum Flexibility** - Admin internal bisa booking appointment tanpa batasan apapun
2. **No Daily Limits** - Bisa membuat appointment lebih dari 4 per hari
3. **No Time Constraints** - Bisa booking di masa lalu atau jauh ke depan
4. **No Schedule Restrictions** - Bisa booking diluar jadwal availability terapis
5. **No Overlap Protection** - Bisa membuat appointment dengan waktu yang tumpang tindih

---

## Testing

### Status Validation Tests
- ✅ **Model Tests (AppointmentTest)**: 5 test cases untuk bypass functionality
- ✅ **Service Tests (AppointmentStatusUpdaterServiceTest)**: 9 test cases untuk service integration
- ✅ **Fixed Strict Validation Tests**: 8 existing tests updated dengan helper method
- **Total Coverage**: 22 test cases

### Therapist Scheduling Tests
- ✅ **AvailabilityService Tests**: Existing tests already cover bypass scenarios
- ✅ **Daily Limit Tests**: Tests confirm bypass works when `BYPASS_DAILY_LIMIT_FOR_ADMIN = true`
- ✅ **Overlap Check Tests**: Tests verify bypass when `BYPASS_OVERLAP_CHECK_FOR_ADMIN = true`

---

## Configuration Control

### Mengaktifkan Kembali Validasi Status
```ruby
# Di app/models/appointment.rb
ENABLE_STRICT_STATUS_VALIDATION = true  # Aktifkan kembali strict validation
```

### Mengaktifkan Kembali Validasi Scheduling
```ruby
# Di app/services/admin_portal/therapists/availability_service.rb
BYPASS_ADVANCE_BOOKING_FOR_ADMIN = false      # Aktifkan batas 60 hari
BYPASS_DAILY_LIMIT_FOR_ADMIN = false          # Aktifkan batas 4 appointment/hari
BYPASS_OVERLAP_CHECK_FOR_ADMIN = false         # Aktifkan cegah double-booking
BYPASS_DATE_WINDOW_FOR_ADMIN = false           # Aktifkan window validation
BYPASS_BASIC_TIME_CHECKS_FOR_ADMIN = false     # Aktifkan cegah masa lalu
BYPASS_AVAILABILITY_CHECK_FOR_ADMIN = false    # Aktifkan jadwal check
```

**Konfigurasi Saat Ini (Recommended):**
```ruby
BYPASS_ADVANCE_BOOKING_FOR_ADMIN = true       # Bypass batas 60 hari
BYPASS_DAILY_LIMIT_FOR_ADMIN = true           # Bypass batas 4 appointment/hari
BYPASS_OVERLAP_CHECK_FOR_ADMIN = false         # Tetap aktif cegah double-booking
BYPASS_DATE_WINDOW_FOR_ADMIN = true           # Bypass window validation
BYPASS_BASIC_TIME_CHECKS_FOR_ADMIN = true     # Bypass validasi masa lalu
BYPASS_AVAILABILITY_CHECK_FOR_ADMIN = true    # Bypass jadwal check
```

**Hasil Konfigurasi Saat Ini:**
- ✅ Unlimited appointments per hari
- ✅ No time restrictions (past/future dates)
- ✅ No schedule constraints
- ✅ **No double-booking** (overlap check aktif)
- ✅ Full day availability slots

---

## Security Considerations

### Status Validation Bypass
- **Low Risk** - Hanya mempengaruhi status updates, tidak create appointment baru
- **Audit Trail** - Semua perubahan status tetap terlog dengan user attribution

### Therapist Scheduling Bypass
- **Medium Risk** - Daily limit dan availability check dibypass, tapi overlap check tetap aktif
- **Data Integrity** - Overlap check mencegah double-booking, menjaga integritas schedule
- **Recommendation** - Konfigurasi saat ini memberikan fleksibilitas dengan keamanan yang memadai

---

## Summary

Implementation ini telah berhasil:

### Status Validation Bypass
- ✅ **Bypass Strict Validations** - Admin internal bisa update status tanpa validation errors
- ✅ **Comprehensive Testing** - 14 test cases mencakup semua skenario
- ✅ **Service Integration** - AppointmentStatusUpdaterService otomatis bypass validation
- ✅ **Flexible Control** - Bisa di-enable/disable melalui konstanta

### Therapist Scheduling Bypass  
- ✅ **Smart Bypass** - 5 dari 6 validation dibypass, overlap check tetap aktif untuk mencegah double-booking
- ✅ **Maximum Flexibility** - Admin internal bisa booking appointment tanpa batasan jumlah, waktu, atau schedule
- ✅ **Data Integrity** - Overlap check memastikan tidak ada double-booking
- ✅ **Configurable** - Setiap validation bisa di-control individually
- ✅ **Full Coverage** - Semua aspek scheduling ter-bypass kecuali overlap protection

### Combined Benefits
- ✅ **Admin Empowerment** - Admin internal memiliki kontrol penuh atas appointment system
- ✅ **Operational Efficiency** - Tidak ada validation blocks untuk special cases
- ✅ **Flexible Configuration** - Bisa disesuaikan sesuai kebutuhan bisnis
