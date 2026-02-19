
import { UserProfile, UserRole } from './types';

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
  resources: true,
  capacity: true,
  users: true,
  ai: true,
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
  resources: false,
  capacity: false,
  users: false,
  ai: false,
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
  resources: false,
  capacity: false,
  users: false,
  ai: false,
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
  resources: true, // Fleet & Crew
  capacity: false,
  users: false,
  ai: false,
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
  resources: false,
  capacity: false,
  users: false,
  ai: false,
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
  resources: true,
  capacity: true, // CHANGED TO TRUE
  users: false,
  ai: true,
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
  resources: false,
  capacity: false,
  users: false,
  ai: false,
};

export const USERS: MockUser[] = [
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
];
