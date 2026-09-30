
export type BranchCode = 'UAE' | 'KSA' | 'QATAR';

export interface Branch {
  id: BranchCode;
  code: BranchCode;
  name: string;
  country: string;
  currency: string;
  currency_symbol: string;
  phone_code: string;
  flag: string;
  badge_color: string;
  address?: string;
  port?: string;
}

export const BRANCHES: Record<BranchCode, Branch> = {
  UAE: {
    id: 'UAE',
    code: 'UAE',
    name: 'United Arab Emirates',
    country: 'United Arab Emirates',
    currency: 'AED',
    currency_symbol: 'AED',
    phone_code: '+971',
    flag: '🇦🇪',
    badge_color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    address: 'Dubai & Abu Dhabi, UAE',
    port: 'Jebel Ali Port / Port Rashid'
  },
  KSA: {
    id: 'KSA',
    code: 'KSA',
    name: 'Saudi Arabia',
    country: 'Kingdom of Saudi Arabia',
    currency: 'SAR',
    currency_symbol: 'SAR',
    phone_code: '+966',
    flag: '🇸🇦',
    badge_color: 'bg-green-100 text-green-800 border-green-300',
    address: 'Riyadh & Jeddah, KSA',
    port: 'Jeddah Islamic Port / King Abdulaziz Port Dammam'
  },
  QATAR: {
    id: 'QATAR',
    code: 'QATAR',
    name: 'Qatar',
    country: 'State of Qatar',
    currency: 'QAR',
    currency_symbol: 'QAR',
    phone_code: '+974',
    flag: '🇶🇦',
    badge_color: 'bg-amber-100 text-amber-800 border-amber-300',
    address: 'Doha, Qatar',
    port: 'Hamad Port, Doha'
  }
};

export enum UserRole {
  ADMIN = 'ADMIN',
  SEMI_ADMIN = 'SEMI_ADMIN',
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
  jobBoard: boolean; // Added
  warehouse: boolean;
  importClearance: boolean;
  quotations: boolean;
  approvals: boolean;
  writerDocs: boolean;
  inventory: boolean; 
  tracking: boolean;
  surveyTracker: boolean;
  digitalPackingList: boolean; // Added
  warehouseChecklist: boolean;
  resources: boolean;
  capacity: boolean;
  users: boolean;
  transporter: boolean;
  ai: boolean;
  groupageTracker: boolean;
  activityLog: boolean;
}

export type ActionType = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'EDIT'
  | 'DELETE' 
  | 'ALLOCATE' 
  | 'LOCK' 
  | 'UNLOCK' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'AUTHORIZE'
  | 'STATUS_CHANGE'
  | 'EXPORT'
  | 'RESTORE'
  | (string & {});

export type EntityType = 
  | 'Job Schedule' 
  | 'Groupage Tracker' 
  | 'Survey' 
  | 'Survey Tracker'
  | 'Fleet & Crew' 
  | 'Warehouse' 
  | 'Warehouse Activity'
  | 'Warehouse Checklist'
  | 'Import Clearance' 
  | 'Quotations'
  | 'User Management' 
  | 'User Access'
  | 'Inventory'
  | 'Transporter'
  | 'Digital Packing List'
  | 'Job Cost Sheet'
  | 'Vendor'
  | 'Capacity Settings'
  | 'System Settings'
  | (string & {});

export interface ActivityLog {
  id: string;
  branch?: BranchCode;
  timestamp: number;
  user_id: string;
  user_name: string;
  user_role?: string;
  action_type: ActionType;
  entity_type: EntityType;
  entity_id: string;
  entity_title?: string;
  details: string;
  previous_data?: any;
  new_data?: any;
}

export interface PackageDetail {
  number: string;
  contents: string;
  comments: string;
  photo?: string;
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
  job_no?: string;
  logo?: string;
  packing_date?: string;
  origin_address?: string;
  destination_address?: string;
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
  branch?: BranchCode; // Primary/Default branch
  allowed_branches?: BranchCode[]; // List of authorized branches
}

