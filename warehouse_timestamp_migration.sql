
-- ==========================================
-- ADDITIONAL WAREHOUSE CHECKLIST ENHANCEMENTS
-- Add automatic timestamp tracking for all fields
-- ==========================================

ALTER TABLE public.warehouse_checklists ADD COLUMN IF NOT EXISTS field_timestamps jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.night_patrolling_checklists ADD COLUMN IF NOT EXISTS field_timestamps jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.safety_monitoring_checklists ADD COLUMN IF NOT EXISTS field_timestamps jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.surprise_visits ADD COLUMN IF NOT EXISTS field_timestamps jsonb DEFAULT '{}'::jsonb;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
