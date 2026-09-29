-- ==============================================================================
-- WRITER RELOCATIONS - QUOTATIONS MODULE SUPABASE MIGRATION
-- Supports: Groupage FCL Export & FCL Export Quotations
-- Features: Draft / Saved / Finalized status, Inclusions/Exclusions bullet arrays,
--           Bold & highlighted special notes, Clickable Logo, and Terms links.
-- ==============================================================================

-- 1. Create Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    quotation_no TEXT UNIQUE NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('FCL_EXPORT', 'GROUPAGE_FCL_EXPORT')),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SAVED', 'FINALIZED')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    prepared_by TEXT,
    contact_email TEXT,
    contact_phone TEXT,

    -- Client & Route Details
    client_name TEXT NOT NULL,
    company_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    origin_address TEXT,
    origin_city TEXT DEFAULT 'Dubai',
    origin_country TEXT DEFAULT 'United Arab Emirates',
    destination_address TEXT,
    destination_city TEXT,
    destination_country TEXT,

    -- Cargo & Shipment Parameters
    service_type TEXT DEFAULT 'Door-to-Door',
    container_size TEXT,
    groupage_mode TEXT,
    estimated_volume_cbm NUMERIC(10, 2),
    estimated_volume_cft NUMERIC(10, 2),
    estimated_weight_kg NUMERIC(10, 2),
    origin_port TEXT DEFAULT 'Jebel Ali Port (AEJEA), Dubai',
    destination_port TEXT,
    transit_time TEXT,
    commodity_description TEXT DEFAULT 'Used Household Goods & Personal Effects',

    -- Financial & Pricing Structure
    currency TEXT NOT NULL DEFAULT 'AED',
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    vat_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_terms TEXT DEFAULT '100% advance prior to packing / container dispatch',

    -- Bulletized Inclusions & Exclusions
    inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Special Notes (Bold & Highlight Options)
    special_notes TEXT,
    special_notes_bold BOOLEAN NOT NULL DEFAULT true,
    special_notes_highlighted BOOLEAN NOT NULL DEFAULT true,

    -- Web Hyperlinks
    terms_and_conditions_url TEXT DEFAULT 'https://www.writerrelocations.com/terms-and-conditions',
    terms_and_conditions_text TEXT DEFAULT 'Writer Relocations Standard Terms and Conditions',
    logo_url TEXT DEFAULT 'https://www.writerrelocations.com',

    -- Timestamps & Governance
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by TEXT,
    finalized_at TIMESTAMPTZ,
    finalized_by TEXT,
    version INTEGER NOT NULL DEFAULT 1
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_quotations_no ON public.quotations(quotation_no);
CREATE INDEX IF NOT EXISTS idx_quotations_format ON public.quotations(format);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON public.quotations(client_name);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON public.quotations(created_at DESC);

-- 3. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION public.set_quotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quotations_updated_at ON public.quotations;
CREATE TRIGGER trigger_quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.set_quotations_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated and anonymous users
DROP POLICY IF EXISTS "Allow select for all on quotations" ON public.quotations;
CREATE POLICY "Allow select for all on quotations"
ON public.quotations FOR SELECT
USING (true);

-- Allow insert access
DROP POLICY IF EXISTS "Allow insert for all on quotations" ON public.quotations;
CREATE POLICY "Allow insert for all on quotations"
ON public.quotations FOR INSERT
WITH CHECK (true);

-- Allow update access
DROP POLICY IF EXISTS "Allow update for all on quotations" ON public.quotations;
CREATE POLICY "Allow update for all on quotations"
ON public.quotations FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow delete access
DROP POLICY IF EXISTS "Allow delete for all on quotations" ON public.quotations;
CREATE POLICY "Allow delete for all on quotations"
ON public.quotations FOR DELETE
USING (true);

-- 5. Enable Supabase Realtime (Optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quotations;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
