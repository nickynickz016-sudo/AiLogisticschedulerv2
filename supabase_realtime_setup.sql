-- 1. Enable Realtime for the packing_lists table
-- Only run this if you have a Supabase Pro plan and want to use Realtime features.
-- This allows multiple users to see updates instantly when someone saves a change.

-- Check if the publication exists, if not create it (standard in Supabase)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE packing_lists;

-- 2. Add PDF URL column to packing_lists if you want to store generated PDFs in the future
ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS pdf_url TEXT;
