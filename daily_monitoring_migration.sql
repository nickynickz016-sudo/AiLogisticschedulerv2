
-- ==========================================
-- DAILY MONITORING 10.1 MIGRATION
-- ==========================================

CREATE TABLE IF NOT EXISTS public.daily_monitoring_checklists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date text NOT NULL,
    time text NOT NULL,
    location text NOT NULL,
    status text NOT NULL DEFAULT 'Pending Approval',
    
    -- 1. Facility Exterior & Perimeter
    perimeter_clean boolean DEFAULT false,
    gates_functioning boolean DEFAULT false,
    external_lighting_ok boolean DEFAULT false,
    parking_organized boolean DEFAULT false,

    -- 2. Interior Cleanliness & Hygiene
    aisles_clear boolean DEFAULT false,
    floor_clean boolean DEFAULT false,
    waste_bins_cleared boolean DEFAULT false,
    pest_control_sighting boolean DEFAULT false,

    -- 3. Equipment & Tools
    forklifts_checked boolean DEFAULT false,
    racking_visual_inspect boolean DEFAULT false,
    charging_station_safe boolean DEFAULT false,
    scanners_operational boolean DEFAULT false,

    -- 4. Staff & Safety Compliance
    staff_ppe_compliance boolean DEFAULT false,
    first_aid_accessible boolean DEFAULT false,
    emergency_exits_clear boolean DEFAULT false,
    no_smoking_enforced boolean DEFAULT false,

    -- 5. Inventory & Operations
    pallets_stacked_safely boolean DEFAULT false,
    hazmat_stored_properly boolean DEFAULT false,
    temp_sensitive_monitored boolean DEFAULT false,

    -- Signatures
    security_guard_name text,
    security_guard_signature text,
    admin_incharge_name text,
    admin_incharge_signature text,
    warehouse_incharge_name text,
    warehouse_incharge_signature text,

    field_timestamps jsonb DEFAULT '{}'::jsonb,
    created_at bigint NOT NULL,
    submitted_by text NOT NULL,
    approved_at bigint,
    approved_by text,
    declined_at bigint,
    declined_by text,
    decline_comments text
);

-- RLS Policies
ALTER TABLE public.daily_monitoring_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to anon" ON public.daily_monitoring_checklists FOR ALL TO anon USING (true);
CREATE POLICY "Allow all to authenticated" ON public.daily_monitoring_checklists FOR ALL TO authenticated USING (true);

-- Refresh schema
NOTIFY pgrst, 'reload schema';
