-- Migration to fix RLS for anon users since we use mock login
-- This allows the delete button (and insert/update) to work
DROP POLICY IF EXISTS "Allow all for survey tracker" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.surveys;
DROP POLICY IF EXISTS "Allow individual update" ON public.surveys;
DROP POLICY IF EXISTS "Allow individual delete" ON public.surveys;

-- Create a truly public policy for the survey tracker
-- Since the app is behind its own login, we rely on UI-side ownership
CREATE POLICY "Public full access for surveys" ON public.surveys FOR ALL USING (true) WITH CHECK (true);
