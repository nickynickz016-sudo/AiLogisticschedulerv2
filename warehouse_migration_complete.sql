
-- ==========================================
-- WAREHOUSE CHECKLISTS MIGRATION
-- Supports: Closing, Patrolling, Safety, Surprise Visit
-- ==========================================

-- 1. Warehouse Closing Checklist
CREATE TABLE IF NOT EXISTS public.warehouse_checklists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date text NOT NULL,
    time text NOT NULL,
    status text NOT NULL DEFAULT 'Pending Approval',
    office_locked jsonb DEFAULT '{"status": false, "remarks": ""}'::jsonb,
    lights_off jsonb DEFAULT '{"status": false, "remarks": ""}'::jsonb,
    emergency_exits_locked jsonb DEFAULT '{"status": false, "remarks": ""}'::jsonb,
    warehouse_sections jsonb DEFAULT '{"A": {"status": false, "lights_off": false, "biometric_working": false, "fans_off": false, "time": "", "remarks": ""}, "B": {"status": false, "lights_off": false, "biometric_working": false, "fans_off": false, "time": "", "remarks": ""}, "C": {"status": false, "lights_off": false, "biometric_working": false, "fans_off": false, "time": "", "remarks": ""}, "D": {"status": false, "lights_off": false, "biometric_working": false, "fans_off": false, "time": "", "remarks": ""}}'::jsonb,
    no_personal_belongings boolean DEFAULT false,
    no_personal_belongings_timestamp text,
    water_taps_closed boolean DEFAULT false,
    water_taps_closed_timestamp text,
    round_taken boolean DEFAULT false,
    round_taken_timestamp text,
    lights_operational boolean DEFAULT false,
    lights_operational_timestamp text,
    vehicles_bikes integer DEFAULT 0,
    vehicles_bikes_timestamp text,
    vehicles_4wheelers integer DEFAULT 0,
    vehicles_4wheelers_timestamp text,
    last_person_name text,
    last_person_name_timestamp text,
    last_person_time text,
    main_gate_locked_time text,
    main_gate_locked_time_timestamp text,
    observations text,
    observations_timestamp text,
    security_guard_name text,
    security_guard_signature text,
    admin_incharge_name text,
    admin_incharge_signature text,
    warehouse_incharge_name text,
    warehouse_incharge_signature text,
    created_at bigint NOT NULL,
    submitted_by text NOT NULL,
    approved_at bigint,
    approved_by text,
    declined_at bigint,
    declined_by text,
    decline_comments text
);

-- 2. Night Patrolling Checklist
CREATE TABLE IF NOT EXISTS public.night_patrolling_checklists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date text NOT NULL,
    location text NOT NULL,
    status text NOT NULL DEFAULT 'Pending Approval',
    rounds jsonb DEFAULT '[]'::jsonb,
    unusual_observation text,
    security_guard_name text,
    security_guard_signature text,
    admin_incharge_name text,
    admin_incharge_signature text,
    warehouse_incharge_name text,
    warehouse_incharge_signature text,
    created_at bigint NOT NULL,
    submitted_by text NOT NULL,
    approved_at bigint,
    approved_by text,
    declined_at bigint,
    declined_by text,
    decline_comments text
);

-- 3. Safety Monitoring Checklist
CREATE TABLE IF NOT EXISTS public.safety_monitoring_checklists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date text NOT NULL,
    time text NOT NULL,
    location text NOT NULL,
    status text NOT NULL DEFAULT 'Pending Approval',
    hydrant_tank_full jsonb,
    hydrant_indicator_working jsonb,
    hydrant_hose_reel_healthy jsonb,
    hydrant_power_supply jsonb,
    hydrant_pumps_auto jsonb,
    hydrant_valves_on jsonb,
    hydrant_no_leakage jsonb,
    hydrant_pressure_gauge jsonb,
    hydrant_pump_room_clean jsonb,
    sprinkler_pressure_gauge jsonb,
    sprinkler_main_valve_on jsonb,
    detection_power_supply jsonb,
    detection_panels_healthy jsonb,
    cctv_images_clear jsonb,
    cctv_dvr1_backup jsonb,
    cctv_dvr2_backup jsonb,
    gas_control_panel_healthy jsonb,
    gas_abort_switch_accessible jsonb,
    gas_pressure_gauge_green jsonb,
    biometric_operational jsonb,
    emergency_exit_signage jsonb,
    security_guard_name text,
    security_guard_signature text,
    admin_incharge_name text,
    admin_incharge_signature text,
    warehouse_incharge_name text,
    warehouse_incharge_signature text,
    created_at bigint NOT NULL,
    submitted_by text NOT NULL,
    approved_at bigint,
    approved_by text,
    declined_at bigint,
    declined_by text,
    decline_comments text
);

