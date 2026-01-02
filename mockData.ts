
import { UserProfile, UserRole } from './types';

export interface MockUser {
  username: string;
  password?: string;
  profile: UserProfile;
}

export const USERS: MockUser[] = [
  {
    username: 'Admin',
    password: 'Admin',
    profile: {
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      employee_id: 'ADMIN-001',
      name: 'Administrator',
      role: UserRole.ADMIN,
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
      avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Anoop',
      status: 'Active',
    },
  },
];
