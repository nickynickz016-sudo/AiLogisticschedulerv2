import { createClient } from '@supabase/supabase-js';
import { Job, Personnel, SystemSettings, UserProfile, Vehicle, InventoryItem, JobCostSheet } from './types';

// Use environment variables for Supabase configuration, falling back to provided project details
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dtlpmlwvfsebirzzmniq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0bHBtbHd2ZnNlYmlyenptbmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzM3MjQsImV4cCI6MjA4Mjg0OTcyNH0.wZtQ3os_ab7aaJDKITE64oU242-tkbC1VC7yy2c7Ehk';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

// Define the database schema based on types
export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: Job;
        Insert: Job;
        Update: Partial<Job>;
      };
      personnel: {
        Row: Personnel;
        Insert: Omit<Personnel, 'id'>;
        Update: Partial<Personnel>;
      };
      vehicles: {
        Row: Vehicle;
        Insert: Omit<Vehicle, 'id'>;
        Update: Partial<Vehicle>;
      };
      system_users: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id'>;
        Update: Partial<UserProfile>;
      };
      system_settings: {
        Row: SystemSettings & { id: number };
        Insert: SystemSettings & { id: number };
        Update: Partial<SystemSettings>;
      };
      inventory_items: {
        Row: InventoryItem;
        Insert: Omit<InventoryItem, 'id'>;
        Update: Partial<InventoryItem>;
      };
      job_cost_sheets: {
        Row: JobCostSheet;
        Insert: JobCostSheet;
        Update: Partial<JobCostSheet>;
      };
      surveys: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

// Use <any> generic to bypass strict type inference that is causing 'never' type errors
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey);
