
-- Add Outsource-related columns to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS is_outsource boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vendor_name text,
ADD COLUMN IF NOT EXISTS outsource_type text,
ADD COLUMN IF NOT EXISTS truck_schedule text,
ADD COLUMN IF NOT EXISTS location text;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