export interface Personnel {
  id:string;
  branch?: BranchCode;
  employee_id: string; // Mandatory
  name: string;
  type: 'Team Leader' | 'Writer Crew' | 'Driver';
  status: 'Available' | 'Annual Leave' | 'Sick Leave' | 'Personal Leave';
  emirates_id?: string; // Mandatory in UAE, national ID/Iqama/QID in other branches
  license_number?: string; // Optional, specific for Drivers
  is_outsource?: boolean;
  vendor_name?: string;
}

export interface Vehicle {
  id: string;
  branch?: BranchCode;
  name: string;
  plate: string; // Mandatory
  status: 'Available' | 'Out of Service' | 'Maintenance';
  is_outsource?: boolean;
  vendor_name?: string;
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

export enum SurveyStatus {
  BOOKED = 'Booked',
  PENDING = 'Pending',
  LOST = 'Lost'
}

export type SurveyType = 'Physical' | 'Whatsapp' | 'Video Call';
export type SurveyMode = 'Export' | 'Import' | 'Domestic' | 'Storage' | 'International';

export interface AssignableSurveyor {
  id: string;
  name: string;
  branch: BranchCode;
  email?: string;
  phone?: string;
}

export interface Survey {
  id: string;
  branch?: BranchCode;
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
  google_event_id?: string; // Kept for DB compatibility but not used for sync now
  created_by_id: string;
  created_at: number;
  last_edited_by?: string;
  last_edited_at?: number;
  lost_reason?: string;
}

// FIX: Made several properties optional to support different job creation contexts (e.g., Warehouse vs. Schedule).
// This prevents type errors where not all job details are available upon creation.
export type TransporterStatus = 'Scheduled' | 'In Transit' | 'Completed';

export interface Job {
  id: string; // Job No.
  branch?: BranchCode;
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
  day_dates?: string[]; // Custom array for multi-day job custom dates
  status: JobStatus;
  created_at: number;
  requester_id: string;
  assigned_to: string;
  is_warehouse_activity?: boolean;
  is_import_clearance?: boolean;
  is_transporter?: boolean; // New field for Transporter module
  is_locked?: boolean;
  is_confirmed?: boolean;
  last_edited_by?: string;
  last_edited_at?: number;
  sunday_handling?: 'Skip' | 'Include';
  
