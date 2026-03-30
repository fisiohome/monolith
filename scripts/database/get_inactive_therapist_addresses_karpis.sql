-- SQL Script untuk mendapatkan data therapist address yang tidak aktif
-- untuk therapist dengan employment type KARPIS

-- Query utama untuk mendapatkan therapist addresses yang tidak aktif
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

-- Query alternatif: hanya menampilkan therapist dengan multiple addresses
-- dimana beberapa tidak aktif
SELECT 
    t.id AS therapist_id,
    t.name AS therapist_name,
    t.registration_number,
    t.phone_number,
    t.employment_type,
    t.employment_status,
    COUNT(*) AS total_addresses,
    COUNT(CASE WHEN ta.active = true THEN 1 END) AS active_addresses,
    COUNT(CASE WHEN ta.active = false THEN 1 END) AS inactive_addresses,
    STRING_AGG(
        CASE 
            WHEN ta.active = false THEN 
                CONCAT(a.address, ' (', l.city, ', ', l.state, ')')
        END, ', '
    ) AS inactive_addresses_list
FROM therapists t
INNER JOIN therapist_addresses ta ON t.id = ta.therapist_id
INNER JOIN addresses a ON ta.address_id = a.id
INNER JOIN locations l ON a.location_id = l.id
WHERE 
    t.employment_type = 'KARPIS'::employment_type_enum
    AND ta.active = false
GROUP BY 
    t.id, t.name, t.registration_number, t.phone_number, 
    t.employment_type, t.employment_status
HAVING COUNT(CASE WHEN ta.active = false THEN 1 END) > 0
ORDER BY 
    t.name ASC;

-- Query untuk statistik
SELECT 
    COUNT(DISTINCT t.id) AS total_karpis_therapists,
    COUNT(DISTINCT CASE WHEN ta.active = false THEN t.id END) AS therapists_with_inactive_addresses,
    COUNT(ta.id) AS total_addresses,
    COUNT(CASE WHEN ta.active = true THEN 1 END) AS active_addresses,
    COUNT(CASE WHEN ta.active = false THEN 1 END) AS inactive_addresses,
    ROUND(
        (COUNT(CASE WHEN ta.active = false THEN 1 END) * 100.0 / NULLIF(COUNT(ta.id), 0)), 
        2
    ) AS inactive_percentage
FROM therapists t
INNER JOIN therapist_addresses ta ON t.id = ta.therapist_id
WHERE t.employment_type = 'KARPIS'::employment_type_enum;

-- Query untuk mendapatkan inactive addresses per city
SELECT 
    l.city,
    l.state,
    COUNT(DISTINCT t.id) AS therapists_count,
    COUNT(ta.id) AS inactive_addresses_count
FROM therapists t
INNER JOIN therapist_addresses ta ON t.id = ta.therapist_id
INNER JOIN addresses a ON ta.address_id = a.id
INNER JOIN locations l ON a.location_id = l.id
WHERE 
    t.employment_type = 'KARPIS'::employment_type_enum
    AND ta.active = false
GROUP BY l.city, l.state
ORDER BY 
    inactive_addresses_count DESC,
    l.city ASC;
