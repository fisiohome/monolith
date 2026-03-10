# Therapist Availability Diagnosis

## Overview
Halaman diagnosis terapis membantu admin internal menganalisis mengapa terapis spesifik tidak muncul untuk kunjungan pasien tertentu.

## URL
- **Halaman**: `/admin-portal/therapist-diagnosis`
- **API Analysis**: `POST /admin-portal/therapist-diagnosis/analyze`

## Cara Penggunaan

### 1. Input Data
- **Registration Number** (wajib): Nomor registrasi pasien
- **Appointment Date & Time** (wajib): Tanggal dan waktu appointment
- **Patient Name** (opsional): Nama pasien
- **Service** (opsional): Layanan yang dibutuhkan
- **Location** (opsional): Lokasi layanan

### 2. Analysis Results
Setelah klik "Analyze Availability", sistem akan menampilkan:

#### Summary Cards
- Total Therapists: Jumlah semua terapis aktif
- Available: Jumlah terapis yang tersedia
- Unavailable: Jumlah terapis tidak tersedia
- Availability: Persentase ketersediaan

#### Available Therapists Tab
Daftar terapis yang tersedia untuk booking dengan informasi:
- Nama dan registrasi number
- Employment type dan status
- Schedule configuration status

#### Unavailable Therapists Tab
Daftar terapis tidak tersedia dengan diagnosis detail:

##### Categories
- **Account Issue**: Masalah suspend/akun
- **Employment Issue**: Masalah status kerja
- **Schedule Conflict**: Konflik jadwal/waktu
- **Service Mismatch**: Tidak qualified untuk layanan
- **Other**: Masalah lainnya

##### Diagnosis Detail
- Alasan spesifik mengapa tidak tersedia
- Rekomendasi action untuk mengatasi
- Priority level untuk troubleshooting

## Technical Details

### Backend Components

#### Controller
- `AdminPortal::TherapistDiagnosisController`
- Authentication: `authenticate_user!`
- Methods: `index` (render page), `analyze` (API endpoint)

#### Service
- `AdminPortal::TherapistDiagnosisService`
- Comprehensive diagnosis logic
- Reuses existing `AvailabilityService`
- Detailed analysis with recommendations

#### Analysis Checks
1. Account suspension status
2. Employment verification
3. Service compatibility
4. Schedule configuration
5. Time availability (using existing logic)
6. Daily appointment limits
7. Conflicting appointments
8. Location constraints (extensible)

### Frontend Components

#### React Component
- `TherapistDiagnosisPage`
- Modern UI dengan TailwindCSS
- Search dan filter capabilities
- Responsive design
- Smooth animations

#### Features
- Real-time analysis
- Category-based filtering
- Search functionality
- Detailed diagnosis cards
- Actionable recommendations

## Implementation Files

### Backend
- `app/controllers/admin_portal/therapist_diagnosis_controller.rb`
- `app/services/admin_portal/therapist_diagnosis_service.rb`
- `config/routes.rb` (routing additions)

### Frontend
- `app/frontend/components/admin-portal/therapist/therapist-diagnosis-page.tsx`

## Usage Examples

### API Request
```javascript
const response = await fetch('/admin-portal/therapist-diagnosis/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    registration_number: 'REG123456',
    appointment_date_time: '2026-03-08T10:00:00',
    patient_name: 'John Doe',
    service_name: 'Physical Therapy',
    location: 'Jakarta'
  })
});
```

### Response Format
```json
{
  "success": true,
  "data": {
    "patient_info": { ... },
    "summary": { ... },
    "available_therapists": [ ... ],
    "unavailable_therapists": [ ... ]
  }
}
```

## Benefits

### For Admin Internal
- **Troubleshooting**: Cepat identifikasi masalah ketersediaan
- **Optimization**: Improve therapist utilization
- **Insights**: Understand availability patterns
- **Efficiency**: Reduce manual investigation time

### For System
- **Reuses Logic**: Menggunakan existing AvailabilityService
- **Performance**: Optimized database queries
- **Extensible**: Mudah tambah fitur baru
- **Maintainable**: Clean architecture

## Future Enhancements

1. **Location-based Analysis**: Geospatial therapist availability
2. **Historical Data**: Track availability patterns over time
3. **Bulk Analysis**: Analyze multiple appointments
4. **Export Features**: Download diagnosis reports
5. **Integration**: Connect with scheduling optimization

## Troubleshooting

### Common Issues
- **Authentication Error**: Pastikan user sudah login
- **No Data**: Check registration number dan date time format
- **Slow Performance**: Consider database indexing for large datasets

### Debug Tips
- Check Rails logs untuk detailed error messages
- Verify therapist schedule configuration
- Check service assignments for therapists
- Validate timezone settings

---

*Fitur ini dirancang untuk membantu admin internal melakukan troubleshooting ketersediaan terapis secara efisien dan mendapatkan actionable insights untuk improve patient booking experience.*
