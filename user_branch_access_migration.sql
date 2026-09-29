-- ==============================================================================
-- WRITER RELOCATIONS ERP - BRANCH AUTHORIZATION & SEPARATION MIGRATION
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Branches Reference Table
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR(20) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL,
    phone_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Seed the 3 Operating Hubs (UAE, KSA, QATAR)
INSERT INTO public.branches (id, code, name, country, currency, currency_symbol, phone_code)
VALUES
  ('UAE', 'UAE', 'United Arab Emirates', 'United Arab Emirates', 'AED', 'AED', '+971'),
  ('KSA', 'KSA', 'Saudi Arabia', 'Kingdom of Saudi Arabia', 'SAR', 'SAR', '+966'),
  ('QATAR', 'QATAR', 'Qatar', 'State of Qatar', 'QAR', 'QAR', '+974')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  currency = EXCLUDED.currency,
  currency_symbol = EXCLUDED.currency_symbol,
  phone_code = EXCLUDED.phone_code;

-- 3. Create / Update System Users Table with Branch Authorization Columns
CREATE TABLE IF NOT EXISTS public.system_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    status TEXT NOT NULL DEFAULT 'Active',
    avatar TEXT,
    branch VARCHAR(20) DEFAULT 'UAE',
    allowed_branches TEXT[] DEFAULT ARRAY['UAE']::TEXT[],
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure branch columns exist if system_users already existed
ALTER TABLE public.system_users 
ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';

ALTER TABLE public.system_users 
ADD COLUMN IF NOT EXISTS allowed_branches TEXT[] DEFAULT ARRAY['UAE']::TEXT[];

-- Update existing users without allowed_branches
UPDATE public.system_users 
SET allowed_branches = ARRAY['UAE', 'KSA', 'QATAR'] 
WHERE role = 'ADMIN' AND (allowed_branches IS NULL OR array_length(allowed_branches, 1) = 0);

UPDATE public.system_users 
SET allowed_branches = ARRAY['UAE'] 
WHERE allowed_branches IS NULL OR array_length(allowed_branches, 1) = 0;

-- 4. Seed Standard Staff Accounts with Strict Branch Authorizations
INSERT INTO public.system_users (employee_id, name, username, password, role, status, branch, allowed_branches, avatar)
VALUES
  ('ADMIN-001', 'Administrator', 'Admin', 'Admin', 'ADMIN', 'Active', 'UAE', ARRAY['UAE', 'KSA', 'QATAR'], 'https://api.dicebear.com/8.x/initials/svg?seed=Admin'),
  ('OPS-ADMIN-01', 'Karthik', 'Karthik', 'Writer@123', 'USER', 'Active', 'UAE', ARRAY['UAE', 'KSA', 'QATAR'], 'https://api.dicebear.com/8.x/initials/svg?seed=Karthik'),
  ('WI061938', 'Groupage Specialist (WI061938)', 'WI061938', 'Writer@123', 'USER', 'Active', 'UAE', ARRAY['UAE', 'KSA'], 'https://api.dicebear.com/8.x/initials/svg?seed=WI061938'),
  ('OPS-101', 'Roxanne', 'User1', 'User1', 'USER', 'Active', 'UAE', ARRAY['UAE'], 'https://api.dicebear.com/8.x/initials/svg?seed=Roxanne'),
  ('OPS-102', 'Poonam', 'User2', 'User2', 'USER', 'Active', 'KSA', ARRAY['KSA'], 'https://api.dicebear.com/8.x/initials/svg?seed=Poonam'),
  ('OPS-103', 'Divya', 'User3', 'User3', 'USER', 'Active', 'QATAR', ARRAY['QATAR'], 'https://api.dicebear.com/8.x/initials/svg?seed=Divya'),
  ('OPS-104', 'Param', 'User4', 'User4', 'USER', 'Active', 'UAE', ARRAY['UAE'], 'https://api.dicebear.com/8.x/initials/svg?seed=Param'),
  ('OPS-105', 'Anoop', 'User5', 'User5', 'USER', 'Active', 'UAE', ARRAY['UAE'], 'https://api.dicebear.com/8.x/initials/svg?seed=Anoop'),
  ('ACC-001', 'Accounts Team', 'Accounts', 'Accountdxb@123', 'USER', 'Active', 'UAE', ARRAY['UAE', 'KSA', 'QATAR'], 'https://api.dicebear.com/8.x/initials/svg?seed=Accounts')
ON CONFLICT (employee_id) DO UPDATE SET
  branch = EXCLUDED.branch,
  allowed_branches = EXCLUDED.allowed_branches;

