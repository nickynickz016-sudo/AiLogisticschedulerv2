
import { 
  UserProfile, 
  UserRole, 
  Quotation, 
  DEFAULT_FCL_INCLUSIONS, 
  DEFAULT_FCL_EXCLUSIONS, 
  DEFAULT_FCL_SPECIAL_NOTES,
  DEFAULT_GROUPAGE_INCLUSIONS, 
  DEFAULT_GROUPAGE_EXCLUSIONS, 
  DEFAULT_GROUPAGE_SPECIAL_NOTES 
} from './types';

export interface MockUser {
  username: string;
  password?: string;
  profile: UserProfile;
}

const FULL_ACCESS = {
  dashboard: true,
  schedule: true,
  jobBoard: true,
  warehouse: true,
  importClearance: true,
  approvals: true,
  writerDocs: true,
  inventory: true,
  tracking: true, // Added
  surveyTracker: true,
  warehouseChecklist: true,
  resources: true,
  capacity: true,
  users: true,
  transporter: true,
  ai: true,
  digitalPackingList: true,
  groupageTracker: true,
  activityLog: true,
  quotations: true,
};

const STANDARD_ACCESS = {
  dashboard: true,
  schedule: true,
  jobBoard: true,
  warehouse: true,
  importClearance: true,
  approvals: false,
  writerDocs: true,
  inventory: true, 
  tracking: true, // Added
  surveyTracker: true,
  warehouseChecklist: true,
  resources: false,
  capacity: false,
  users: false,
  transporter: false,
  ai: false,
  digitalPackingList: true,
  groupageTracker: true,
  activityLog: true,
  quotations: true,
};

const WRITER_ACCESS = {
  dashboard: false,
  schedule: true,
  jobBoard: false,
  warehouse: false,
  importClearance: false,
  approvals: false,
  writerDocs: true,
  inventory: false,
  tracking: false,
  surveyTracker: false,
  digitalPackingList: true,
  warehouseChecklist: false,
  resources: false,
  capacity: false,
  users: false,
  transporter: false,
  ai: false,
  groupageTracker: true,
  activityLog: true,
  quotations: true,
};

const SENIOR_OPS_ACCESS = {
  dashboard: true,
  schedule: true,
  jobBoard: false,
  warehouse: true,
  importClearance: true,
  approvals: false,
  writerDocs: true,
  inventory: true,
  tracking: true, // Added
  surveyTracker: true,
  warehouseChecklist: true,
  resources: true, // Fleet & Crew
  capacity: false,
  users: false,
  transporter: true,
  ai: false,
  digitalPackingList: true,
  groupageTracker: true,
  activityLog: true,
  quotations: true,
};

const SANTOSH_ACCESS = {
  dashboard: false,
  schedule: true,
  jobBoard: false,
  warehouse: true,
  importClearance: true,
  approvals: false,
  writerDocs: false,
  inventory: false,
  tracking: false,
  surveyTracker: false,
  digitalPackingList: false,
  warehouseChecklist: false,
  resources: false,
  capacity: false,
  users: false,
  transporter: false,
  ai: false,
  groupageTracker: false,
  activityLog: true,
  quotations: true,
};

const SEMI_ADMIN_ACCESS = {
  dashboard: true,
  schedule: true,
  jobBoard: true,
  warehouse: true,
  importClearance: true,
  approvals: true, 
  writerDocs: true,
  inventory: true,
  tracking: true, // Added
  surveyTracker: true,
  warehouseChecklist: true,
  resources: true,
  capacity: true, // CHANGED TO TRUE
  users: false,
  transporter: true,
  ai: true,
  digitalPackingList: true,
  groupageTracker: true,
  activityLog: true,
  quotations: true,
};

const ACCOUNTS_ACCESS = {
  dashboard: true,
  schedule: true,
  jobBoard: true,
  warehouse: false,
  importClearance: false,
  approvals: false,
  writerDocs: true, // Needed for Invoices/Docs
  inventory: true, // Critical for Job Costing
  tracking: true,
  surveyTracker: true,
  warehouseChecklist: true,
  resources: false,
  capacity: false,
  users: false,
  transporter: false,
  ai: false,
  digitalPackingList: true,
  groupageTracker: true,
  activityLog: true,
  quotations: true,
};

