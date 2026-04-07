
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

-- 9. Inventory Enhancements
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS opening_stock integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchased_stock integer DEFAULT 0;

-- 10. Create inventory_purchases table
CREATE TABLE IF NOT EXISTS public.inventory_purchases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id bigint REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity integer NOT NULL,
    purchase_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Enable RLS on inventory_purchases
ALTER TABLE public.inventory_purchases ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for inventory_purchases
CREATE POLICY "Allow authenticated read access" ON public.inventory_purchases
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert access" ON public.inventory_purchases
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update access" ON public.inventory_purchases
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete access" ON public.inventory_purchases
    FOR DELETE USING (auth.role() = 'authenticated');

-- 13. Create inventory_consumption table
CREATE TABLE IF NOT EXISTS public.inventory_consumption (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id bigint REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    job_id text,
    quantity integer NOT NULL,
    consumption_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Enable RLS on inventory_consumption
ALTER TABLE public.inventory_consumption ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS policies for inventory_consumption
CREATE POLICY "Allow authenticated read access" ON public.inventory_consumption
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert access" ON public.inventory_consumption
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Refresh schema
NOTIFY pgrst, 'reload schema';
