import { createClient } from '@supabase/supabase-js';
import { Job, Personnel, SystemSettings, UserProfile, Vehicle, InventoryItem, JobCostSheet, BranchCode } from './types';

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

/**
 * Fetches all jobs from Supabase across all pages (bypassing the default 1000-row PostgREST limit).
 * Strictly filters by branch at the database query level to guarantee complete isolation.
 */
export async function fetchAllJobsFromDb(branch?: BranchCode): Promise<{ data: Job[] | null; error: any }> {
  const PAGE_SIZE = 1000;
  const allJobs: Job[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (branch) {
      query = query.eq('branch', branch);
    }

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) {
      // If error is because branch column does not exist yet (pre-migration), retry query without branch filter and filter in memory
      if (branch && (error.message?.includes('branch') || error.code === '42703')) {
        console.warn('Branch column not yet in Supabase table "jobs". Falling back to query without branch filter and filtering in memory.');
        const fallbackRes = await supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (fallbackRes.error) {
          return { data: allJobs.length > 0 ? allJobs : null, error: fallbackRes.error };
        }
        const filtered = (fallbackRes.data || []).filter((j: any) => (j.branch || 'UAE') === branch);
        allJobs.push(...filtered);
        if ((fallbackRes.data || []).length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
        continue;
      }
      // If we got partial data from previous pages, return what we have along with the error
      return { data: allJobs.length > 0 ? allJobs : null, error };
    }

    if (data && data.length > 0) {
      allJobs.push(...data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  return { data: allJobs, error: null };
}
