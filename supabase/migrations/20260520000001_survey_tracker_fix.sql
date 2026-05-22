-- Migration to add created_by_id if missing or recreate table
-- This ensures the column exists in the schema cache
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='surveys' AND column_name='created_by_id') THEN
        ALTER TABLE IF EXISTS public.surveys ADD COLUMN created_by_id TEXT;
        -- If the table was empty or we want to ensure existing rows have a value
        UPDATE public.surveys SET created_by_id = 'legacy' WHERE created_by_id IS NULL;
        ALTER TABLE public.surveys ALTER COLUMN created_by_id SET NOT NULL;
    END IF;
END $$;

-- Update RLS policies to be more specific if they weren't already
DROP POLICY IF EXISTS "Allow authenticated read" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.surveys;
DROP POLICY IF EXISTS "Allow individual update" ON public.surveys;
DROP POLICY IF EXISTS "Allow individual delete" ON public.surveys;

CREATE POLICY "Allow authenticated read" ON public.surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.surveys FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow individual update" ON public.surveys FOR UPDATE TO authenticated USING (auth.uid()::text = created_by_id OR (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'ADMIN') WITH CHECK (true);
CREATE POLICY "Allow individual delete" ON public.surveys FOR DELETE TO authenticated USING (auth.uid()::text = created_by_id OR (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'ADMIN');
