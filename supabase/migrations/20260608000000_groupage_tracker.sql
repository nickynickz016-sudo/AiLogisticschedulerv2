-- ==========================================================
-- GROUPAGE TRACKER SCHEMAS FOR SUPABASE
-- ==========================================================
DROP TABLE IF EXISTS public.groupage_shipper_entries CASCADE;
DROP TABLE IF EXISTS public.groupage_container_bookings CASCADE;

-- Create table for shipper cargo entries
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
    status TEXT DEFAULT 'Pending' NOT NULL,
    container_booking_id TEXT,
    job_no TEXT,
    packing_date TEXT
);

-- Create table for container bookings
CREATE TABLE public.groupage_container_bookings (
    id TEXT PRIMARY KEY,
    container_type TEXT NOT NULL,
    capacity_cbm NUMERIC NOT NULL,
    destination_country TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    created_by_id TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL,
    container_no TEXT,
    estimated_departure_date TEXT
);

-- Enable RLS
ALTER TABLE public.groupage_shipper_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groupage_container_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for groupage_shipper_entries" ON public.groupage_shipper_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for groupage_container_bookings" ON public.groupage_container_bookings FOR ALL USING (true) WITH CHECK (true);