  // Admin allocations
  team_leader?: string;
  writer_crew?: string[];
  vehicle?: string; // Legacy field for single vehicle/backward compat
  vehicles?: string[]; // Updated to support multiple vehicles
  truck_qty?: number; // Quantity of trucks assigned/required

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
  branch?: BranchCode;
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

export interface ManualCostItem {
  id: string;
  description: string;
  cost: number;
}

export interface ImportCostItem {
  id: string;
  sl_no: number;
  description: string;
  cost_dhs: number;
  cost_fils: number;
  cost_amount: number;
  invoice_dhs: number;
  invoice_fils: number;
  invoice_amount: number;
  is_custom?: boolean;
}

export interface ImportClearanceCostSheet {
  id: string;
  branch?: BranchCode;
  job_id: string;
  job_no: string;
  date: string;
  consignee: string;
  bl_no: string;
  awb: string;
  cont_no: string;
  volume_weight: string;
  items: ImportCostItem[];
  transport_amount: number;
  total_cost: number;
  net_cost: number;
  total_invoice: number;
  signature_name?: string;
  signature_date?: string;
  signature_image?: string;
  status: 'Draft' | 'Saved' | 'Finalized';
  created_at: number;
  updated_at: number;
  created_by?: string;
  last_edited_by?: string;
}

export const DEFAULT_IMPORT_CLEARANCE_ITEMS: { sl_no: number; description: string }[] = [
  { sl_no: 1, description: 'DO FEE' },
  { sl_no: 2, description: 'PHC' },
  { sl_no: 3, description: 'LCL / DTHC AND OTHER CHARGES' },
  { sl_no: 4, description: 'PORT HANDLING' },
  { sl_no: 5, description: 'STORAGE' },
  { sl_no: 6, description: 'LINE DEMURRAGE' },
  { sl_no: 7, description: 'BILL OF ENTRY' },
  { sl_no: 8, description: 'DUTY' },
  { sl_no: 9, description: 'CUSTOMS INSPECTION BOOKIN FEE' },
  { sl_no: 10, description: 'VAT' },
  { sl_no: 11, description: 'TRANSPORTATION' },
  { sl_no: 12, description: 'MECRC / CONTAINER WASHING' },
  { sl_no: 13, description: 'CUSTOMS INSPECTION FEE' },
  { sl_no: 14, description: 'LABOUR FEE' },
  { sl_no: 15, description: 'MOFA DOCUMENTATION FEE' },
  { sl_no: 16, description: 'CUSTOMS CLEARANCE PRO FEE' },
  { sl_no: 17, description: 'DO DOCUMENTATION FEE' },
  { sl_no: 18, description: 'CUSTOMS DOCUMENTATION' },
  { sl_no: 19, description: 'MOFA FEE' },
  { sl_no: 20, description: 'TOKEN' },
  { sl_no: 21, description: 'WAREHOUSE HANDLING +OTHER CHARGES' },
  { sl_no: 22, description: '(Fork Lift)' },
  { sl_no: 23, description: 'TRAILER DETENSION FEE' },
];

export interface JobCostSheet {
  job_id: string;
  branch?: BranchCode;
  items: CostSheetItem[];
  manual_items?: ManualCostItem[];
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
  branch?: BranchCode;
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
  branch?: BranchCode;
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
  branch?: BranchCode;
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
  branch?: BranchCode;
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
  branch?: BranchCode;
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
  warehouse_daily_job_limits?: Record<string, number>; // date -> max warehouse jobs (5 to 10)
  warehouse_default_capacity?: number; // default max warehouse jobs (default 10, min 5)
  holidays: string[]; // array of ISO date strings (YYYY-MM-DD)
  company_logo?: string; // Base64 string of the logo
  system_alert?: {
    active: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'maintenance';
  };
}

// ==========================================
// QUOTATIONS MODULE TYPES
// ==========================================

export type QuotationFormat = 'GROUPAGE_FCL_EXPORT' | 'FCL_EXPORT';
export type QuotationStatus = 'DRAFT' | 'SAVED' | 'FINALIZED';

export interface QuotationBulletItem {
  id: string;
  text: string;
  included: boolean; // Controls whether this bullet appears in the generated PDF
  category?: 'packing' | 'freight' | 'customs' | 'delivery' | 'general' | 'exclusions';
}

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // 'Lump Sum', 'Container', 'CBM', 'Shipment', 'KG'
  unit_price: number;
  total_price: number;
  currency: string;
}

export interface Quotation {
  id: string;
  branch?: BranchCode;
  quotation_no: string; // e.g. WR-FCL-2026-001 or WR-GRP-2026-001
  format: QuotationFormat;
  title: string;
  status: QuotationStatus; // 'DRAFT' | 'SAVED' | 'FINALIZED'
  date: string; // YYYY-MM-DD
  valid_until: string; // YYYY-MM-DD
  prepared_by: string; // Sales Consultant / Move Coordinator
  contact_email: string;
  contact_phone: string;

  // Client Details
  client_name: string;
  company_name?: string;
  client_email: string;
  client_phone: string;
  origin_address: string;
  origin_city: string;
  origin_country: string;
  destination_address: string;
  destination_city: string;
  destination_country: string;

  // Move & Cargo Details
  service_type: 'Door-to-Door' | 'Door-to-Port' | 'Port-to-Door' | 'Port-to-Port';
  container_size?: string; // e.g. '20ft GP', '40ft GP', '40ft HC', '2x 40ft HC'
  groupage_mode?: string; // e.g. 'Consolidated FCL Sea Freight', 'LCL Shared Box'
  estimated_volume_cbm?: number;
  estimated_volume_cft?: number;
  estimated_weight_kg?: number;
  origin_port?: string; // e.g. 'Jebel Ali Port, UAE'
  destination_port?: string; // e.g. 'Southampton Port, UK'
  transit_time?: string; // e.g. '22 - 28 Days (ocean transit)'
  commodity_description?: string; // 'Used Household Goods & Personal Effects'

  // Pricing & Currency
  currency: string; // 'AED', 'USD', 'EUR', 'GBP'
  line_items: QuotationLineItem[];
  subtotal: number;
  vat_percent: number; // e.g. 0% for international exports or 5%
  vat_amount: number;
  total_amount: number;
  payment_terms?: string;

