-- 1. Create the bucket for Packing List photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('packing_list_photos', 'packing_list_photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create a policy to allow public read access to all files in this bucket
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'packing_list_photos');

-- 3. Create a policy to allow authenticated users to upload files
CREATE POLICY "Authenticated Upload Access" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'packing_list_photos');

-- 4. Create a policy to allow authenticated users to update/delete files
CREATE POLICY "Authenticated Update Access" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'packing_list_photos');

CREATE POLICY "Authenticated Delete Access" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'packing_list_photos');
