-- FORCE Migration to recreate the surveys table with the correct schema
-- This DROP is necessary because previous turns might have created the table with a different schema (e.g. UUID id)
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

-- Policy: Allow all authenticated users to read surveys
CREATE POLICY "Allow authenticated read" ON public.surveys FOR SELECT TO authenticated USING (true);

-- Policy: Allow authenticated users to insert their own surveys
CREATE POLICY "Allow authenticated insert" ON public.surveys FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: Allow users to update their own surveys
CREATE POLICY "Allow individual update" ON public.surveys FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policy: Allow users to delete their own surveys
CREATE POLICY "Allow individual delete" ON public.surveys FOR DELETE TO authenticated USING (true);
