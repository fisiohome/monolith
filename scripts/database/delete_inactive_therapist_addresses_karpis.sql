-- SQL Script untuk menghapus therapist addresses yang tidak aktif
-- untuk therapist dengan employment type KARPIS
-- 
-- PERINGATAN: Script ini akan menghapus data secara permanen!
-- Pastikan Anda telah backup data sebelum menjalankan script ini.

-- Step 1: Preview data yang akan dihapus (sama dengan query SELECT Anda)
SELECT 
    t.id AS therapist_id,
    t.name AS therapist_name,
    t.registration_number,
    t.phone_number,
    t.employment_type,
    t.employment_status,
    ta.active AS address_active,
    a.id AS address_id,
    a.address,
    a.postal_code,
    a.latitude,
    a.longitude,
    a.notes AS address_notes,
    l.country,
    l.country_code,
    l.state,
    l.city,
    ta.created_at AS therapist_address_created_at,
    ta.updated_at AS therapist_address_updated_at,
    u.email AS therapist_email
FROM therapists t
INNER JOIN therapist_addresses ta ON t.id = ta.therapist_id
INNER JOIN addresses a ON ta.address_id = a.id
INNER JOIN locations l ON a.location_id = l.id
INNER JOIN users u ON t.user_id = u.id
WHERE 
    t.employment_type = 'KARPIS'::employment_type_enum
    AND ta.active = false
ORDER BY 
    t.name ASC,
    l.city ASC,
    ta.updated_at DESC;

-- Step 2: Hitung jumlah record yang akan dihapus
SELECT 
    COUNT(*) AS total_records_to_delete,
    COUNT(DISTINCT t.id) AS unique_therapists_affected
FROM therapists t
INNER JOIN therapist_addresses ta ON t.id = ta.therapist_id
INNER JOIN addresses a ON ta.address_id = a.id
INNER JOIN locations l ON a.location_id = l.id
INNER JOIN users u ON t.user_id = u.id
WHERE 
    t.employment_type = 'KARPIS'::employment_type_enum
    AND ta.active = false;

-- Step 3: Backup data ke tabel temporary (opsional tapi direkomendasikan)
CREATE TEMP TABLE therapist_addresses_backup AS
SELECT 
    t.id AS therapist_id,
    t.name AS therapist_name,
    t.registration_number,
    t.phone_number,
    t.employment_type,
    t.employment_status,
    ta.active AS address_active,
    a.id AS address_id,
    a.address,
    a.postal_code,
    a.latitude,
    a.longitude,
    a.notes AS address_notes,
    l.country,
    l.country_code,
    l.state,
    l.city,
    ta.created_at AS therapist_address_created_at,
    ta.updated_at AS therapist_address_updated_at,
    u.email AS therapist_email,
    NOW() AS deleted_at
FROM therapists t
INNER JOIN therapist_addresses ta ON t.id = ta.therapist_id
INNER JOIN addresses a ON ta.address_id = a.id
INNER JOIN locations l ON a.location_id = l.id
INNER JOIN users u ON t.user_id = u.id
WHERE 
    t.employment_type = 'KARPIS'::employment_type_enum
    AND ta.active = false;

-- Step 4: DELETE - Menghapus therapist_addresses yang tidak aktif untuk KARPIS
-- Hapus record dari therapist_addresses
DELETE FROM therapist_addresses
WHERE id IN (
    SELECT ta.id
    FROM therapists t
    INNER JOIN therapist_addresses ta ON t.id = ta.therapist_id
    WHERE 
        t.employment_type = 'KARPIS'::employment_type_enum
        AND ta.active = false
);

-- Step 5: Verifikasi hasil penghapusan
SELECT 
    COUNT(*) AS remaining_inactive_karpis_addresses
FROM therapists t
INNER JOIN therapist_addresses ta ON t.id = ta.therapist_id
WHERE 
    t.employment_type = 'KARPIS'::employment_type_enum
    AND ta.active = false;

-- Step 6: Lihat backup data (jika diperlukan untuk restore)
SELECT * FROM therapist_addresses_backup ORDER BY therapist_name, city;

-- Step 7: Drop temporary table backup (setelah selesai verifikasi)
DROP TABLE therapist_addresses_backup;

-- Catatan:
-- 1. Script ini hanya menghapus dari therapist_addresses, bukan dari tabel addresses
-- 2. Addresses yang tidak terpakai tetap ada di tabel addresses
-- 3. Jika ingin menghapus addresses yang tidak terpakai juga, jalankan script tambahan di bawah:

-- Opsional: Hapus addresses yang tidak terpakai (tidak memiliki referensi)
DELETE FROM addresses a
WHERE NOT EXISTS (
    SELECT 1 FROM therapist_addresses ta WHERE ta.address_id = a.id
) AND NOT EXISTS (
    SELECT 1 FROM patient_addresses pa WHERE pa.address_id = a.id  
) AND NOT EXISTS (
    SELECT 1 FROM user_addresses ua WHERE ua.address_id = a.id
) AND NOT EXISTS (
    SELECT 1 FROM appointment_address_histories aah WHERE aah.location_id = a.id
);
