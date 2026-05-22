-- FINAL FIX Migration with unique timestamp to force schema refresh
-- Drops the table and recreates it to ensure created_by_id exists
DROP TABLE IF EXISTS public.surveys CASCADE;

CREATE TABLE public.surveys (
    id TEXT PRIMARY KEY,
    surveyor_name TEXT NOT NULL,
    survey_type TEXT NOT NULL,
    enquiry_number TEXT NOT NULL,
    job_number TEXT,
    shipper_name TEXT NOT NULL,
    location TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    survey_date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    client_emails TEXT[],
    google_event_id TEXT,
    created_by_id TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    last_edited_by TEXT,
    last_edited_at BIGINT
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Allow everything for now to avoid authentication issues, 
-- we are handling user ownership in the UI as requested.
CREATE POLICY "Allow all for survey tracker" ON public.surveys FOR ALL USING (true) WITH CHECK (true);
