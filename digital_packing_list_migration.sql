-- Migration to support Digital Packing List cloud storage
CREATE TABLE IF NOT EXISTS packing_lists (
    id TEXT PRIMARY KEY,
    client TEXT,
    job_no TEXT,
    data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Enable Row Level Security
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Allow all authenticated access" ON packing_lists
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
