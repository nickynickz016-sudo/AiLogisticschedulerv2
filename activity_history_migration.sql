-- ======================================================
-- Activity History & Audit Trail Migration for Supabase
-- ======================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id text PRIMARY KEY,
    timestamp bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id text NOT NULL,
    user_name text NOT NULL,
    user_role text,
    action_type text NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ALLOCATE', 'LOCK', 'UNLOCK', 'APPROVE', 'REJECT', 'STATUS_CHANGE', 'RESTORE'
    entity_type text NOT NULL, -- 'Job Schedule', 'Groupage Tracker', 'Survey', 'Fleet & Crew', 'Warehouse', 'Import Clearance', 'User Management', 'Inventory'
    entity_id text NOT NULL,
    entity_title text,
    details text NOT NULL,
    previous_data jsonb,
    new_data jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public insert access on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public update access on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public delete access on activity_logs" ON public.activity_logs;

-- Create policies for public / authenticated access
CREATE POLICY "Allow public read access on activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on activity_logs" ON public.activity_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on activity_logs" ON public.activity_logs FOR DELETE USING (true);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON public.activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
