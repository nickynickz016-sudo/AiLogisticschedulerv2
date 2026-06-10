-- SQL Migration to create master_household_items table for shared surveyor access
-- Run this in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS master_household_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    suggested_cbm NUMERIC DEFAULT 0.20,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE master_household_items ENABLE ROW LEVEL SECURITY;

-- Policy to allow read access to authenticated users
CREATE POLICY "Allow read access to anyone authenticated" ON master_household_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy to allow insert access to authenticated users
CREATE POLICY "Allow inserts to authenticated users" ON master_household_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Insert premium preset seeds (safely ignores duplicates on conflict)
INSERT INTO master_household_items (name) VALUES
('Sofa'), 
('TV Screen'), 
('Coffee Table'), 
('Cabinet'), 
('Rug'), 
('Lamp'), 
('Side Table'), 
('Bookshelf'), 
('Armchair'),
('Bed Frame'), 
('Mattress'), 
('Wardrobe'), 
('Dressing Table'), 
('Chest of Drawers'), 
('Mirror'), 
('Blanket Chest'),
('Refrigerator'), 
('Microwave'), 
('Oven'), 
('Dining Set'), 
('Dishwasher'), 
('Blender'), 
('Kitchen Cabinet'), 
('Gas Stove'),
('Dining Table'), 
('Dining Chairs (Set)'), 
('Buffet / Sideboard'), 
('Chandelier'), 
('Wine Rack'), 
('Display Case'),
('Bath Shelf / Rack'), 
('Laundry Basket'), 
('Storage Cabinet'), 
('Organizer Trolley'),
('Ironing Board'), 
('Storage Box'), 
('Vacuum Cleaner'), 
('Drying Rack'), 
('Foldable Shelves'),
('Bicycle'), 
('Tool Box'), 
('Storage Rack'), 
('Car Jack'), 
('Ladders'), 
('Lawn Mower'),
('Patio Chairs'), 
('Patio Table'), 
('Plant Pots'), 
('Sun Lounger'),
('Desk'), 
('Chair'), 
('Printer'), 
('Monitor'), 
('Filing Cabinet'), 
('Shredder'),
('Luggage Bag'), 
('Carton Boxes (Assorted)'), 
('Safe Deposit Box'), 
('Piano'), 
('Wall Paintings / Frames')
ON CONFLICT (name) DO NOTHING;