-- 5. Add Branch Column to all Data Tables (Strict Isolation)
-- Jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.jobs SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_branch ON public.jobs(branch);

-- Job Cost Sheets
ALTER TABLE public.job_cost_sheets ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.job_cost_sheets SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_cost_sheets_branch ON public.job_cost_sheets(branch);

-- Quotations
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.quotations SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_branch ON public.quotations(branch);

-- Surveys
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.surveys SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_surveys_branch ON public.surveys(branch);

-- Warehouse Checklists
ALTER TABLE public.warehouse_checklists ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.warehouse_checklists SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouse_checklists_branch ON public.warehouse_checklists(branch);

-- Night Patrolling Checklists
ALTER TABLE public.night_patrolling_checklists ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.night_patrolling_checklists SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_night_patrolling_branch ON public.night_patrolling_checklists(branch);

-- Safety Monitoring Checklists
ALTER TABLE public.safety_monitoring_checklists ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.safety_monitoring_checklists SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_safety_monitoring_branch ON public.safety_monitoring_checklists(branch);

-- Surprise Visits
ALTER TABLE public.surprise_visits ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.surprise_visits SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_surprise_visits_branch ON public.surprise_visits(branch);

-- Daily Monitoring Checklists
ALTER TABLE public.daily_monitoring_checklists ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.daily_monitoring_checklists SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_monitoring_branch ON public.daily_monitoring_checklists(branch);

-- Groupage Shipper Entries
ALTER TABLE public.groupage_shipper_entries ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.groupage_shipper_entries SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_groupage_shippers_branch ON public.groupage_shipper_entries(branch);

-- Groupage Container Bookings
ALTER TABLE public.groupage_container_bookings ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.groupage_container_bookings SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_groupage_bookings_branch ON public.groupage_container_bookings(branch);

-- Import Clearance Cost Sheets
ALTER TABLE public.import_clearance_cost_sheets ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.import_clearance_cost_sheets SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_import_cost_sheets_branch ON public.import_clearance_cost_sheets(branch);

-- Inventory Items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.inventory_items SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch ON public.inventory_items(branch);

-- Personnel
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.personnel SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_personnel_branch ON public.personnel(branch);

-- Vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.vehicles SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_branch ON public.vehicles(branch);

-- Vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.vendors SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_branch ON public.vendors(branch);

-- Activity Logs
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.activity_logs SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_branch ON public.activity_logs(branch);

-- 6. Ensure system_settings table exists
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INT PRIMARY KEY DEFAULT 1,
    company_name TEXT DEFAULT 'Writer Relocations',
    company_logo TEXT,
    holidays JSONB DEFAULT '[]'::jsonb,
    daily_job_limits JSONB DEFAULT '{}'::jsonb,
    system_alert JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
INSERT INTO public.system_settings (id, company_name)
VALUES (1, 'Writer Relocations')
ON CONFLICT (id) DO NOTHING;

-- 7. Grant Table Permissions for Anon & Authenticated Roles
GRANT ALL ON public.branches TO anon, authenticated, service_role;
GRANT ALL ON public.system_users TO anon, authenticated, service_role;
GRANT ALL ON public.jobs TO anon, authenticated, service_role;
GRANT ALL ON public.job_cost_sheets TO anon, authenticated, service_role;
GRANT ALL ON public.quotations TO anon, authenticated, service_role;
GRANT ALL ON public.surveys TO anon, authenticated, service_role;
GRANT ALL ON public.warehouse_checklists TO anon, authenticated, service_role;
GRANT ALL ON public.night_patrolling_checklists TO anon, authenticated, service_role;
GRANT ALL ON public.safety_monitoring_checklists TO anon, authenticated, service_role;
GRANT ALL ON public.surprise_visits TO anon, authenticated, service_role;
GRANT ALL ON public.daily_monitoring_checklists TO anon, authenticated, service_role;
GRANT ALL ON public.groupage_shipper_entries TO anon, authenticated, service_role;
GRANT ALL ON public.groupage_container_bookings TO anon, authenticated, service_role;
GRANT ALL ON public.import_clearance_cost_sheets TO anon, authenticated, service_role;
GRANT ALL ON public.inventory_items TO anon, authenticated, service_role;
GRANT ALL ON public.personnel TO anon, authenticated, service_role;
GRANT ALL ON public.vehicles TO anon, authenticated, service_role;
GRANT ALL ON public.vendors TO anon, authenticated, service_role;
GRANT ALL ON public.activity_logs TO anon, authenticated, service_role;
GRANT ALL ON public.system_settings TO anon, authenticated, service_role;

-- 8. Reload PostgREST API schema cache
NOTIFY pgrst, 'reload schema';
