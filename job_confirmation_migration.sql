-- Migration to add `is_confirmed` column to the `jobs` table
-- Run this code in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Select your project, open SQL Editor, paste this query, and click "Run".

-- 1. Add `is_confirmed` column to the `jobs` table of type BOOLEAN defaulting to FALSE.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;

-- 2. Optional: Set any existing jobs where is_confirmed is currently null to be false to start clean.
UPDATE public.jobs SET is_confirmed = false WHERE is_confirmed IS NULL;
