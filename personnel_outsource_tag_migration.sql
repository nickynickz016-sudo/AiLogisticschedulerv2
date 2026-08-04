-- Migration: Add Outsource Vendor tagging to Personnel and Vehicles tables
-- Run this in your Supabase SQL Editor

-- 1. Add columns to personnel table
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS is_outsource BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vendor_name TEXT;

-- 2. Add columns to vehicles table (for outsource trucks/buses)
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS is_outsource BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vendor_name TEXT;

-- 3. Notify schema cache to reload
NOTIFY pgrst, 'reload schema';
