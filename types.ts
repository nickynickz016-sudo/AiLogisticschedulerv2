
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

export interface UserProfile {
  id: string;
  employee_id: string; // Mandatory
  name: string;
  role: UserRole;
  avatar: string;
  status: 'Active' | 'Disabled';
}

export interface Personnel {
  id:string;
  employee_id: string; // Mandatory
  name: string;
  type: 'Team Leader' | 'Writer Crew';
  status: 'Available' | 'Annual Leave' | 'Sick Leave' | 'Personal Leave';
  emirates_id: string; // Mandatory
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string; // Mandatory
  status: 'Available' | 'Out of Service' | 'Maintenance';
}

// FIX: Made several properties optional to support different job creation contexts (e.g., Warehouse vs. Schedule).
// This prevents type errors where not all job details are available upon creation.
export interface Job {
  id: string; // Job No.
  title: string;
  shipper_name: string;
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
  status: JobStatus;
  created_at: number;
  requester_id: string;
  assigned_to: string;
  is_warehouse_activity?: boolean;
  is_import_clearance?: boolean;
  is_locked?: boolean;
  
  // Admin allocations
  team_leader?: string;
  writer_crew?: string[];
  vehicle?: string;

  // Fields for Import Clearance
  bol_number?: string;
  container_number?: string;
  customs_status?: CustomsStatus;
}

export interface SystemSettings {
  daily_job_limits: Record<string, number>; // date -> max jobs
  holidays: string[]; // array of ISO date strings (YYYY-MM-DD)
}