const SECURITY_ONLY_ACCESS = {
  dashboard: false,
  schedule: false,
  jobBoard: false,
  warehouse: false,
  importClearance: false,
  approvals: false,
  writerDocs: false,
  inventory: false,
  tracking: false,
  surveyTracker: false,
  digitalPackingList: false,
  warehouseChecklist: true,
  resources: false,
  capacity: false,
  users: false,
  transporter: false,
  ai: false,
  groupageTracker: false,
  activityLog: true,
  quotations: true,
};

const BASE_USERS: MockUser[] = [
  {
    username: 'Admin',
    password: 'Admin',
    profile: {
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      employee_id: 'ADMIN-001',
      name: 'Administrator',
      role: UserRole.ADMIN,
      permissions: FULL_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Admin',
      status: 'Active',
    },
  },
  {
    username: 'WI061938',
    password: 'Writer@123',
    profile: {
      id: 'wi061938-f6a7-8901-2345-67890abcdef1',
      employee_id: 'WI061938',
      name: 'Groupage Specialist (WI061938)',
      role: UserRole.USER,
      permissions: STANDARD_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=WI061938',
      status: 'Active',
    },
  },
  {
    username: 'User1',
    password: 'User1',
    profile: {
      id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
      employee_id: 'OPS-101',
      name: 'Roxanne',
      role: UserRole.USER,
      permissions: STANDARD_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Roxanne',
      status: 'Active',
    },
  },
   {
    username: 'User2',
    password: 'User2',
    profile: {
      id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef12',
      employee_id: 'OPS-102',
      name: 'Poonam',
      role: UserRole.USER,
      permissions: STANDARD_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Poonam',
      status: 'Active',
    },
  },
  {
    username: 'User3',
    password: 'User3',
    profile: {
      id: 'd4e5f6a7-b8c9-0123-4567-890abcdef123',
      employee_id: 'OPS-103',
      name: 'Divya',
      role: UserRole.USER,
      permissions: STANDARD_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Divya',
      status: 'Active',
    },
  },
  {
    username: 'User4',
    password: 'User4',
    profile: {
      id: 'e5f6a7b8-c9d0-1234-5678-90abcdef1234',
      employee_id: 'OPS-104',
      name: 'Param',
      role: UserRole.USER,
      permissions: STANDARD_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Param',
      status: 'Active',
    },
  },
  {
    username: 'User5',
    password: 'User5',
    profile: {
      id: 'f6a7b8c9-d0e1-2345-6789-0abcdef12345',
      employee_id: 'OPS-105',
      name: 'Anoop',
      role: UserRole.USER,
      permissions: STANDARD_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Anoop',
      status: 'Active',
    },
  },
  {
    username: 'Warehouse',
    password: 'Writer@123',
    profile: {
      id: 'g7a8b9c0-d1e2-3456-7890-1abcdef123456',
      employee_id: 'OPS-106',
      name: 'Writer Team',
      role: UserRole.USER,
      permissions: WRITER_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Writer',
      status: 'Active',
    },
  },
  {
    username: 'Rijas',
    password: 'Writer@123',
    profile: {
      id: 'h8b9c0d1-e2f3-4567-8901-2bcdef1234567',
      employee_id: 'OPS-201',
      name: 'Rijas',
      role: UserRole.USER,
      permissions: SENIOR_OPS_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Rijas',
      status: 'Active',
    },
  },
  {
    username: 'Safeer',
    password: 'Writer@123',
    profile: {
      id: 'i9c0d1e2-f3a4-5678-9012-3cdef12345678',
      employee_id: 'OPS-202',
      name: 'Safeer',
      role: UserRole.USER,
      permissions: SENIOR_OPS_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Safeer',
      status: 'Active',
    },
  },
  {
    username: 'Santosh',
    password: 'Writer@123',
    profile: {
      id: 'j0d1e2f3-a4b5-6789-0123-4cdef12345678',
      employee_id: 'OPS-203',
      name: 'Santosh',
      role: UserRole.USER,
      permissions: SANTOSH_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Santosh',
      status: 'Active',
    },
  },
  {
    username: 'Karthik',
    password: 'Writer@123',
    profile: {
      id: 'k1a2r3t4-h5i6-7890-1234-567890abcdef',
      employee_id: 'OPS-ADMIN-01',
      name: 'Karthik',
      role: UserRole.USER,
      permissions: SEMI_ADMIN_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Karthik',
      status: 'Active',
    },
  },
  {
    username: 'Allen',
    password: 'Writer@123',
    profile: {
      id: 'l2b3c4d5-e6f7-8901-2345-67890abcdef123',
      employee_id: 'OPS-204',
      name: 'Allen',
      role: UserRole.USER,
      permissions: SENIOR_OPS_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Allen',
      status: 'Active',
    },
  },
  {
    username: 'Accounts',
    password: 'Accountdxb@123',
    profile: {
      id: 'm3c4d5e6-f7g8-9012-3456-7890abcdef1234',
      employee_id: 'ACC-001',
      name: 'Accounts Team',
      role: UserRole.USER,
      permissions: ACCOUNTS_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Accounts',
      status: 'Active',
    },
  },
  {
    username: 'Daryl',
    password: 'Writercs@123',
    profile: {
      id: 'n4d5e6f7-g8h9-0123-4567-890abcdef12345',
      employee_id: 'OPS-205',
      name: 'Daryl',
      role: UserRole.USER,
      permissions: SENIOR_OPS_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Daryl',
      status: 'Active',
    },
  },
  {
    username: 'Security',
    password: 'Security',
    profile: {
      id: 's5e6f7g8-h9i0-1234-5678-90abcdef123456',
      employee_id: 'SEC-001',
      name: 'Security Team',
      role: UserRole.USER,
      permissions: SECURITY_ONLY_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Security',
      status: 'Active',
    },
  },
  {
    username: 'Maria',
    password: 'Writer@123',
    profile: {
      id: 'm1a2r3i4-a5b6-7890-1234-567890abcdef',
      employee_id: 'MAR-001',
      name: 'Maria',
      role: UserRole.USER,
      permissions: STANDARD_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Maria',
      status: 'Active',
    },
  },
  {
    username: 'Ashok',
    password: 'Writer@123',
    profile: {
      id: 'a1s2h3o4-k5b6-7890-1234-567890abcdef',
      employee_id: 'ASH-001',
      name: 'Ashok',
      role: UserRole.USER,
      permissions: STANDARD_ACCESS,
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Ashok',
      status: 'Active',
    },
  },
];