-- 4. Surprise Night Visit Checklist
CREATE TABLE IF NOT EXISTS public.surprise_visits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date text NOT NULL,
    in_time text NOT NULL,
    exit_time text NOT NULL,
    check_conducted_by text,
    name_of_facility text,
    status text NOT NULL DEFAULT 'Pending Approval',
    main_gate_guard_name text,
    main_gate_guard_alert boolean,
    main_gate_response_time text,
    main_gate_locked boolean,
    main_gate_ask_id boolean,
    main_gate_guard_uniform boolean,
    main_gate_entry_registered boolean,
    bms_guard_name text,
    bms_guard_alert boolean,
    bms_guard_uniform boolean,
    bms_cctv_functioning boolean,
    bms_fire_alarm_status text,
    bms_fire_pumps_auto boolean,
    docs_log_book_checked boolean,
    docs_closing_updated boolean,
    docs_safety_updated boolean,
    docs_patrolling_followed boolean,
    facility_gates_locked boolean,
    facility_storage_locked boolean,
    facility_temp_room_locked boolean,
    facility_emergency_exits text,
    facility_computers_off boolean,
    facility_round_completed boolean,
    facility_no_personal_belongings boolean,
    facility_temp_reading text,
    facility_external_vehicles text,
    facility_windows_shut boolean,
    lighting_all_on boolean,
    lighting_dim_areas text,
    lighting_defective_points text,
    activities_staff_on_duty text,
    activities_reporting_head text,
    activities_ops_areas text,
    activities_general_behavior text,
    activities_last_person_name text,
    comments text,
    security_guard_name text,
    security_guard_signature text,
    admin_incharge_name text,
    admin_incharge_signature text,
    warehouse_incharge_name text,
    warehouse_incharge_signature text,
    created_at bigint NOT NULL,
    submitted_by text NOT NULL,
    approved_at bigint,
    approved_by text,
    declined_at bigint,
    declined_by text,
    decline_comments text
);

-- RLS Policies
ALTER TABLE public.warehouse_checklists ADD COLUMN IF NOT EXISTS field_timestamps jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.night_patrolling_checklists ADD COLUMN IF NOT EXISTS field_timestamps jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.safety_monitoring_checklists ADD COLUMN IF NOT EXISTS field_timestamps jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.surprise_visits ADD COLUMN IF NOT EXISTS field_timestamps jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.warehouse_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.night_patrolling_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_monitoring_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surprise_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to anon" ON public.warehouse_checklists FOR ALL TO anon USING (true);
CREATE POLICY "Allow all to authenticated" ON public.warehouse_checklists FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to anon" ON public.night_patrolling_checklists FOR ALL TO anon USING (true);
CREATE POLICY "Allow all to authenticated" ON public.night_patrolling_checklists FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to anon" ON public.safety_monitoring_checklists FOR ALL TO anon USING (true);
CREATE POLICY "Allow all to authenticated" ON public.safety_monitoring_checklists FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to anon" ON public.surprise_visits FOR ALL TO anon USING (true);
CREATE POLICY "Allow all to authenticated" ON public.surprise_visits FOR ALL TO authenticated USING (true);

-- Refresh schema
NOTIFY pgrst, 'reload schema';
