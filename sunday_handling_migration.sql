-- Add sunday_handling column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sunday_handling TEXT;

-- Update existing jobs to have a default value if needed (optional)
-- UPDATE jobs SET sunday_handling = 'Skip' WHERE sunday_handling IS NULL;