export const USERS: MockUser[] = BASE_USERS.map(u => {
  // Define strict branch authorizations for default users to showcase authorized/unauthorized behavior
  let allowed_branches: ('UAE' | 'KSA' | 'QATAR')[] = ['UAE', 'KSA', 'QATAR'];
  let primary_branch: 'UAE' | 'KSA' | 'QATAR' = 'UAE';

  if (u.profile.role === UserRole.ADMIN || u.username === 'Karthik') {
    allowed_branches = ['UAE', 'KSA', 'QATAR'];
    primary_branch = 'UAE';
  } else if (u.username === 'User1') {
    // Roxanne: UAE only (KSA & QATAR unauthorized)
    allowed_branches = ['UAE'];
    primary_branch = 'UAE';
  } else if (u.username === 'User2') {
    // Poonam: KSA only (UAE & QATAR unauthorized)
    allowed_branches = ['KSA'];
    primary_branch = 'KSA';
  } else if (u.username === 'User3') {
    // Divya: QATAR only (UAE & KSA unauthorized)
    allowed_branches = ['QATAR'];
    primary_branch = 'QATAR';
  } else if (u.username === 'WI061938') {
    // Groupage Specialist: UAE and KSA (QATAR unauthorized)
    allowed_branches = ['UAE', 'KSA'];
    primary_branch = 'UAE';
  } else {
    // Other staff: default to UAE
    allowed_branches = ['UAE'];
    primary_branch = 'UAE';
  }

  return {
    ...u,
    profile: {
      ...u.profile,
      branch: primary_branch,
      allowed_branches
    }
  };
});

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 'quote-fcl-001',
    branch: 'UAE',
    quotation_no: 'WR-FCL-2026-001',
    format: 'FCL_EXPORT',
    title: 'Export Quotation — Full Container Load (20ft FCL)',
    status: 'SAVED',
    date: '2026-09-25',
    valid_until: '2026-10-25',
    prepared_by: 'Nicky - Senior Relocation Consultant',
    contact_email: 'relocations.uae@writerrelocations.com',
    contact_phone: '+971 4 885 1234',

    // Client Details
    client_name: 'David & Sarah Henderson',
    company_name: 'BP International Middle East',
    client_email: 'd.henderson@example.com',
    client_phone: '+971 50 123 4567',
    origin_address: 'Villa 42, Street 18, Meadows 4',
    origin_city: 'Dubai',
    origin_country: 'United Arab Emirates',
    destination_address: '14 Kensington Gate, W8 5NA',
    destination_city: 'London',
    destination_country: 'United Kingdom',

    // Move Details
    service_type: 'Door-to-Door',
    container_size: '20ft General Purpose (GP)',
    estimated_volume_cbm: 28.5,
    estimated_volume_cft: 1006,
    estimated_weight_kg: 3850,
    origin_port: 'Jebel Ali Port (AEJEA), Dubai',
    destination_port: 'Port of Southampton (GBSOU), UK',
    transit_time: '24 - 28 Days (ocean transit)',
    commodity_description: 'Used Household Goods & Personal Effects',

    // Pricing
    currency: 'AED',
    line_items: [
      {
        id: 'li-1',
        description: 'Origin Services: Export packing, wrapping, dismantling & loading into 20ft container at residence',
        quantity: 1,
        unit: 'Lump Sum',
        unit_price: 6850,
        total_price: 6850,
        currency: 'AED'
      },
      {
        id: 'li-2',
        description: 'Origin Drayage & Port Handling: Terminal haulage & Jebel Ali export customs clearance',
        quantity: 1,
        unit: 'Shipment',
        unit_price: 2400,
        total_price: 2400,
        currency: 'AED'
      },
      {
        id: 'li-3',
        description: 'Ocean Freight: Sea freight Jebel Ali to Southampton (20ft GP, bunker & ISPS inclusive)',
        quantity: 1,
        unit: 'Container',
        unit_price: 9200,
        total_price: 9200,
        currency: 'AED'
      },
      {
        id: 'li-4',
        description: 'Destination Port & Customs: Southampton THC, Tor import clearance, and port handover',
        quantity: 1,
        unit: 'Shipment',
        unit_price: 3600,
        total_price: 3600,
        currency: 'AED'
      },
      {
        id: 'li-5',
        description: 'Destination Delivery: Delivery to London residence, placement, reassembly & debris removal',
        quantity: 1,
        unit: 'Lump Sum',
        unit_price: 5450,
        total_price: 5450,
        currency: 'AED'
      }
    ],
    subtotal: 27500,
    vat_percent: 0,
    vat_amount: 0,
    total_amount: 27500,
    payment_terms: '100% advance prior to packing / container dispatch from Dubai',

    // Inclusions & Exclusions
    inclusions: DEFAULT_FCL_INCLUSIONS.map(item => ({ ...item })),
    exclusions: DEFAULT_FCL_EXCLUSIONS.map(item => ({ ...item })),

    // Special Notes
    special_notes: DEFAULT_FCL_SPECIAL_NOTES,
    special_notes_bold: true,
    special_notes_highlighted: true,

    // Legal / Links
    terms_and_conditions_url: 'https://www.writerrelocations.com/terms-and-conditions',
    terms_and_conditions_text: 'Writer Relocations Standard Terms and Conditions',
    logo_url: 'https://www.writerrelocations.com',

    created_at: '2026-09-25T08:00:00Z',
    updated_at: '2026-09-25T08:00:00Z',
    created_by: 'OPS-ADMIN-01'
  },
  {
    id: 'quote-grp-002',
    branch: 'UAE',
    quotation_no: 'WR-GRP-2026-002',
    format: 'GROUPAGE_FCL_EXPORT',
    title: 'Export Quotation — Groupage Consolidation in 40ft HC',
    status: 'DRAFT',
    date: '2026-09-25',
    valid_until: '2026-10-25',
    prepared_by: 'Michael Chen - Move Coordinator',
    contact_email: 'dubai.quotes@writerrelocations.com',
    contact_phone: '+971 4 885 9988',

    // Client Details
    client_name: 'Dr. Elizabeth Taylor',
    company_name: 'Emirates Health Services',
    client_email: 'e.taylor@ehs.gov.ae',
    client_phone: '+971 55 987 6543',
    origin_address: 'Apartment 2104, Marina Crown Tower',
    origin_city: 'Dubai Marina, Dubai',
    origin_country: 'United Arab Emirates',
    destination_address: '22 George Street, The Rocks',
    destination_city: 'Sydney, NSW 2000',
    destination_country: 'Australia',

    // Move Details
    service_type: 'Door-to-Door',
    groupage_mode: 'Co-loaded Groupage Consolidation in 40ft HC',
    estimated_volume_cbm: 12.0,
    estimated_volume_cft: 424,
    estimated_weight_kg: 1650,
    origin_port: 'Jebel Ali Port (AEJEA), Dubai',
    destination_port: 'Port Botany (AUPTB), Sydney, Australia',
    transit_time: '35 - 45 Days (including consolidation & vessel transit)',
    commodity_description: 'Personal Effects & Household Furniture',

    // Pricing
    currency: 'AED',
    line_items: [
      {
        id: 'li-g1',
        description: 'Origin Services: Residence packing, wrapping, handling, and transfer to Writer Relocations central hub',
        quantity: 12,
        unit: 'CBM',
        unit_price: 380,
        total_price: 4560,
        currency: 'AED'
      },
      {
        id: 'li-g2',
        description: 'Consolidation & Export Documentation: Hub staging, palletization, strapping, and UAE export clearance',
        quantity: 1,
        unit: 'Shipment',
        unit_price: 1850,
        total_price: 1850,
        currency: 'AED'
      },
      {
        id: 'li-g3',
        description: 'Consolidated Sea Freight: Jebel Ali to Sydney Groupage terminal (12 CBM co-loaded)',
        quantity: 12,
        unit: 'CBM',
        unit_price: 460,
        total_price: 5520,
        currency: 'AED'
      },
      {
        id: 'li-g4',
        description: 'Destination Terminal & Clearance: Sydney de-consolidation, quarantine assistance, and customs processing',
        quantity: 1,
        unit: 'Shipment',
        unit_price: 2200,
        total_price: 2200,
        currency: 'AED'
      },
      {
        id: 'li-g5',
        description: 'Destination Delivery: Delivery to Sydney residence, unloading, room placement, and debris removal',
        quantity: 12,
        unit: 'CBM',
        unit_price: 310,
        total_price: 3720,
        currency: 'AED'
      }
    ],
    subtotal: 17850,
    vat_percent: 0,
    vat_amount: 0,
    total_amount: 17850,
    payment_terms: 'Full payment upon collection at origin residence prior to container consolidation',

    // Inclusions & Exclusions
    inclusions: DEFAULT_GROUPAGE_INCLUSIONS.map(item => ({ ...item })),
    exclusions: DEFAULT_GROUPAGE_EXCLUSIONS.map(item => ({ ...item })),

    // Special Notes
    special_notes: DEFAULT_GROUPAGE_SPECIAL_NOTES,
    special_notes_bold: true,
    special_notes_highlighted: true,

    // Legal / Links
    terms_and_conditions_url: 'https://www.writerrelocations.com/terms-and-conditions',
    terms_and_conditions_text: 'Writer Relocations Standard Terms and Conditions',
    logo_url: 'https://www.writerrelocations.com',

    created_at: '2026-09-25T08:15:00Z',
    updated_at: '2026-09-25T08:15:00Z',
    created_by: 'OPS-ADMIN-01'
  }
];

