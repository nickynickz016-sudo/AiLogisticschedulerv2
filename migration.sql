
-- IMPORTANT: Run this entire script in Supabase SQL Editor to fix "Cannot Add Member" issues.

-- 1. Ensure 'type' column exists (Writer Crew, Team Leader, Driver)
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS "type" text;

-- 2. Ensure 'license_number' column exists (For Drivers)
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS license_number text;

-- 3. Ensure 'emirates_id' column exists
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS emirates_id text;

-- 4. Ensure 'status' column exists (Available, On Leave, etc.)
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Available';

-- 5. Ensure 'employee_id' column exists
ALTER TABLE public.personnel 
ADD COLUMN IF NOT EXISTS employee_id text;

-- 6. Ensure vehicles table has necessary columns
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS plate text;

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS status text;

-- 7. Ensure jobs table has allocation columns
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS team_leader text;

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS writer_crew text[];

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS vehicles text[];

-- 8. Add Transporter module columns
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS is_transporter boolean DEFAULT false;

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS drop_off_locations text[];

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS transporter_status text DEFAULT 'Scheduled';

-- Refresh schema
NOTIFY pgrst, 'reload schema';
