
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
  resources: boolean;
  capacity: boolean;
  users: boolean;
  transporter: boolean;
  ai: boolean;
}

export interface UserProfile {
  id: string;
  employee_id: string; // Mandatory
  name: string;
  role: UserRole;
  permissions: UserPermissions;
  avatar: string;
  status: 'Active' | 'Disabled';
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
  critical_stock: number;
}

export interface CostSheetItem {
  inventory_id: number;
  code: string;
  description: string;
  unit: string;
  price: number;
  issued_qty: number;
  returned_qty: number;
}

export interface JobCostSheet {
  job_id: string;
  items: CostSheetItem[];
  status: 'Issued' | 'Returned' | 'Finalized';
  total_cost: number;
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
