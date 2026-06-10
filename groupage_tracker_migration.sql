-- ==========================================================
-- GROUPAGE TRACKER SCHEMAS FOR SUPABASE
-- ==========================================================
-- Paste and run this SQL script inside your Supabase SQL Editor.
-- This sets up the 'groupage_shipper_entries' and 'groupage_container_bookings' tables 
-- and configures permissive Row-Level Security (RLS) policies.

DROP TABLE IF EXISTS public.groupage_shipper_entries CASCADE;
DROP TABLE IF EXISTS public.groupage_container_bookings CASCADE;

-- 1. Create table for Consolidations/Shipper cargo entries
CREATE TABLE public.groupage_shipper_entries (
    id TEXT PRIMARY KEY,
    shipper_name TEXT NOT NULL,
    volume_cbm NUMERIC NOT NULL,
    destination_address TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    created_by_id TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL, -- 'Pending', 'Grouped' (consolidated)
    container_booking_id TEXT, -- references groupage_container_bookings(id)
    job_no TEXT,
    packing_date TEXT
);

-- 2. Create table for container bookings created by WI061938
CREATE TABLE public.groupage_container_bookings (
    id TEXT PRIMARY KEY,
    container_type TEXT NOT NULL, -- '20ft Container - 30 CBM', '40ft Container - 60 CBM', '40ft HQ container - 70 CBM'
    capacity_cbm NUMERIC NOT NULL,
    destination_country TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    created_by_id TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS or configure permissive access policies matching the rest of the workspace
ALTER TABLE public.groupage_shipper_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groupage_container_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for groupage_shipper_entries" ON public.groupage_shipper_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for groupage_container_bookings" ON public.groupage_container_bookings FOR ALL USING (true) WITH CHECK (true);
