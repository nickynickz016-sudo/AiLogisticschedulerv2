
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum JobStatus {
  PENDING_ADD = 'PENDING_ADD',
  PENDING_DELETE = 'PENDING_DELETE',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export enum CustomsStatus {
  PENDING_DOCUMENTATION = 'PENDING_DOCUMENTATION',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  CLEARED = 'CLEARED',
  REJECTED_CUSTOMS = 'REJECTED_CUSTOMS'
}

export type LoadingType = 'Warehouse Removal' | 'Storage' | 'Local Storage' | 'Direct Loading' | 'Delivery';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ShipmentDetailsType = 'Local Move' | 'Sea FCL' | 'AIR' | 'AIR LCL' | 'SEA LCL' | 'Groupage' | 'Road';

export type MainCategory = 'Commercial' | 'Agent' | 'Private' | 'Corporate';
export type SubCategory = 'Export' | 'Import' | 'Fine arts Installation';

export interface SpecialRequests {
  handyman: boolean;
  manpower: boolean;
  overtime: boolean;
  documents: boolean;
  packingList: boolean;
  crateCertificate: boolean;
  walkThrough: boolean;
}

export interface UserPermissions {
  dashboard: boolean;
  schedule: boolean;
  jobBoard: boolean;
  warehouse: boolean;
  importClearance: boolean;
  approvals: boolean;
  writerDocs: boolean;
  inventory: boolean; 
  tracking: boolean; // Added Tracking permission
  surveyTracker: boolean; // Added Survey Tracker permission
  warehouseChecklist: boolean;
  resources: boolean;
  capacity: boolean;
  users: boolean;
  transporter: boolean;
  ai: boolean;
  digitalPackingList: boolean;
}

export interface PackageDetail {
  number: string;
  contents: string;
  comments: string;
}

export interface PackingListItem {
  id: string;
  article: string;
  qty: number;
  vol_cft?: number;
  vol_cbm?: number;
  tvol_cft?: number;
  tvol_cbm?: number;
  pbo?: boolean;
  dismantle_assemble?: boolean;
  room?: string;
  packages: PackageDetail[];
}

export interface PackingList {
  id: string;
  client: string;
  ref_no: string;
  shipment_id: string;
  mode: string;
  origin_city: string;
  destination_city: string;
  survey_date: string;
  items: PackingListItem[];
  created_at: number;
  signatures?: {
    writerSupervisorName: string;
    writerSupervisorSig: string; // Base64
    clientName: string;
    clientSig: string; // Base64
    companySupervisorName: string;
    companySupervisorSig: string; // Base64
    secondClientName: string;
    secondClientSig: string; // Base64
  };
}

export interface UserProfile {
  id: string;
  employee_id: string; // Mandatory
  name: string;
  role: UserRole;
  permissions: UserPermissions;
  avatar: string;
  status: 'Active' | 'Disabled';
  username?: string;
  password?: string;
}

export interface Personnel {
  id:string;
  employee_id: string; // Mandatory
  name: string;
  type: 'Team Leader' | 'Writer Crew' | 'Driver';
  status: 'Available' | 'Annual Leave' | 'Sick Leave' | 'Personal Leave';
  emirates_id: string; // Mandatory
  license_number?: string; // Optional, specific for Drivers
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string; // Mandatory
  status: 'Available' | 'Out of Service' | 'Maintenance';
}

export interface TrackingStepDetails {
  partner_name?: string;
  contact_person?: string;
  phone?: string;
  notes?: string;
  updated_at?: string;
  completed?: boolean;
}

export interface CustomsHistoryEntry {
  status: string;
  updated_at: string;
  updated_by: string;
}

// FIX: Made several properties optional to support different job creation contexts (e.g., Warehouse vs. Schedule).
// This prevents type errors where not all job details are available upon creation.
export type TransporterStatus = 'Scheduled' | 'In Transit' | 'Completed';

export enum SurveyStatus {
  SCHEDULED = 'Survey Scheduled',
  BOOKED = 'Booked',
  NEGOTIATION = 'Negotiation',
  LOST = 'Lost'
}

export type SurveyType = 'Physical' | 'Whatsapp' | 'Video Call';
export type SurveyMode = 'Export' | 'Import' | 'Domestic' | 'Storage';

export interface Survey {
  id: string;
  surveyor_name: string;
  survey_type: SurveyType;
  enquiry_number: string;
  job_number?: string; // Required if status is Booked
  shipper_name: string;
  location: string;
  mode: SurveyMode;
  status: SurveyStatus;
  survey_date: string;
  start_time?: string;
  end_time?: string;
  client_emails?: string[];
  google_event_id?: string;
  created_at: number;
  last_edited_by?: string;
  last_edited_at?: number;
}

export interface Job {
  id: string; // Job No.
  title: string;
  shipper_name: string;
  shipper_phone?: string;
  client_email?: string; // Added for notifications
  location?: string;
  shipment_details?: ShipmentDetailsType;
  description?: string;
  priority: Priority;
  agent_name?: string;
  loading_type: LoadingType;
  main_category?: MainCategory;
  sub_category?: SubCategory;
  shuttle?: 'Yes' | 'No';
  long_carry?: 'Yes' | 'No';
  special_requests?: SpecialRequests;
  volume_cbm?: number;
  job_time?: string;
  job_date: string;
  duration?: number; // New field for multi-day jobs
  status: JobStatus;
  created_at: number;
  requester_id: string;
  assigned_to: string;
  is_warehouse_activity?: boolean;
  is_import_clearance?: boolean;
  is_transporter?: boolean; // New field for Transporter module
  is_locked?: boolean;
  last_edited_by?: string;
  last_edited_at?: number;
  
  // Admin allocations
  team_leader?: string;
  writer_crew?: string[];
  vehicle?: string; // Legacy field for single vehicle/backward compat
  vehicles?: string[]; // Updated to support multiple vehicles

  // Fields for Import Clearance
  bol_number?: string;
  container_number?: string;
  customs_status?: CustomsStatus;
  customs_history?: CustomsHistoryEntry[];

  // Fields for Tracking
  tracking_current_step?: number;
  tracking_data?: Record<string, TrackingStepDetails>; // Key is the step ID (e.g. "1", "2")

  // Fields for Warehouse
  activity_name?: string;

  // Fields for Transporter
  drop_off_locations?: string[]; // List of locations
  transporter_status?: 'Scheduled' | 'In Transit' | 'Completed';
}

export interface InventoryItem {
  id: number;
  code: string;
  description: string;
  unit: string;
  price: number;
  stock: number;
  opening_stock: number;
  purchased_stock: number;
  critical_stock: number;
  is_outsource?: boolean;
  vendor_name?: string;
  outsource_type?: string;
  truck_schedule?: string;
  location?: string;
}

export interface InventoryPurchase {
  id: number;
  inventory_id: number;
  quantity: number;
  purchase_date: string;
  created_at: string;
}

export interface InventoryConsumption {
  id: string;
  inventory_id: number;
  job_id: string;
  quantity: number;
  consumption_date: string;
  created_at: string;
}

export interface InventoryPriceHistory {
  id: string;
  inventory_id: number;
  price: number;
  effective_date: string;
  created_at: string;
}

export interface CostSheetItem {
  inventory_id: number;
  code: string;
  description: string;
  unit: string;
  price: number;
  issued_qty: number;
  returned_qty: number;
  is_outsource?: boolean;
  vendor_name?: string;
  outsource_type?: string;
  truck_schedule?: string;
  location?: string;
}

export interface JobCostSheet {
  job_id: string;
  items: CostSheetItem[];
  status: 'Issued' | 'Returned' | 'Finalized';
  total_cost: number;
  packing_date?: string;
  cbm?: number;
  job_category?: 'Import' | 'Export' | 'Storage' | 'Domestic';
}

export interface NightPatrollingCheckpoint {
  camera_no: string;
  location: string;
  actual_time: string;
  guard_name: string;
  signature?: string;
  timestamp?: string;
}

export interface NightPatrollingRound {
  id: string;
  title: string;
  time_range: string;
  checkpoints: NightPatrollingCheckpoint[];
}

export interface NightPatrollingChecklist {
  id: string;
  date: string;
  location: string;
  status: 'Pending Approval' | 'Approved' | 'Declined';
  rounds: NightPatrollingRound[];
  unusual_observation: string;
  security_guard_name: string;
  security_guard_signature?: string;
  admin_incharge_name?: string;
  admin_incharge_signature?: string;
  warehouse_incharge_name?: string;
  warehouse_incharge_signature?: string;
  field_timestamps?: Record<string, string>;
  created_at: number;
  submitted_by: string;
  approved_at?: number;
  approved_by?: string;
  declined_at?: number;
  declined_by?: string;
  decline_comments?: string;
}

export interface DailyMonitoringChecklist {
  id: string;
  date: string;
  time: string;
  location: string;
  status: 'Pending Approval' | 'Approved' | 'Declined';

  // 1. Facility Exterior & Perimeter
  perimeter_clean: boolean;
  gates_functioning: boolean;
  external_lighting_ok: boolean;
  parking_organized: boolean;

  // 2. Interior Cleanliness & Hygiene
  aisles_clear: boolean;
  floor_clean: boolean;
  waste_bins_cleared: boolean;
  pest_control_sighting: boolean;

  // 3. Equipment & Tools
  forklifts_checked: boolean;
  racking_visual_inspect: boolean;
  charging_station_safe: boolean;
  scanners_operational: boolean;

  // 4. Staff & Safety Compliance
  staff_ppe_compliance: boolean;
  first_aid_accessible: boolean;
  emergency_exits_clear: boolean;
  no_smoking_enforced: boolean;

  // 5. Inventory & Operations
  pallets_stacked_safely: boolean;
  hazmat_stored_properly: boolean;
  temp_sensitive_monitored: boolean;

  // Signatures
  security_guard_name: string;
  security_guard_signature?: string; // Base64
  admin_incharge_name?: string;
  admin_incharge_signature?: string; // Base64
  warehouse_incharge_name?: string;
  warehouse_incharge_signature?: string; // Base64

  field_timestamps?: Record<string, string>;
  created_at: number;
  submitted_by: string;
  approved_at?: number;
  approved_by?: string;
  declined_at?: number;
  declined_by?: string;
  decline_comments?: string;
}

export interface WarehouseChecklist {
  id: string;
  date: string;
  time: string;
  status: 'Pending Approval' | 'Approved' | 'Declined';
  // Items 01-04 (First section)
  office_locked: { status: boolean; remarks: string; timestamp?: string };
  lights_off: { status: boolean; remarks: string; timestamp?: string };
  emergency_exits_locked: { status: boolean; remarks: string; timestamp?: string };
  warehouse_sections: {
    A: { status: boolean; lights_off: boolean; biometric_working: boolean; fans_off: boolean; time: string; remarks: string; timestamp?: string };
    B: { status: boolean; lights_off: boolean; biometric_working: boolean; fans_off: boolean; time: string; remarks: string; timestamp?: string };
    C: { status: boolean; lights_off: boolean; biometric_working: boolean; fans_off: boolean; time: string; remarks: string; timestamp?: string };
    D: { status: boolean; lights_off: boolean; biometric_working: boolean; fans_off: boolean; time: string; remarks: string; timestamp?: string };
  };
  // More items 01-04 (Second section)
  no_personal_belongings: boolean;
  no_personal_belongings_timestamp?: string;
  water_taps_closed: boolean;
  water_taps_closed_timestamp?: string;
  round_taken: boolean;
  round_taken_timestamp?: string;
  lights_operational: boolean;
  lights_operational_timestamp?: string;
  // Item 05
  vehicles_bikes: number;
  vehicles_bikes_timestamp?: string;
  vehicles_4wheelers: number;
  vehicles_4wheelers_timestamp?: string;
  // Item 06-07
  last_person_name: string;
  last_person_name_timestamp?: string;
  last_person_time: string;
  main_gate_locked_time: string;
  main_gate_locked_time_timestamp?: string;
  // Item 08
  observations: string;
  observations_timestamp?: string;
  // Signatures
  security_guard_name: string;
  security_guard_signature?: string; // Base64
  admin_incharge_name?: string;
  admin_incharge_signature?: string; // Base64
  warehouse_incharge_name?: string;
  warehouse_incharge_signature?: string; // Base64
  field_timestamps?: Record<string, string>;
  
  created_at: number;
  submitted_by: string;
  approved_at?: number;
  approved_by?: string;
  declined_at?: number;
  declined_by?: string;
  decline_comments?: string;
}

export interface SafetyMonitoringChecklist {
  id: string;
  date: string;
  time: string;
  location: string;
  status: 'Pending Approval' | 'Approved' | 'Declined';
  
  // 01 FIRE HYDRANT SYSTEM
  hydrant_tank_full: { status: boolean; litres: string; remarks: string; timestamp?: string };
  hydrant_indicator_working: { status: boolean; remarks: string; timestamp?: string };
  hydrant_hose_reel_healthy: { status: boolean; count: string; remarks: string; timestamp?: string };
  hydrant_power_supply: { status: boolean; remarks: string; timestamp?: string };
  hydrant_pumps_auto: { status: boolean; remarks: string; timestamp?: string };
  hydrant_valves_on: { status: boolean; remarks: string; timestamp?: string };
  hydrant_no_leakage: { status: boolean; remarks: string; timestamp?: string };
  hydrant_pressure_gauge: { status: boolean; kg: string; remarks: string; timestamp?: string };
  hydrant_pump_room_clean: { status: boolean; remarks: string; timestamp?: string };

  // 02 SPRINKLER SYSTEM
  sprinkler_pressure_gauge: { status: boolean; kg: string; remarks: string; timestamp?: string };
  sprinkler_main_valve_on: { status: boolean; remarks: string; timestamp?: string };

  // 03 FIRE DETECTION SYSTEM
  detection_power_supply: { status: boolean; remarks: string; timestamp?: string };
  detection_panels_healthy: { status: boolean; remarks: string; timestamp?: string };

  // 04 CCTV
  cctv_images_clear: { status: boolean; camera_count: string; remarks: string; timestamp?: string };
  cctv_dvr1_backup: { status: boolean; from: string; to: string; days: string; remarks: string; timestamp?: string };
  cctv_dvr2_backup: { status: boolean; from: string; to: string; days: string; remarks: string; timestamp?: string };

  // 05 GAS SUPPRESSION (FM-200)
  gas_control_panel_healthy: { status: boolean; remarks: string; timestamp?: string };
  gas_abort_switch_accessible: { status: boolean; remarks: string; timestamp?: string };
  gas_pressure_gauge_green: { status: boolean; remarks: string; timestamp?: string };

  // 06 BIOMETRIC
  biometric_operational: { status: boolean; total_devices: string; remarks: string; timestamp?: string };

  // 07 EMERGENCY EXIT
  emergency_exit_signage: { status: boolean; remarks: string; timestamp?: string };

  // Signatures
  security_guard_name: string;
  security_guard_signature?: string; // Base64
  admin_incharge_name?: string;
  admin_incharge_signature?: string; // Base64
  warehouse_incharge_name?: string;
  warehouse_incharge_signature?: string; // Base64
  
  field_timestamps?: Record<string, string>;
  created_at: number;
  submitted_by: string;
  approved_at?: number;
  approved_by?: string;
  declined_at?: number;
  declined_by?: string;
  decline_comments?: string;
}

export interface SurpriseVisitChecklist {
  id: string;
  date: string;
  in_time: string;
  exit_time: string;
  check_conducted_by: string;
  name_of_facility: string;
  status: 'Pending Approval' | 'Approved' | 'Declined';

  // 1 Security Check - Main Gate
  main_gate_guard_name: string;
  main_gate_guard_alert: boolean;
  main_gate_response_time: string;
  main_gate_locked: boolean;
  main_gate_ask_id: boolean;
  main_gate_guard_uniform: boolean;
  main_gate_entry_registered: boolean;

  // 2 Security Check - BMS Cabin
  bms_guard_name: string;
  bms_guard_alert: boolean;
  bms_guard_uniform: boolean;
  bms_cctv_functioning: boolean;
  bms_fire_alarm_status: 'Normal' | 'Fault';
  bms_fire_pumps_auto: boolean;

  // 3 Check - Documents and Checklists
  docs_log_book_checked: boolean;
  docs_closing_updated: boolean;
  docs_safety_updated: boolean;
  docs_patrolling_followed: boolean;

  // 4 Security Checks of Facility
  facility_gates_locked: boolean;
  facility_storage_locked: boolean;
  facility_temp_room_locked: boolean;
  facility_emergency_exits: 'Locked' | 'Open';
  facility_computers_off: boolean;
  facility_round_completed: boolean;
  facility_no_personal_belongings: boolean;
  facility_temp_reading: string;
  facility_external_vehicles: string;
  facility_windows_shut: boolean;

  // 5 Security Check - Compound Lighting
  lighting_all_on: boolean;
  lighting_dim_areas: string;
  lighting_defective_points: string;

  // 6 Security Check - Activities in the facility
  activities_staff_on_duty: string;
  activities_reporting_head: string;
  activities_ops_areas: string;
  activities_general_behavior: string;
  activities_last_person_name: string;

  // 7 Comments
  comments: string;

  // Signatures
  security_guard_name: string;
  security_guard_signature?: string; // Base64
  admin_incharge_name?: string;
  admin_incharge_signature?: string; // Base64
  warehouse_incharge_name?: string;
  warehouse_incharge_signature?: string; // Base64
  
  field_timestamps?: Record<string, string>;
  created_at: number;
  submitted_by: string;
  approved_at?: number;
  approved_by?: string;
  declined_at?: number;
  declined_by?: string;
  decline_comments?: string;
}

export interface SystemSettings {
  daily_job_limits: Record<string, number>; // date -> max jobs
  holidays: string[]; // array of ISO date strings (YYYY-MM-DD)
  company_logo?: string; // Base64 string of the logo
  system_alert?: {
    active: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'maintenance';
  };
}
