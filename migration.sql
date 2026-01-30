
-- Run this in your Supabase SQL Editor to fix the missing column error

-- Add 'type' column to personnel table if it doesn't exist
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS "type" text;

-- Add 'license_number' column to personnel table if it doesn't exist
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS license_number text;

-- Add 'emirates_id' column to personnel table if it doesn't exist
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS emirates_id text;

-- Ensure vehicles table has necessary columns
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS plate text;

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS status text;

-- Refresh the schema cache to ensure the API picks up the changes
NOTIFY pgrst, 'reload schema';
