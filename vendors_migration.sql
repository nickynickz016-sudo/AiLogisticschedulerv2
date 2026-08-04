-- SQL Migration: Vendors / Outsource Table for Fleet & Crew & Inventory
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'Outsource Labor', -- e.g. 'Outsource Labor', 'Outsource Truck', 'Outsource Bus', 'Full Moving Services', 'General Outsource'
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    service_provided TEXT,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) and grant permissions
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow all select on vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow all insert on vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow all update on vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow all delete on vendors" ON public.vendors;

-- Create open access policies for app functionality
CREATE POLICY "Allow all select on vendors" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Allow all insert on vendors" ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on vendors" ON public.vendors FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on vendors" ON public.vendors FOR DELETE USING (true);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