  // Bulletized Inclusions & Exclusions
  inclusions: QuotationBulletItem[];
  exclusions: QuotationBulletItem[];

  // Special Notes (Bold & Highlight options)
  special_notes: string;
  special_notes_bold: boolean;
  special_notes_highlighted: boolean;

  // Legal / Terms & Conditions Link
  terms_and_conditions_url?: string;
  terms_and_conditions_text?: string;

  // Clickable Logo target URL
  logo_url?: string;

  // System Tracking & Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  finalized_at?: string;
  finalized_by?: string;
  version?: number;
}

// ------------------------------------------
// Default Inclusions & Exclusions Templates
// ------------------------------------------

export const DEFAULT_FCL_INCLUSIONS: QuotationBulletItem[] = [
  { id: 'fcl-inc-1', text: 'Professional export packing, wrapping & padding of household goods & personal effects at origin residence.', included: true },
  { id: 'fcl-inc-2', text: 'Supply of premium export packaging materials (bubble wrap, corrugated rolls, heavy-duty cartons, wrapping paper, adhesive tape).', included: true },
  { id: 'fcl-inc-3', text: 'Dismantling of standard knock-down non-specialized furniture items at origin residence.', included: true },
  { id: 'fcl-inc-4', text: 'Preparation of detailed descriptive bilingual export inventory and packing list.', included: true },
  { id: 'fcl-inc-5', text: 'Placement and direct container stuffing of designated ocean container (20ft / 40ft / 40ft HC) at residence or warehouse terminal.', included: true },
  { id: 'fcl-inc-6', text: 'Inland drayage / container haulage from origin residence to UAE sea port (Jebel Ali / Port Rashid / Khalifa Port).', included: true },
  { id: 'fcl-inc-7', text: 'Export customs documentation, export manifest registration, and customs clearance formalities at origin port.', included: true },
  { id: 'fcl-inc-8', text: 'Origin Port Terminal Handling Charges (THC) and wharfage at UAE port of loading.', included: true },
  { id: 'fcl-inc-9', text: 'Ocean freight from UAE port to destination port of arrival on Full Container Load (FCL) liner terms.', included: true },
  { id: 'fcl-inc-10', text: 'Destination port terminal handling charges (THC) and destination import customs clearance processing.', included: true },
  { id: 'fcl-inc-11', text: 'Delivery of ocean container to destination residence having normal, level vehicle access.', included: true },
  { id: 'fcl-inc-12', text: 'Full unloading, placement of furniture and cartons into specified rooms according to client directions.', included: true },
  { id: 'fcl-inc-13', text: 'Reassembly of standard furniture dismantled by origin crew on delivery day.', included: true },
  { id: 'fcl-inc-14', text: 'Unpacking of cartons onto flat surfaces and removal of empty packing debris on the day of delivery.', included: true }
];

export const DEFAULT_FCL_EXCLUSIONS: QuotationBulletItem[] = [
  { id: 'fcl-exc-1', text: 'Destination customs import duties, taxes, VAT/GST, and official governmental processing tariffs.', included: true },
  { id: 'fcl-exc-2', text: 'Customs physical inspection, quarantine examination, x-ray scanning, or fumigation fees if ordered by authorities.', included: true },
  { id: 'fcl-exc-3', text: 'Demurrage, detention, quay rent, or port container storage charges beyond carrier free demurrage allowance.', included: true },
  { id: 'fcl-exc-4', text: 'Difficult access charges at delivery (long carry over 50 meters, stairs carry above 2nd floor without elevator, parking permits).', included: true },
  { id: 'fcl-exc-5', text: 'Specialized vehicle shuttle transfers if access is restricted to large 40ft container chassis.', included: true },
  { id: 'fcl-exc-6', text: 'Custom wooden crating for high-value artwork, marble table tops, chandeliers, pianos, or antique items (available upon request).', included: true },
  { id: 'fcl-exc-7', text: 'Disconnection/reconnection of electrical, plumbing, gas appliances, or wall-mounting of electronics and paintings.', included: true },
  { id: 'fcl-exc-8', text: 'Transit cargo insurance / Comprehensive All Risks Marine Insurance (strongly recommended, available at 2.5% - 3.5% of declared value).', included: true },
  { id: 'fcl-exc-9', text: 'Storage at origin or destination warehouse facilities beyond contracted transit schedules.', included: true },
  { id: 'fcl-exc-10', text: 'Handling or shipment of prohibited items (firearms, alcohol, narcotics, hazardous chemicals, perishable foods).', included: true }
];

export const DEFAULT_FCL_SPECIAL_NOTES = 
  "All ocean freight rates are subject to container equipment availability, carrier general rate increases (GRI), and peak season surcharges (PSS) at the time of booking. Transit times are ocean liner estimates and do not account for customs or port clearance inspections. Consignee must be physically present in the destination country with valid passport, visa, and residency permit prior to vessel arrival for customs clearance. All wooden packaging material must strictly comply with ISPM 15 heat treatment standards.";

export const DEFAULT_GROUPAGE_INCLUSIONS: QuotationBulletItem[] = [
  { id: 'grp-inc-1', text: 'Professional export packing, wrapping & padding of personal effects and furniture at origin residence.', included: true },
  { id: 'grp-inc-2', text: 'Supply of all high-grade export packaging materials (corrugated cartons, bubble wrap, stretch film, heavy-duty tape).', included: true },
  { id: 'grp-inc-3', text: 'Standard dismantling of knock-down non-specialized furniture items at origin residence.', included: true },
  { id: 'grp-inc-4', text: 'Preparation of numbered bilingual descriptive inventory list with carton count and condition notes.', included: true },
  { id: 'grp-inc-5', text: 'Collection from residence and inland drayage to Writer Relocations central consolidation warehouse hub.', included: true },
  { id: 'grp-inc-6', text: 'Safe warehouse staging, consolidation, lift-van / pallet strapping into scheduled shared 40ft HC ocean container.', included: true },
  { id: 'grp-inc-7', text: 'Export customs documentation filing, manifest submission, and customs clearance at UAE port (Jebel Ali).', included: true },
  { id: 'grp-inc-8', text: 'Consolidated ocean freight to destination groupage receiving terminal / de-consolidation depot.', included: true },
  { id: 'grp-inc-9', text: 'Destination terminal handling charges, de-stuffing of container, and import customs clearance assistance.', included: true },
  { id: 'grp-inc-10', text: 'Scheduled delivery to client residence with standard access (ground floor or accessible lift).', included: true },
  { id: 'grp-inc-11', text: 'Unloading, placement of furniture and boxes into designated rooms, and removal of packing debris on delivery day.', included: true }
];

export const DEFAULT_GROUPAGE_EXCLUSIONS: QuotationBulletItem[] = [
  { id: 'grp-exc-1', text: 'Destination governmental customs duties, local excise taxes, VAT, or official border clearance tariffs.', included: true },
  { id: 'grp-exc-2', text: 'Quarantine, agricultural inspection, customs physical examination, or fumigation fees if levied by port authorities.', included: true },
  { id: 'grp-exc-3', text: 'Destination terminal storage fees or quay rent incurred due to missing documentation or delayed consignee response.', included: true },
  { id: 'grp-exc-4', text: 'Difficult access charges at delivery point (narrow roads requiring secondary shuttle truck, crane hoist, walk-ups).', included: true },
  { id: 'grp-exc-5', text: 'Specialized wooden crating for delicate, marble, glass, or valuable fragile items (quoted separately upon request).', included: true },
  { id: 'grp-exc-6', text: 'Handyman, electrical, plumbing, or appliance installation and wall-mounting services.', included: true },
  { id: 'grp-exc-7', text: 'Comprehensive Door-to-Door Marine Transit Insurance (available at nominal premium based on declared inventory value).', included: true },
  { id: 'grp-exc-8', text: 'Extended storage at origin or destination consolidation depot beyond the complimentary 7-day transit allowance.', included: true }
];

export const DEFAULT_GROUPAGE_SPECIAL_NOTES = 
  "Groupage / consolidated shipment schedules are subject to container volume accumulation and ocean vessel departure rotations. Transit times reflect typical consolidation transit and may vary based on co-loader consolidation closing dates. Client must submit all customs declaration documents, copy of passport, and destination residence address at least 7 business days prior to container loading.";

