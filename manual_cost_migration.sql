
-- Migration to add manual_items, cbm, and job_category to job_cost_sheets
-- This ensures all fields used in the code are present in the database.

ALTER TABLE public.job_cost_sheets 
ADD COLUMN IF NOT EXISTS manual_items jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cbm numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS job_category text;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
