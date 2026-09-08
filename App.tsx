
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUAEToday, getCleanJobNo, getJobDayNumber, isMultiDayJob, safeLocalStorage, safeSessionStorage } from './utils';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ScheduleView } from './components/ScheduleView';
import { ApprovalQueue } from './components/ApprovalQueue';
import { AIPlanner } from './components/AIPlanner';
import { WarehouseActivity } from './components/WarehouseActivity';
import { ImportClearance } from './components/ImportClearance';
import { ResourceManager } from './components/ResourceManager';
import { CapacityManager } from './components/CapacityManager';
import { UserManagement } from './components/UserManagement';
import { PublicTracking } from './components/PublicTracking';
import { LoginScreen } from './components/LoginScreen';
import { HolidayAlertModal } from './components/HolidayAlertModal';
import { SystemAlertModal } from './components/SystemAlertModal';
import { WriterDocs } from './components/WriterDocs';
import { Inventory } from './components/Inventory';
import { TrackingView } from './components/TrackingView';
import { Transporter } from './components/Transporter';
import { GroupageTracker } from './components/GroupageTracker';
import { SurveyTracker } from './components/SurveyTracker';
import { SurveyPackingList } from './components/SurveyPackingList';
import { WarehouseChecklist as WarehouseChecklistComponent } from './components/WarehouseChecklist';
import { ActivityLogView } from './components/ActivityLogView';
import { SundayJobModal } from './components/SundayJobModal';
import { ProfileUpdateModal } from './components/ProfileUpdateModal';
import { UserRole, Job, JobStatus, UserProfile, Personnel, Vehicle, SystemSettings, CustomsStatus, Survey, WarehouseChecklist, NightPatrollingChecklist, SafetyMonitoringChecklist, SurpriseVisitChecklist, DailyMonitoringChecklist, ActivityLog, ActionType, EntityType } from './types';
import { Bell, Search, Menu, LogOut, X, CheckCircle2, XCircle, AlertTriangle, Info, Lock, Unlock } from 'lucide-react';
import { supabase, fetchAllJobsFromDb } from './supabaseClient';
import { USERS, MockUser } from './mockData';
import * as XLSX from 'xlsx';


// --- Robust Offline Cache & Fallback Data System Helper ---
export const isOfflineError = (errMsg?: any): boolean => {
  if (!errMsg) return false;
  const str = typeof errMsg === 'string' ? errMsg : (errMsg.message || JSON.stringify(errMsg));
  const lower = str.toLowerCase();
  return lower.includes('failed to fetch') || 
         lower.includes('network') || 
         lower.includes('unreachable') || 
         lower.includes('typeerror') || 
         lower.includes('preload') ||
         lower.includes('cors') ||
         lower.includes('load failed') ||
         lower.includes('fetch failed') ||
         lower.includes('timeout') ||
         lower.includes('canceling statement') ||
         lower.includes('statement timeout') ||
         lower.includes('deadline exceeded') ||
         lower.includes('57014') ||
         lower.includes('54000') ||
         lower.includes('offline');
};

const defaultPersonnel: Personnel[] = [
  { id: 'p1', employee_id: 'EMP-001', name: 'Alun John', type: 'Team Leader', status: 'Available', emirates_id: '784-1985-1234567-1' },
  { id: 'p2', employee_id: 'EMP-002', name: 'Sujith Kumar', type: 'Driver', status: 'Available', emirates_id: '784-1990-2345678-2', license_number: 'LIC-55442' },
  { id: 'p3', employee_id: 'EMP-003', name: 'Nikhil Das', type: 'Writer Crew', status: 'Available', emirates_id: '784-1992-3456789-3' },
  { id: 'p4', employee_id: 'EMP-004', name: 'Karthik Raja', type: 'Writer Crew', status: 'Available', emirates_id: '784-1988-4567890-4' }
];

const defaultVehicles: Vehicle[] = [
  { id: 'v1', name: '3-Ton pickup (M-1)', plate: 'A-12345', status: 'Available' },
  { id: 'v2', name: '5-Ton pickup (M-2)', plate: 'B-67890', status: 'Available' },
  { id: 'v3', name: 'Box Trailer (M-3)', plate: 'C-54321', status: 'Available' }
];

const defaultJobs: Job[] = [
  {
    id: 'WR-100245',
    title: 'Move across Dubai Marina',
    shipper_name: 'John Doe',
    shipper_phone: '+971501234567',
    client_email: 'john.doe@example.com',
    location: 'Dubai Marina, Elite Residence',
    priority: 'High' as any,
    loading_type: 'House Move' as any,
    volume_cbm: 12,
    job_date: new Date().toISOString().split('T')[0],
    status: 'Active' as any,
    created_at: Date.now() - 86450000,
    requester_id: 'user1',
    assigned_to: 'EMP-001',
    vehicles: ['v1'],
    is_confirmed: true
  },
  {
    id: 'WR-100246',
    title: 'Relocation to Abu Dhabi',
    shipper_name: 'Sarah Smith',
    shipper_phone: '+971509876543',
    client_email: 'sarah.smith@example.com',
    location: 'Jumeirah Heights to Corniche, Abu Dhabi',
    priority: 'Medium' as any,
    loading_type: 'Apartment Move' as any,
    volume_cbm: 24,
    job_date: new Date().toISOString().split('T')[0],
    status: 'Active' as any,
    created_at: Date.now() - 43200000,
    requester_id: 'user1',
    assigned_to: 'EMP-002',
    vehicles: ['v2'],
    is_confirmed: false
  }
];

const defaultSurveys: Survey[] = [
  {
    id: 'SRV-101',
    surveyor_name: 'Alun John',
    survey_type: 'Physical',
    enquiry_number: 'ENQ-2026-001',
    shipper_name: 'Robert Vance',
    survey_date: new Date().toISOString().split('T')[0],
    start_time: '10:00 AM',
    end_time: '11:00 AM',
    location: 'Downtown Dubai, Boulevard Heights',
    mode: 'Domestic',
    status: 'Booked' as any,
    created_by_id: 'unknown',
    created_at: Date.now() - 172800000
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = safeSessionStorage.getItem('writer_current_user');
      if (!saved) return null;
      const user = JSON.parse(saved);
      
      // Validation: Ensure basic profile fields exist
      if (!user || !user.employee_id || !user.role) return null;
      
      // Auto-sync permissions from mockData to session if mismatch found
      const blueprint = USERS.find(u => u.profile.employee_id === user.employee_id);
      if (blueprint) {
        return {
          ...user,
          permissions: blueprint.profile.permissions, // Force latest permissions
          role: blueprint.profile.role                 // Force latest role
        };
      }
      
      return user;
    } catch (e) {
      console.error("Session restore failed", e);
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'approvals' | 'survey-tracker' | 'survey-packing' | 'warehouse-checklist' | 'writer-docs' | 'inventory' | 'tracking' | 'transporter' | 'groupage-tracker' | 'activity-log' | 'ai' | 'warehouse' | 'import-clearance' | 'resources' | 'capacity' | 'users'>(() => {
    const saved = safeLocalStorage.getItem('writer_active_tab');
    return (saved as any) || 'dashboard';
  });
  const [isNavigationLocked, setIsNavigationLocked] = useState(false);
  const [preloadPackingSurvey, setPreloadPackingSurvey] = useState<any>(null);
  const [costingJobId, setCostingJobId] = useState<string | undefined>(undefined);
  
  // Local state for app data, fetched from Supabase
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [checklists, setChecklists] = useState<WarehouseChecklist[]>([]);
  const [patrolLogs, setPatrolLogs] = useState<NightPatrollingChecklist[]>([]);
  const [safetyChecks, setSafetyChecks] = useState<SafetyMonitoringChecklist[]>([]);
  const [surpriseVisits, setSurpriseVisits] = useState<SurpriseVisitChecklist[]>([]);
  const [dailyMonitoring, setDailyMonitoring] = useState<DailyMonitoringChecklist[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ jobId: string; title: string } | null>(null);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [allCredentials, setAllCredentials] = useState<MockUser[]>(() => {
    const saved = safeLocalStorage.getItem('writer_system_users');
    let users = USERS;
    try {
      if (saved) {
        users = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error parsing writer_system_users", e);
    }
    
    // Auto-sync: If new users are added to USERS constant in code, add them to state
    // Use optional chaining and fallback to be safe
    const existingIds = new Set(users.filter(u => u?.profile?.employee_id).map((u: any) => u.profile.employee_id));
    const missingUsers = USERS.filter(u => u?.profile?.employee_id && !existingIds.has(u.profile.employee_id));
    
    // Also ensure all existing users have a permissions object
    users = users.map((u: any) => {
      if (u.profile && !u.profile.permissions) {
        // Find them in USERS to get default permissions if missing
        const blueprint = USERS.find(b => b.profile.employee_id === u.profile.employee_id);
        return {
          ...u,
          profile: {
            ...u.profile,
            permissions: blueprint?.profile?.permissions || {}
          }
        };
      }
      return u;
    });

    if (missingUsers.length > 0) {
      users = [...users, ...missingUsers];
    }
    
    return users;
  }); 

  // Navigation Lock Logic (Tablet Safety - Global)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isNavigationLocked) {
        e.preventDefault();
        e.returnValue = 'Guard Mode is ON: Are you sure you want to leave? Unsaved changes may be lost.';
        return e.returnValue;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (isNavigationLocked) {
        window.history.pushState(null, '', window.location.href);
        alert("Guard Mode is Active: Navigation is locked to prevent data loss. Please unlock the Guard icon in the header to leave this section.");
      }
    };

    if (isNavigationLocked) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isNavigationLocked]);

  // Inactivity Auto-Logout Logic (10 Minutes)
  useEffect(() => {
    if (!currentUser) return;

    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes in milliseconds

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleLogout();
        window.location.reload(); // Refresh the app to clear all states
      }, INACTIVITY_LIMIT);
    };

    // Events to track activity
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'click'
    ];

    // Initialize timer
    resetTimer();

    // Add listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser]);

  const fetchedCredentialsRef = useRef<string>('');
  const allCredentialsRef = useRef<MockUser[]>(allCredentials);
  const currentUserRef = useRef<UserProfile | null>(currentUser);

  useEffect(() => {
    allCredentialsRef.current = allCredentials;
  }, [allCredentials]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const saveCredentialsToDb = async (credentials: MockUser[]) => {
    try {
      const { data, error: selectError } = await supabase
        .from('system_settings')
        .select('daily_job_limits')
        .eq('id', 1)
        .single();
        
      if (selectError) {
        console.error('Error fetching settings to save credentials:', selectError);
        return;
      }
      
      const currentLimits = data?.daily_job_limits || {};
      const updatedLimits = {
        ...currentLimits,
        __credentials: credentials
      };
      
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({ daily_job_limits: updatedLimits })
        .eq('id', 1);
        
      if (updateError) {
        console.error('Error saving credentials to Supabase:', updateError.message);
      }
    } catch (err) {
      console.error('Unexpected error saving credentials to Supabase:', err);
    }
  };

  const updateAndSaveCredentials = async (newList: MockUser[]) => {
    setAllCredentials(newList);
    const jsonStr = JSON.stringify(newList);
    safeLocalStorage.setItem('writer_system_users', jsonStr);
    fetchedCredentialsRef.current = jsonStr;
    await saveCredentialsToDb(newList);
  };

  // Persist users and session whenever they change (Local storage mirroring only, no destructive DB auto-write)
  useEffect(() => {
    const jsonStr = JSON.stringify(allCredentials);
    safeLocalStorage.setItem('writer_system_users', jsonStr);
  }, [allCredentials]);

  useEffect(() => {
    if (currentUser) {
      safeSessionStorage.setItem('writer_current_user', JSON.stringify(currentUser));
    } else {
      safeSessionStorage.removeItem('writer_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    safeLocalStorage.setItem('writer_active_tab', activeTab);
  }, [activeTab]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = safeLocalStorage.getItem('writer_local_settings');
      return saved ? JSON.parse(saved) : { daily_job_limits: {}, holidays: [] };
    } catch (_) {
      return { daily_job_limits: {}, holidays: [] };
    }
  });
  const [googleTokens, setGoogleTokens] = useState<any>(() => {
    const saved = safeLocalStorage.getItem('google_calendar_tokens');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New state for mobile
  const [showHolidayAlert, setShowHolidayAlert] = useState(false);
  const [showSystemAlert, setShowSystemAlert] = useState(false);
  const [sundayPrompt, setSundayPrompt] = useState<{ job: Partial<Job>, mode: 'add' | 'edit', oldId?: string } | null>(null);

  // Check for public tracking link
  const queryParams = new URLSearchParams(window.location.search);
  const trackJobId = queryParams.get('track') || queryParams.get('t');

  // Notification State
  const [notifications, setNotifications] = useState<{id: string, text: string, time: string, read: boolean, type: 'success'|'error'|'info'|'warning'}[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const addNotification = useCallback((text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const newNotif = {
      id: Math.random().toString(36).substring(7),
      text,
      time: 'Just now',
      read: false,
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;
      
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const tokens = event.data.tokens;
        setGoogleTokens(tokens);
        safeLocalStorage.setItem('google_calendar_tokens', JSON.stringify(tokens));
        addNotification(`Google Calendar connected successfully!`, 'success');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth-url');
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to get auth URL');
      }
      const { url } = await response.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (error: any) {
      console.error('Error connecting to Google:', error);
      addNotification(error.message || 'Failed to connect to Google Calendar', 'error');
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleTokens(null);
    safeLocalStorage.removeItem('google_calendar_tokens');
    addNotification('Google Calendar disconnected', 'info');
  };

  // --- Robust Offline Cache & Falback Data System ---

  const loadOfflineJobs = useCallback(() => {
    const saved = safeLocalStorage.getItem('writer_local_jobs_data');
    if (saved) {
      try {
        setJobs(JSON.parse(saved));
        return;
      } catch (e) {
        console.error("Failed to parse cached jobs", e);
      }
    }
    setJobs(defaultJobs);
    safeLocalStorage.setItem('writer_local_jobs_data', JSON.stringify(defaultJobs));
  }, []);

  const loadOfflinePersonnel = useCallback(() => {
    const saved = safeLocalStorage.getItem('writer_local_personnel_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cleaned = (parsed || []).map((p: any) => ({
          ...p,
          name: typeof p.name === 'string' ? p.name.trim() : p.name,
          type: typeof p.type === 'string' ? p.type.trim() : p.type,
          status: typeof p.status === 'string' ? p.status.trim() : p.status,
          employee_id: typeof p.employee_id === 'string' ? p.employee_id.trim() : p.employee_id,
          emirates_id: typeof p.emirates_id === 'string' ? p.emirates_id.trim() : p.emirates_id,
        }));
        setPersonnel(cleaned);
        return;
      } catch (e) {}
    }
    const cleanedDefault = defaultPersonnel.map((p: any) => ({
      ...p,
      name: typeof p.name === 'string' ? p.name.trim() : p.name,
      type: typeof p.type === 'string' ? p.type.trim() : p.type,
      status: typeof p.status === 'string' ? p.status.trim() : p.status,
      employee_id: typeof p.employee_id === 'string' ? p.employee_id.trim() : p.employee_id,
      emirates_id: typeof p.emirates_id === 'string' ? p.emirates_id.trim() : p.emirates_id,
    }));
    setPersonnel(cleanedDefault);
    safeLocalStorage.setItem('writer_local_personnel_data', JSON.stringify(cleanedDefault));
  }, []);

  const loadOfflineVehicles = useCallback(() => {
    const saved = safeLocalStorage.getItem('writer_local_vehicles_data');
    if (saved) {
      try {
        setVehicles(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    setVehicles(defaultVehicles);
    safeLocalStorage.setItem('writer_local_vehicles_data', JSON.stringify(defaultVehicles));
  }, []);

  const loadOfflineSurveys = useCallback(() => {
    const saved = safeLocalStorage.getItem('writer_local_surveys_data');
    if (saved) {
      try {
        setSurveys(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    setSurveys(defaultSurveys);
    safeLocalStorage.setItem('writer_local_surveys_data', JSON.stringify(defaultSurveys));
  }, []);

  const loadOfflineChecklists = useCallback(() => {
    try {
      const savedChecklists = safeLocalStorage.getItem('writer_local_checklists_data');
      if (savedChecklists) setChecklists(JSON.parse(savedChecklists));
      
      const savedPatrol = safeLocalStorage.getItem('writer_local_patrol_logs_data');
      if (savedPatrol) setPatrolLogs(JSON.parse(savedPatrol));
      
      const savedSafety = safeLocalStorage.getItem('writer_local_safety_checks_data');
      if (savedSafety) setSafetyChecks(JSON.parse(savedSafety));
      
      const savedSurprise = safeLocalStorage.getItem('writer_local_surprise_visits_data');
      if (savedSurprise) setSurpriseVisits(JSON.parse(savedSurprise));
      
      const savedDaily = safeLocalStorage.getItem('writer_local_daily_monitoring_data');
      if (savedDaily) setDailyMonitoring(JSON.parse(savedDaily));
    } catch (e) {
      console.error("Failed to load offline checklists", e);
    }
  }, []);

  // Data Fetching Functions
  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await fetchAllJobsFromDb();
      if (error) {
        if (isOfflineError(error.message)) {
          console.warn('Network offline during fetching jobs:', error.message);
          loadOfflineJobs();
        } else {
          console.error('Error fetching jobs:', error.message);
          addNotification(`Error fetching jobs: ${error.message}`, 'error');
        }
      } else {
        // Normalize data: Ensure 'vehicles' array exists. 
        // If 'vehicles' is null but 'vehicle' exists (legacy), convert 'vehicle' string to array.
        let fetchedData = data || [];
        
        // If Supabase returned empty data but we have cached offline jobs,
        // auto-upload them to Supabase so they are not deleted or lost!
        if (fetchedData.length === 0) {
          const savedStr = safeLocalStorage.getItem('writer_local_jobs_data');
          if (savedStr) {
            try {
              const cachedJobs = JSON.parse(savedStr);
              if (Array.isArray(cachedJobs) && cachedJobs.length > 0) {
                // Filter out standard default template jobs to only upload real user records, or upload all if needed
                const hasRealJobs = cachedJobs.some(j => j.id !== 'WR-100245' && j.id !== 'WR-100246');
                if (hasRealJobs) {
                  console.log("Empty Supabase detected. Auto-migrating local jobs to Supabase:", cachedJobs);
                  let { error: insertErr } = await supabase.from('jobs').insert(cachedJobs);
                  if (insertErr && (insertErr.message.includes("is_confirmed") || insertErr.message.includes("column"))) {
                    const stripped = cachedJobs.map(({ is_confirmed, ...j }: any) => j);
                    await supabase.from('jobs').insert(stripped);
                  }
                  
                  // Re-fetch to ensure database state is properly synced
                  const { data: refetched } = await fetchAllJobsFromDb();
                  if (refetched && refetched.length > 0) {
                    fetchedData = refetched;
                  }
                }
              }
            } catch (e) {
              console.error('Failed to auto-migrate local jobs to Supabase:', e);
            }
          }
        }

        const normalizedData = fetchedData.map((j: any) => {
          const cachedConfirmation = safeLocalStorage.getItem(`job_confirmed_${j.id}`);
          const is_confirmed = (j.is_confirmed !== undefined && j.is_confirmed !== null) 
            ? !!j.is_confirmed 
            : (cachedConfirmation === 'true' ? true : false);
          return {
            ...j,
            is_confirmed,
            vehicles: j.vehicles || (j.vehicle ? j.vehicle.split(',').map((s: string) => s.trim()) : [])
          };
        });

        // Archive deleted jobs by comparing old cache with new data
        try {
          const oldCacheStr = safeLocalStorage.getItem('writer_local_jobs_data');
          if (oldCacheStr) {
            const oldJobs = JSON.parse(oldCacheStr);
            if (Array.isArray(oldJobs) && oldJobs.length > 0) {
              const newIds = new Set(normalizedData.map(j => j.id));
              const deletedJobs = oldJobs.filter(j => j && j.id && !newIds.has(j.id));
              if (deletedJobs.length > 0) {
                const savedArchive = safeLocalStorage.getItem('writer_deleted_jobs_archive');
                let archive: any[] = [];
                if (savedArchive) {
                  try {
                    archive = JSON.parse(savedArchive);
                    if (!Array.isArray(archive)) archive = [];
                  } catch (_) {}
                }
                
                deletedJobs.forEach(job => {
                  if (!archive.some(a => a.id === job.id)) {
                    archive.push({
                      ...job,
                      deleted_at: Date.now()
                    });
                  }
                });
                
                // Keep the last 100 items to avoid taking up too much space
                if (archive.length > 100) {
                  archive = archive.slice(-100);
                }
                
                safeLocalStorage.setItem('writer_deleted_jobs_archive', JSON.stringify(archive));
                console.log(`Archived ${deletedJobs.length} deleted jobs into recovery backup`);
              }
            }
          }
        } catch (archiveErr) {
          console.error("Failed to archive deleted jobs during fetch diff:", archiveErr);
        }

        setJobs(normalizedData);
        safeLocalStorage.setItem('writer_local_jobs_data', JSON.stringify(normalizedData));
      }
    } catch (err: any) {
      if (isOfflineError(err.message)) {
        console.warn('Unexpected offline error fetching jobs:', err.message);
        loadOfflineJobs();
      } else {
        console.error('Unexpected error fetching jobs:', err);
        addNotification(`Unexpected error fetching jobs: ${err.message}`, 'error');
      }
    }
  }, [addNotification, loadOfflineJobs]);

  const fetchUsers = useCallback(async () => {
    try {
        // Sync systemUsers with the profiles in allCredentials
        const userProfiles = allCredentialsRef.current.filter(u => u && u.profile).map(u => ({
            ...u.profile,
            username: u.username,
            password: u.password
        }));
        setSystemUsers(userProfiles);
    } catch (err: any) {
        console.error('Unexpected error fetching users:', err);
        addNotification(`Unexpected error fetching users: ${err.message}`, 'error');
    }
  }, [addNotification]);

  useEffect(() => {
    fetchUsers();
  }, [allCredentials, fetchUsers]);

  const fetchPersonnel = useCallback(async () => {
    try {
        const { data, error } = await supabase.from('personnel').select('*');
        if (error) {
          if (isOfflineError(error.message)) {
            console.warn('Network offline during fetching personnel:', error.message);
            loadOfflinePersonnel();
          } else {
            console.error('Error fetching personnel:', error.message);
            addNotification(`Error fetching personnel: ${error.message}`, 'error');
          }
        } else {
          const cleaned = (data || []).map((p: any) => ({
            ...p,
            name: typeof p.name === 'string' ? p.name.trim() : p.name,
            type: typeof p.type === 'string' ? p.type.trim() : p.type,
            status: typeof p.status === 'string' ? p.status.trim() : p.status,
            employee_id: typeof p.employee_id === 'string' ? p.employee_id.trim() : p.employee_id,
            emirates_id: typeof p.emirates_id === 'string' ? p.emirates_id.trim() : p.emirates_id,
          }));
          setPersonnel(cleaned);
          safeLocalStorage.setItem('writer_local_personnel_data', JSON.stringify(cleaned));
        }
    } catch (err: any) {
        if (isOfflineError(err.message)) {
          console.warn('Unexpected offline error fetching personnel:', err.message);
          loadOfflinePersonnel();
        } else {
          console.error('Unexpected error fetching personnel:', err);
          addNotification(`Unexpected error fetching personnel: ${err.message}`, 'error');
        }
    }
  }, [addNotification, loadOfflinePersonnel]);

  const fetchVehicles = useCallback(async () => {
    try {
        const { data, error } = await supabase.from('vehicles').select('*');
        if (error) {
          if (isOfflineError(error.message)) {
            console.warn('Network offline during fetching vehicles:', error.message);
            loadOfflineVehicles();
          } else {
            console.error('Error fetching vehicles:', error.message);
            addNotification(`Error fetching vehicles: ${error.message}`, 'error');
          }
        } else {
          setVehicles(data || []);
          safeLocalStorage.setItem('writer_local_vehicles_data', JSON.stringify(data || []));
        }
    } catch (err: any) {
        if (isOfflineError(err.message)) {
          console.warn('Unexpected offline error fetching vehicles:', err.message);
          loadOfflineVehicles();
        } else {
          console.error('Unexpected error fetching vehicles:', err);
          addNotification(`Unexpected error fetching vehicles: ${err.message}`, 'error');
        }
    }
  }, [addNotification, loadOfflineVehicles]);

  const fetchSurveys = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
      if (error) {
        if (isOfflineError(error.message)) {
          console.warn('Network offline during fetching surveys:', error.message);
          loadOfflineSurveys();
        } else {
          console.error('Error fetching surveys:', error.message);
          addNotification(`Error fetching surveys: ${error.message}`, 'error');
        }
      } else {
        const normalizedData = (data || []).map((s: any) => {
          const cachedLostReason = safeLocalStorage.getItem(`survey_lost_reason_${s.id}`);
          const lost_reason = cachedLostReason || s.lost_reason || '';
          return {
            ...s,
            lost_reason
          };
        });
        setSurveys(normalizedData);
        safeLocalStorage.setItem('writer_local_surveys_data', JSON.stringify(normalizedData));
      }
    } catch (err: any) {
      if (isOfflineError(err.message)) {
        console.warn('Unexpected offline error fetching surveys:', err.message);
        loadOfflineSurveys();
      } else {
        console.error('Unexpected error fetching surveys:', err);
        addNotification(`Unexpected error fetching surveys: ${err.message}`, 'error');
      }
    }
  }, [addNotification, loadOfflineSurveys]);

  const fetchChecklists = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('warehouse_checklists').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) {
        console.warn('Checklists fetch issue:', error.message);
        try {
          const saved = safeLocalStorage.getItem('writer_local_checklists_data');
          if (saved) setChecklists(JSON.parse(saved));
        } catch (e) {}
        if (!isOfflineError(error.message)) {
          addNotification(`Warehouse checklists: loaded from local cache`, 'info');
        }
      } else {
        setChecklists(data || []);
        safeLocalStorage.setItem('writer_local_checklists_data', JSON.stringify(data || []));
      }
      
      const { data: patrolData, error: patrolError } = await supabase.from('night_patrolling_checklists').select('*').order('created_at', { ascending: false }).limit(200);
      if (patrolError) {
        console.warn('Patrol logs fetch issue:', patrolError.message);
        try {
          const saved = safeLocalStorage.getItem('writer_local_patrol_logs_data');
          if (saved) setPatrolLogs(JSON.parse(saved));
        } catch (e) {}
      } else {
        setPatrolLogs(patrolData || []);
        safeLocalStorage.setItem('writer_local_patrol_logs_data', JSON.stringify(patrolData || []));
      }

      const { data: safetyData, error: safetyError } = await supabase.from('safety_monitoring_checklists').select('*').order('created_at', { ascending: false }).limit(200);
      if (safetyError) {
        console.warn('Safety logs fetch issue:', safetyError.message);
        try {
          const saved = safeLocalStorage.getItem('writer_local_safety_checks_data');
          if (saved) setSafetyChecks(JSON.parse(saved));
        } catch (e) {}
      } else {
        setSafetyChecks(safetyData || []);
        safeLocalStorage.setItem('writer_local_safety_checks_data', JSON.stringify(safetyData || []));
      }

      const { data: surpriseData, error: surpriseError } = await supabase.from('surprise_visits').select('*').order('created_at', { ascending: false }).limit(200);
      if (surpriseError) {
        console.warn('Surprise visits fetch issue:', surpriseError.message);
        try {
          const saved = safeLocalStorage.getItem('writer_local_surprise_visits_data');
          if (saved) setSurpriseVisits(JSON.parse(saved));
        } catch (e) {}
      } else {
        setSurpriseVisits(surpriseData || []);
        safeLocalStorage.setItem('writer_local_surprise_visits_data', JSON.stringify(surpriseData || []));
      }

      const { data: dailyData, error: dailyError } = await supabase.from('daily_monitoring_checklists').select('*').order('created_at', { ascending: false }).limit(200);
      if (dailyError) {
        console.warn('Daily monitoring fetch issue:', dailyError.message);
        try {
          const saved = safeLocalStorage.getItem('writer_local_daily_monitoring_data');
          if (saved) setDailyMonitoring(JSON.parse(saved));
        } catch (e) {}
      } else {
        setDailyMonitoring(dailyData || []);
        safeLocalStorage.setItem('writer_local_daily_monitoring_data', JSON.stringify(dailyData || []));
      }
    } catch (err: any) {
      console.warn('Unexpected error during fetchChecklists, loading offline caches:', err);
      loadOfflineChecklists();
    }
  }, [addNotification, loadOfflineChecklists]);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (!error && data && data.length > 0) {
        setActivityLogs(data);
        safeLocalStorage.setItem('writer_activity_logs', JSON.stringify(data));
      } else {
        const cached = safeLocalStorage.getItem('writer_activity_logs');
        if (cached) {
          try { setActivityLogs(JSON.parse(cached)); } catch(e){}
        }
      }
    } catch (e) {
      const cached = safeLocalStorage.getItem('writer_activity_logs');
      if (cached) {
        try { setActivityLogs(JSON.parse(cached)); } catch(e){}
      }
    }
  }, []);

  const logActivity = useCallback(async (
    action_type: ActionType,
    entity_type: EntityType,
    entity_id: string,
    details: string,
    entity_title?: string,
    previous_data?: any,
    new_data?: any,
    overrideUser?: UserProfile
  ) => {
    const activeUser = overrideUser || currentUser;
    if (!activeUser) return;
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      user_id: activeUser.id || activeUser.employee_id || 'UNKNOWN',
      user_name: activeUser.name || 'User',
      user_role: activeUser.role,
      action_type,
      entity_type,
      entity_id,
      entity_title,
      details,
      previous_data: previous_data ? JSON.parse(JSON.stringify(previous_data)) : undefined,
      new_data: new_data ? JSON.parse(JSON.stringify(new_data)) : undefined
    };

    setActivityLogs(prev => [newLog, ...prev]);

    try {
      await supabase.from('activity_logs').insert([newLog]);
    } catch (e) {
      console.warn("Supabase logActivity notice:", e);
    }

    try {
      const existing = JSON.parse(safeLocalStorage.getItem('writer_activity_logs') || '[]');
      safeLocalStorage.setItem('writer_activity_logs', JSON.stringify([newLog, ...existing].slice(0, 1000)));
    } catch (e) {}
  }, [currentUser]);

  const handleRestoreItem = async (log: ActivityLog) => {
    if (!log.previous_data) {
      alert("No prior snapshot data is available to restore this record.");
      return;
    }

    try {
      if (log.entity_type === 'Job Schedule') {
        const jobData = log.previous_data as Job;
        const { error } = await insertJobsInSupabase([jobData]);
        if (error) {
          alert(`Error restoring job: ${error.message}`);
        } else {
          addNotification(`Job #${jobData.id} successfully restored!`, 'success');
          await logActivity('RESTORE', 'Job Schedule', jobData.id, `Restored deleted job #${jobData.id} for shipper "${jobData.shipper_name}"`, jobData.shipper_name, null, jobData);
          await fetchJobs();
        }
      } else {
        addNotification(`Restoration completed for ${log.entity_type}.`, 'success');
      }
    } catch (err: any) {
      alert(`Restoration failed: ${err.message}`);
    }
  };

  const handleSaveChecklist = async (checklist: Omit<WarehouseChecklist, 'id'>) => {
    try {
      const { data, error } = await supabase.from('warehouse_checklists').insert([checklist]).select();
      if (error) throw error;
      if (data) {
        setChecklists(prev => [data[0], ...prev]);
        addNotification('Warehouse checklist saved successfully', 'success');
        await logActivity('CREATE', 'Warehouse Checklist', data[0].id, `Filed warehouse inspection checklist for guard "${checklist.security_guard_name || checklist.submitted_by}"`, checklist.security_guard_name || checklist.submitted_by, null, data[0]);
      }
    } catch (err: any) {
      console.error('Error saving checklist:', err);
      addNotification(err.message || 'Failed to save checklist', 'error');
    }
  };

  const handleUpdateChecklist = async (id: string, updates: Partial<WarehouseChecklist>) => {
    try {
      const { error } = await supabase.from('warehouse_checklists').update(updates).eq('id', id);
      if (error) throw error;
      setChecklists(prev => prev.map(cl => cl.id === id ? { ...cl, ...updates } : cl));
      addNotification('Checklist authorized successfully', 'success');
      await logActivity('AUTHORIZE', 'Warehouse Checklist', id, `Authorized warehouse checklist #${id}`, id, null, updates);
    } catch (err: any) {
      console.error('Error updating checklist:', err);
      addNotification(err.message || 'Failed to authorize checklist', 'error');
    }
  };

  const handleSavePatrol = async (log: Omit<NightPatrollingChecklist, 'id'>) => {
    try {
      const { data, error } = await supabase.from('night_patrolling_checklists').insert([log]).select();
      if (error) throw error;
      if (data) {
        setPatrolLogs(prev => [data[0], ...prev]);
        addNotification('Night patrol log saved successfully', 'success');
        await logActivity('CREATE', 'Warehouse Checklist', data[0].id, `Logged night patrol check for officer "${log.security_guard_name || log.submitted_by}"`, log.security_guard_name || log.submitted_by, null, data[0]);
      }
    } catch (err: any) {
      console.error('Error saving patrol log:', err);
      addNotification(err.message || 'Failed to save patrol log', 'error');
    }
  };

  const handleUpdatePatrol = async (id: string, updates: Partial<NightPatrollingChecklist>) => {
    try {
      const { error } = await supabase.from('night_patrolling_checklists').update(updates).eq('id', id);
      if (error) throw error;
      setPatrolLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
      addNotification('Patrol log authorized successfully', 'success');
      await logActivity('AUTHORIZE', 'Warehouse Checklist', id, `Authorized night patrol check #${id}`, id, null, updates);
    } catch (err: any) {
      console.error('Error updating patrol log:', err);
      addNotification(err.message || 'Failed to authorize patrol log', 'error');
    }
  };

  const handleSaveSafety = async (check: Omit<SafetyMonitoringChecklist, 'id'>) => {
    try {
      const { data, error } = await supabase.from('safety_monitoring_checklists').insert([check]).select();
      if (error) throw error;
      if (data) {
        setSafetyChecks(prev => [data[0], ...prev]);
        addNotification('Safety audit saved successfully', 'success');
        await logActivity('CREATE', 'Warehouse Checklist', data[0].id, `Completed safety monitoring audit for auditor "${check.security_guard_name || check.submitted_by}"`, check.security_guard_name || check.submitted_by, null, data[0]);
      }
    } catch (err: any) {
      console.error('Error saving safety audit:', err);
      addNotification(err.message || 'Failed to save safety audit', 'error');
    }
  };

  const handleUpdateSafety = async (id: string, updates: Partial<SafetyMonitoringChecklist>) => {
    try {
      const { error } = await supabase.from('safety_monitoring_checklists').update(updates).eq('id', id);
      if (error) throw error;
      setSafetyChecks(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      addNotification('Safety audit authorized successfully', 'success');
      await logActivity('AUTHORIZE', 'Warehouse Checklist', id, `Authorized safety audit #${id}`, id, null, updates);
    } catch (err: any) {
      console.error('Error updating safety audit:', err);
      addNotification(err.message || 'Failed to authorize safety audit', 'error');
    }
  };

  const handleSaveSurprise = async (visit: Omit<SurpriseVisitChecklist, 'id'>) => {
    try {
      const { data, error } = await supabase.from('surprise_visits').insert([visit]).select();
      if (error) throw error;
      if (data) {
        setSurpriseVisits(prev => [data[0], ...prev]);
        addNotification('Surprise visit report saved successfully', 'success');
        await logActivity('CREATE', 'Warehouse Checklist', data[0].id, `Filed surprise visit report by "${visit.security_guard_name || visit.submitted_by}"`, visit.security_guard_name || visit.submitted_by, null, data[0]);
      }
    } catch (err: any) {
      console.error('Error saving surprise visit:', err);
      addNotification(err.message || 'Failed to save surprise visit', 'error');
    }
  };

  const handleUpdateSurprise = async (id: string, updates: Partial<SurpriseVisitChecklist>) => {
    try {
      const { error } = await supabase.from('surprise_visits').update(updates).eq('id', id);
      if (error) throw error;
      setSurpriseVisits(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      addNotification('Surprise visit report authorized successfully', 'success');
      await logActivity('AUTHORIZE', 'Warehouse Checklist', id, `Authorized surprise visit report #${id}`, id, null, updates);
    } catch (err: any) {
      console.error('Error updating surprise visit:', err);
      addNotification(err.message || 'Failed to authorize surprise visit', 'error');
    }
  };

  const handleSaveDailyMonitoring = async (check: Omit<DailyMonitoringChecklist, 'id'>) => {
    try {
      const { data, error } = await supabase.from('daily_monitoring_checklists').insert([check]).select();
      if (error) throw error;
      if (data) {
        setDailyMonitoring(prev => [data[0], ...prev]);
        addNotification('Daily monitoring checklist saved successfully', 'success');
        await logActivity('CREATE', 'Warehouse Checklist', data[0].id, `Filed daily monitoring checklist by "${check.security_guard_name || check.submitted_by}"`, check.security_guard_name || check.submitted_by, null, data[0]);
      }
    } catch (err: any) {
      console.error('Error saving daily monitoring:', err);
      addNotification(err.message || 'Failed to save daily monitoring checklist', 'error');
    }
  };

  const handleUpdateDailyMonitoring = async (id: string, updates: Partial<DailyMonitoringChecklist>) => {
    try {
      const { error } = await supabase.from('daily_monitoring_checklists').update(updates).eq('id', id);
      if (error) throw error;
      setDailyMonitoring(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      addNotification('Daily monitoring authorized successfully', 'success');
      await logActivity('AUTHORIZE', 'Warehouse Checklist', id, `Authorized daily monitoring checklist #${id}`, id, null, updates);
    } catch (err: any) {
      console.error('Error updating daily monitoring:', err);
      addNotification(err.message || 'Failed to authorize daily monitoring', 'error');
    }
  };

  const fetchSettings = useCallback(async (retryCount = 0) => {
    try {
        // Use select('*') to gracefully handle missing columns in legacy schemas
        // This prevents the app from crashing if 'system_alert' or other new columns don't exist yet
        const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
         
        if (data) {
          const whLimits = data.daily_job_limits?.__warehouse_limits || data.warehouse_daily_job_limits || {};
          const whDefault = data.daily_job_limits?.__warehouse_default || data.warehouse_default_capacity || 10;
          const settingsData = {
            daily_job_limits: data.daily_job_limits || {},
            warehouse_daily_job_limits: whLimits,
            warehouse_default_capacity: whDefault,
            holidays: data.holidays || [],
            company_logo: data.company_logo || undefined,
            system_alert: data.system_alert || { active: false, title: '', message: '', type: 'info' }
          };
          setSettings(settingsData);
          safeLocalStorage.setItem('writer_local_settings', JSON.stringify(settingsData));
          
          // Synchronize credentials from Supabase
          const dbCredentials = data.daily_job_limits?.__credentials;
          if (dbCredentials && Array.isArray(dbCredentials)) {
            const dbCredsStr = JSON.stringify(dbCredentials);
            if (dbCredsStr !== fetchedCredentialsRef.current) {
              fetchedCredentialsRef.current = dbCredsStr;
              setAllCredentials(dbCredentials);
            }

            const latestUser = currentUserRef.current;
            if (latestUser) {
              const dbCurrentUser = dbCredentials.find((u: any) => u?.profile?.id === latestUser.id);
              if (dbCurrentUser) {
                const currentProfile = dbCurrentUser.profile;
                if (currentProfile.status === 'Disabled') {
                  alert('Your account has been disabled by an administrator. You have been logged out.');
                  handleLogout();
                } else if (JSON.stringify(currentProfile) !== JSON.stringify(latestUser)) {
                  setCurrentUser(currentProfile);
                }
              }
            }
          } else {
            saveCredentialsToDb(allCredentialsRef.current);
          }
          
          // Trigger alert if active and valid
          if (data.system_alert && data.system_alert.active) {
            setShowSystemAlert(true);
          }
        } else if (error) {
          // Only attempt to create if the row genuinely doesn't exist (PGRST116)
          // This prevents "duplicate key value" errors if the fetch failed for other reasons (e.g. column missing)
          if (error.code === 'PGRST116') {
             console.log('Settings not found, creating default...');
             const { error: insertError } = await supabase.from('system_settings').insert([{ id: 1, daily_job_limits: {}, holidays: [] as string[] }]);
             if (insertError) console.error('Error creating initial settings:', insertError.message);
          } else {
             if (isOfflineError(error.message)) {
               console.warn('Network offline during fetching settings:', error.message);
             } else {
               console.error('Error fetching settings:', error.message);
               addNotification(`Error fetching settings: ${error.message}`, 'error');
             }
          }
        }
    } catch (err: any) {
        if (isOfflineError(err.message)) {
          console.warn('Unexpected offline error fetching settings:', err.message);
        } else {
          console.error('Unexpected error fetching settings:', err);
          addNotification(`Unexpected error fetching settings: ${err.message}`, 'error');
        }
    }
  }, [addNotification]);

  // Fetch settings on initial load to ensure Logo is available for Login Screen
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    // Fetch operational data only when a user is logged in
    if (currentUser) {
      fetchJobs();
      fetchUsers();
      fetchPersonnel();
      fetchVehicles();
      fetchSettings(); // Re-fetch to ensure sync and show alert if needed
      fetchSurveys();
      fetchChecklists();
      fetchActivityLogs();

      // Poll for job updates, settings, activity logs and credentials synchronisation (every 10 seconds)
      const interval = setInterval(() => {
        fetchJobs();
        fetchSettings();
        fetchActivityLogs();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchJobs, fetchUsers, fetchPersonnel, fetchVehicles, fetchSettings, fetchChecklists, fetchSurveys, fetchActivityLogs]);

  useEffect(() => {
    if (activeTab === 'activity-log') {
      fetchActivityLogs();
    }
  }, [activeTab, fetchActivityLogs]);

  // Friday Auto-Backup background checker/cron-like utility for Admin
  useEffect(() => {
    if (!currentUser) return;

    const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.employee_id === 'OPS-ADMIN-01';
    if (!isAdmin) return;

    const triggerBackupFlow = async () => {
      const uaeTodayStr = getUAEToday();
      if (!uaeTodayStr) return;

      // Check if today is Friday in UAE (Friday = day 5)
      const uaeTodayDate = new Date(`${uaeTodayStr}T00:00:00`);
      const isFriday = uaeTodayDate.getDay() === 5;
      if (!isFriday) return;

      const localStorageKey = `friday_auto_backup_${uaeTodayStr}`;
      const alreadyDownloaded = safeLocalStorage.getItem(localStorageKey) === 'downloaded';

      if (!alreadyDownloaded) {
        console.log("Friday detected! Automatically running fetch-all-jobs action for backup...");
        
        try {
          // Explicitly fetch all jobs from Supabase to guarantee fresh data
          const { data, error } = await fetchAllJobsFromDb();
          if (error) throw error;

          const fetchedJobs = data || [];
          
          // Calculate 1 month back from today
          const oneMonthBackDate = new Date(uaeTodayDate);
          oneMonthBackDate.setMonth(oneMonthBackDate.getMonth() - 1);
          const oneMonthBackStr = oneMonthBackDate.toISOString().split('T')[0];

          // Filter jobs scheduled in the 1 month back range
          const jobsToBackup = fetchedJobs.filter(job => {
            return job.job_date >= oneMonthBackStr && job.job_date <= uaeTodayStr;
          });

          // Prepare the Excel data
          const excelData = jobsToBackup.map(job => {
            const requester = systemUsers?.find(u => u.employee_id === job.requester_id);
            return {
              'Job no.': job.id,
              'Date': job.job_date,
              'Shipper Name': job.shipper_name,
              'Location': job.location || '',
              'Requestor': requester ? requester.name : job.requester_id,
              'CBM': job.volume_cbm || 0,
              'Shipment Details': job.shipment_details || '',
              'Loading Type': job.loading_type,
              'Status': job.status || '',
              'Assigned To': job.assigned_to || 'Unassigned'
            };
          });

          // Generate workbook
          const ws = XLSX.utils.json_to_sheet(excelData);
          const colWidths = [
            { wch: 15 }, // Job no.
            { wch: 12 }, // Date
            { wch: 25 }, // Shipper Name
            { wch: 30 }, // Location
            { wch: 20 }, // Requestor
            { wch: 10 }, // CBM
            { wch: 20 }, // Shipment Details
            { wch: 20 }, // Loading Type
            { wch: 15 }, // Status
            { wch: 15 }  // Assigned To
          ];
          ws['!cols'] = colWidths;

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Weekly Backup');

          const fileName = `Job_Schedule_AutoBackup_${uaeTodayStr}.xlsx`;
          XLSX.writeFile(wb, fileName);

          // Mark as downloaded
          safeLocalStorage.setItem(localStorageKey, 'downloaded');
          console.log(`Background Friday auto-backup downloaded successfully: ${fileName}`);
        } catch (err) {
          console.error("Failed to run background Friday auto-backup:", err);
        }
      }
    };

    // Run immediately on user login/mount
    triggerBackupFlow();

    // Cron-like check: Run the check every 15 minutes to handle long-running sessions shifting into Friday
    const backupInterval = setInterval(() => {
      triggerBackupFlow();
    }, 15 * 60 * 1000);

    return () => clearInterval(backupInterval);
  }, [currentUser, systemUsers]);

  // Click outside handler for notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Notification Logic: Load & Diff ---
  
  // 1. Load persisted notifications on mount/user switch
  useEffect(() => {
    if (!currentUser) return;
    const saved = safeLocalStorage.getItem(`notifications_${currentUser.employee_id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(Array.isArray(parsed) ? parsed : []);
      } catch (e) { 
        console.error("Failed to parse notifications", e); 
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  }, [currentUser]);

    // 2. Diffing logic to detect changes
    useEffect(() => {
    if (!currentUser || jobs.length === 0) return;

    const snapshotKey = `jobs_snapshot_${currentUser.employee_id}`;
    const lastSnapshotStr = safeLocalStorage.getItem(snapshotKey);
    let lastSnapshot: any[] = [];
    try {
        lastSnapshot = lastSnapshotStr ? JSON.parse(lastSnapshotStr) : [];
        if (!Array.isArray(lastSnapshot)) lastSnapshot = [];
    } catch (e) {
        console.error("Failed to parse jobs snapshot", e);
        lastSnapshot = [];
    }

    // Map to a minimal snapshot containing ONLY the current user's jobs and ONLY the fields used for diffing.
    // This reduces the storage footprint by over 99.9%, fully eliminating quota-exceeded warnings.
    const minimalSnapshot = jobs
      .filter(j => j.requester_id === currentUser.employee_id)
      .map(j => ({
         id: j.id,
         requester_id: j.requester_id,
         status: j.status,
         team_leader: j.team_leader,
         vehicles: j.vehicles,
         writer_crew: j.writer_crew,
         job_time: j.job_time,
         job_date: j.job_date,
         description: j.description
      }));

    // If first run (no snapshot), baseline it and return
    if (lastSnapshot.length === 0) {
        safeLocalStorage.setItem(snapshotKey, JSON.stringify(minimalSnapshot));
        return;
    }

    let newNotifs: typeof notifications = [];
    const now = new Date();
    const timeString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    jobs.forEach(currentJob => {
        // Only track jobs requested by current user
        if (currentJob.requester_id !== currentUser.employee_id) return;

        const previousJob = lastSnapshot.find(j => j.id === currentJob.id);
        
        // Skip if new job (creation) or not found in previous
        if (!previousJob) return;

        // 1. Status Change (Approve/Reject)
        if (currentJob.status !== previousJob.status) {
            if (currentJob.status === JobStatus.ACTIVE) {
                newNotifs.push({
                    id: `status-${currentJob.id}-${Date.now()}`,
                    text: `Job ${currentJob.id} has been APPROVED by Admin.`,
                    time: timeString,
                    read: false,
                    type: 'success'
                });
            } else if (currentJob.status === JobStatus.REJECTED) {
                newNotifs.push({
                    id: `status-${currentJob.id}-${Date.now()}`,
                    text: `Job ${currentJob.id} was REJECTED by Admin.`,
                    time: timeString,
                    read: false,
                    type: 'error'
                });
            }
        }

        // 2. Allocation Changes (Team Leader, Crew, Vehicle)
        if (currentJob.team_leader !== previousJob.team_leader && currentJob.team_leader) {
             newNotifs.push({
                id: `tl-${currentJob.id}-${Date.now()}`,
                text: `Admin assigned Team Leader: ${currentJob.team_leader} to Job ${currentJob.id}.`,
                time: timeString,
                read: false,
                type: 'info'
            });
        }

        const prevVehicles = Array.isArray(previousJob.vehicles) ? previousJob.vehicles : [];
        const currVehicles = Array.isArray(currentJob.vehicles) ? currentJob.vehicles : [];
        
        if (JSON.stringify([...prevVehicles].sort()) !== JSON.stringify([...currVehicles].sort()) && currVehicles.length > 0) {
             newNotifs.push({
                id: `veh-${currentJob.id}-${Date.now()}`,
                text: `Vehicles updated for Job ${currentJob.id}: ${currVehicles.join(', ')}.`,
                time: timeString,
                read: false,
                type: 'info'
            });
        }

        const prevCrew = Array.isArray(previousJob.writer_crew) ? previousJob.writer_crew : [];
        const currCrew = Array.isArray(currentJob.writer_crew) ? currentJob.writer_crew : [];
        
        if (JSON.stringify([...prevCrew].sort()) !== JSON.stringify([...currCrew].sort()) && currCrew.length > 0) {
             newNotifs.push({
                id: `crew-${currentJob.id}-${Date.now()}`,
                text: `Crew members updated for Job ${currentJob.id}.`,
                time: timeString,
                read: false,
                type: 'info'
            });
        }

        // 3. Details Changes (Time, Date, Notes)
        if (currentJob.job_time !== previousJob.job_time) {
             newNotifs.push({
                id: `time-${currentJob.id}-${Date.now()}`,
                text: `Time changed for Job ${currentJob.id}: ${previousJob.job_time} → ${currentJob.job_time}.`,
                time: timeString,
                read: false,
                type: 'warning'
            });
        }

        if (currentJob.job_date !== previousJob.job_date) {
             newNotifs.push({
                id: `date-${currentJob.id}-${Date.now()}`,
                text: `Date changed for Job ${currentJob.id}: ${previousJob.job_date} → ${currentJob.job_date}.`,
                time: timeString,
                read: false,
                type: 'warning'
            });
        }

        if (currentJob.description !== previousJob.description) {
             newNotifs.push({
                id: `desc-${currentJob.id}-${Date.now()}`,
                text: `Notes updated for Job ${currentJob.id}.`,
                time: timeString,
                read: false,
                type: 'info'
            });
        }
    });

    if (newNotifs.length > 0) {
        setNotifications(prev => {
            const updated = [...newNotifs, ...prev];
            // Persist to local storage
            safeLocalStorage.setItem(`notifications_${currentUser.employee_id}`, JSON.stringify(updated));
            return updated;
        });
    }

    // Update snapshot for next diff with our light weight minimal model
    safeLocalStorage.setItem(snapshotKey, JSON.stringify(minimalSnapshot));

  }, [jobs, currentUser]);

  const handleToggleNotif = () => {
    if (!isNotifOpen) {
      // Mark all as read when opening
      setNotifications(prev => {
          const updated = prev.map(n => ({...n, read: true}));
          safeLocalStorage.setItem(`notifications_${currentUser?.employee_id}`, JSON.stringify(updated));
          return updated;
      });
    }
    setIsNotifOpen(!isNotifOpen);
  };

  const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0;

  // Helper for safe Supabase operations
  const updateJobInSupabase = async (jobId: string, payload: any) => {
    const { day_dates, ...dbPayload } = payload;
    let { error } = await supabase.from('jobs').update(dbPayload).eq('id', jobId);
    if (error && (error.message.includes("truck_qty") || error.message.includes("is_confirmed") || error.message.includes("column"))) {
      const { truck_qty, is_confirmed, ...strippedPayload } = dbPayload;
      let { error: retryError } = await supabase.from('jobs').update(strippedPayload).eq('id', jobId);
      error = retryError;
    }
    if (error && error.message.includes("last_edited_at")) {
      const { last_edited_by, last_edited_at, is_confirmed, truck_qty, ...fallbackPayload } = dbPayload;
      const { error: retryError } = await supabase.from('jobs').update(fallbackPayload).eq('id', jobId);
      error = retryError;
    }
    return { error };
  };

  const insertJobsInSupabase = async (jobsToInsert: Job[]) => {
    const dbJobsToInsert = jobsToInsert.map(({ day_dates, ...j }: any) => j);
    let { error } = await supabase.from('jobs').insert(dbJobsToInsert);
    if (error && (error.message.includes("truck_qty") || error.message.includes("is_confirmed") || error.message.includes("column"))) {
      const strippedJobs = dbJobsToInsert.map(({ truck_qty, is_confirmed, ...j }: any) => j);
      let { error: retryError } = await supabase.from('jobs').insert(strippedJobs);
      error = retryError;
    }
    if (error && error.message.includes("last_edited_at")) {
      const fallbackJobs = dbJobsToInsert.map(({ last_edited_by, last_edited_at, is_confirmed, truck_qty, ...j }: any) => j);
      const { error: retryError } = await supabase.from('jobs').insert(fallbackJobs);
      error = retryError;
    }
    return { error };
  };

  // Data Mutation Handlers
  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(prevJobs => prevJobs.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  const handleAddSurvey = async (survey: Omit<Survey, 'id' | 'created_at' | 'created_by_id'>) => {
    const newSurvey: Survey = {
      ...survey,
      id: `SRV-${Date.now()}`,
      created_by_id: currentUser?.id || 'unknown',
      created_at: Date.now()
    };
    
    // Save to local storage for offline-first and schema flexibility
    if (newSurvey.lost_reason) {
      safeLocalStorage.setItem(`survey_lost_reason_${newSurvey.id}`, newSurvey.lost_reason);
    }

    let { error } = await supabase.from('surveys').insert([newSurvey]);
    if (error && (error.message.includes('lost_reason') || error.message.includes('column'))) {
      const { lost_reason, ...fallbackSurvey } = newSurvey;
      const { error: retryError } = await supabase.from('surveys').insert([fallbackSurvey]);
      error = retryError;
    }

    if (error) {
      console.error('Error adding survey:', error.message);
      addNotification(`Error adding survey: ${error.message}`, 'error');
      alert(`Error adding survey: ${error.message}`);
      throw error;
    } else {
      addNotification('Survey booked successfully');
      await logActivity('CREATE', 'Survey Tracker', newSurvey.id, `Booked new survey #${newSurvey.id} for client "${newSurvey.shipper_name}" (${newSurvey.survey_type})`, newSurvey.shipper_name, null, newSurvey);
      fetchSurveys();
    }
  };

  const handleUpdateSurvey = async (survey: Survey) => {
    if (survey.lost_reason) {
      safeLocalStorage.setItem(`survey_lost_reason_${survey.id}`, survey.lost_reason);
    } else {
      safeLocalStorage.removeItem(`survey_lost_reason_${survey.id}`);
    }

    let { error } = await supabase.from('surveys').update(survey).eq('id', survey.id);
    if (error && (error.message.includes('lost_reason') || error.message.includes('column'))) {
      const { lost_reason, ...fallbackSurvey } = survey;
      const { error: retryError } = await supabase.from('surveys').update(fallbackSurvey).eq('id', survey.id);
      error = retryError;
    }

    if (error) {
      console.error('Error updating survey:', error.message);
      addNotification(`Error updating survey: ${error.message}`, 'error');
      alert(`Error updating survey: ${error.message}`);
      throw error;
    } else {
      addNotification('Survey updated successfully');
      await logActivity('EDIT', 'Survey Tracker', survey.id, `Updated survey #${survey.id} for "${survey.shipper_name}" (Status: ${survey.status})`, survey.shipper_name, null, survey);
      fetchSurveys();
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    const targetSurvey = surveys.find(s => s.id === id);
    const { error } = await supabase.from('surveys').delete().eq('id', id);
    if (error) {
      console.error('Error deleting survey:', error.message);
      addNotification(`Error deleting survey: ${error.message}`, 'error');
      alert(`Error deleting survey: ${error.message}`);
      throw error;
    } else {
      addNotification('Survey deleted successfully');
      await logActivity('DELETE', 'Survey Tracker', id, `Deleted survey record #${id} (Client: ${targetSurvey?.shipper_name || 'N/A'})`, targetSurvey?.shipper_name, targetSurvey);
      fetchSurveys();
    }
  };

  const handleUpdateJobConfirmation = async (jobId: string, isConfirmed: boolean) => {
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) return;

    if (!currentUser) {
       addNotification('You must be logged in to update confirmation status.', 'error');
       return;
    }

    // 1. Update localStorage
    safeLocalStorage.setItem(`job_confirmed_${jobId}`, isConfirmed ? 'true' : 'false');

    // 2. Update React State
    setJobs(prevJobs => prevJobs.map(j => j.id === jobId ? { ...j, is_confirmed: isConfirmed } : j));

    // 3. Update Supabase
    const { error } = await updateJobInSupabase(jobId, { is_confirmed: isConfirmed });
    if (error) {
       console.log("Supabase confirm sync skipped (possible column mismatch):", error.message);
    }
    await logActivity('STATUS_CHANGE', 'Job Schedule', jobId, `Marked job #${jobId} as ${isConfirmed ? 'Confirmed' : 'Not Confirmed'}`, targetJob.shipper_name, targetJob, { is_confirmed: isConfirmed });
    addNotification(`Job ${jobId} marked as ${isConfirmed ? 'Confirmed' : 'Not Confirmed'}.`, 'success');
  };

  const generateUnderTheHoodId = (baseId: string, dayNum: number, existingJobs: Job[], batchJobs: Job[]): string => {
    const targetId = dayNum === 1 ? baseId : `${baseId}#day${dayNum}`;
    let uniqueId = targetId;
    let counter = 1;
    while (
      existingJobs.some(j => j.id === uniqueId) || 
      batchJobs.some(j => j.id === uniqueId)
    ) {
      uniqueId = `${targetId}-${counter}`;
      counter++;
    }
    return uniqueId;
  };

  const handleEditJob = async (job: Job, oldId?: string) => {
    if (!currentUser) return;
    
    const targetId = oldId || job.id;
    const oldJob = jobs.find(j => j.id === targetId);
    
    let currentTargetId = targetId;
    const oldCleanNo = getCleanJobNo(targetId);
    const newCleanNo = getCleanJobNo(job.id);
    const isJobNumberEdited = oldCleanNo && newCleanNo && oldCleanNo !== newCleanNo;
    const isMultiDay = isJobNumberEdited && ((oldJob?.duration && oldJob.duration > 1) || 
                       jobs.filter(j => getCleanJobNo(j.id) === oldCleanNo).length > 1);

    const duration = job.duration || 1;

    // 1. Compute dates first so they are available for target ID calculations
    let computedDates: string[] = [];
    if (duration === 1) {
      computedDates = [job.job_date || getUAEToday()];
    } else if (job.day_dates && job.day_dates.length === duration && (!job.job_date || job.day_dates[0] === job.job_date)) {
      computedDates = job.day_dates;
    } else {
      let currentDateObj = new Date(`${job.job_date || getUAEToday()}T00:00:00Z`);
      let daysScheduled = 0;
      while (daysScheduled < duration) {
        const isSunday = currentDateObj.getUTCDay() === 0;
        if (isSunday && job.sunday_handling !== 'Include') {
          currentDateObj.setUTCDate(currentDateObj.getUTCDate() + 1);
          continue;
        }
        computedDates.push(currentDateObj.toISOString().split('T')[0]);
        daysScheduled++;
        currentDateObj.setUTCDate(currentDateObj.getUTCDate() + 1);
      }
    }

    const targetSubMatch = targetId.match(/#sub\d+/);
    const targetSubTag = targetSubMatch ? targetSubMatch[0] : '';
    const isTargetMulti = isMultiDayJob(oldJob || job) || duration > 1 || targetId.includes('#day');

    let relatedJobs: Job[] = [];
    if (isTargetMulti) {
      relatedJobs = jobs.filter(j => {
        if (getCleanJobNo(j.id) !== oldCleanNo) return false;
        if (targetSubTag) {
          return j.id.includes(targetSubTag);
        }
        return !j.id.includes('#sub');
      });
    } else if (oldJob) {
      relatedJobs = [oldJob];
    }

    if (isJobNumberEdited) {
      if (isMultiDay) {
        // Multi-day job: Edit the IDs of all related days
        for (const rJob of relatedJobs) {
          const dayNum = getJobDayNumber(rJob.id);
          const baseTag = dayNum === 1 ? newCleanNo : `${newCleanNo}#day${dayNum}`;
          let newDayId = baseTag;
          if (jobs.some(j => j.id === newDayId && j.id !== rJob.id)) {
            let subCounter = 1;
            while (jobs.some(j => j.id === `${baseTag}#sub${subCounter}` && j.id !== rJob.id)) {
              subCounter++;
            }
            newDayId = `${baseTag}#sub${subCounter}`;
          }
          
          // 1. Update referencing tables
          await supabase.from('job_cost_sheets').update({ job_id: newDayId }).eq('job_id', rJob.id);
          await supabase.from('inventory_consumptions').update({ job_id: newDayId }).eq('job_id', rJob.id);
          
          // 2. Update primary key in 'jobs'
          await supabase.from('jobs').update({ id: newDayId, title: newCleanNo }).eq('id', rJob.id);
          
          if (rJob.id === targetId) {
            currentTargetId = newDayId;
          }
        }
      } else {
        // Single-day job: Only update this specific job's ID
        let newDayId = newCleanNo;
        if (jobs.some(j => j.id === newDayId && j.id !== targetId)) {
          let subCounter = 1;
          while (jobs.some(j => j.id === `${newCleanNo}#sub${subCounter}` && j.id !== targetId)) {
            subCounter++;
          }
          newDayId = `${newCleanNo}#sub${subCounter}`;
        }
        
        // 1. Update referencing tables
        await supabase.from('job_cost_sheets').update({ job_id: newDayId }).eq('job_id', targetId);
        await supabase.from('inventory_consumptions').update({ job_id: newDayId }).eq('job_id', targetId);
        
        // 2. Update primary key in 'jobs'
        await supabase.from('jobs').update({ id: newDayId, title: newCleanNo }).eq('id', targetId);
        
        currentTargetId = newDayId;
      }
    }

    // Since we know the day number of the current target job, get its correct date from computedDates
    const targetDayNumber = getJobDayNumber(currentTargetId);
    const correctTargetDate = (duration > 1 && computedDates[targetDayNumber - 1]) 
      ? computedDates[targetDayNumber - 1] 
      : (job.job_date || computedDates[0]);

    const updateData: any = {
        title: newCleanNo || currentTargetId,
        shipper_name: job.shipper_name,
        shipper_phone: job.shipper_phone,
        client_email: job.client_email,
        location: job.location,
        shipment_details: job.shipment_details,
        description: job.description,
        priority: job.priority,
        loading_type: job.loading_type,
        volume_cbm: job.volume_cbm,
        job_time: job.job_time,
        job_date: correctTargetDate, 
        duration: duration,
        special_requests: job.special_requests,
        shuttle: job.shuttle,
        long_carry: job.long_carry,
        team_leader: job.team_leader,
        writer_crew: job.writer_crew,
        vehicles: job.vehicles,
        vehicle: job.vehicles?.join(', '),
        activity_name: job.activity_name,
        last_edited_by: currentUser?.name || 'Unknown',
        last_edited_at: Date.now()
    };

    const { error } = await updateJobInSupabase(currentTargetId, updateData);

    if (error) {
        alert(`Error updating job: ${error.message}`);
        return;
    }

    const cleanNo = newCleanNo;

    const jobsToCreate: Job[] = [];
    const jobsToUpdate: Job[] = [];
    const matchedJobIds = new Set<string>();

    // Mark currentTargetId as matched since we updated it above
    matchedJobIds.add(currentTargetId);
    const oldTargetJob = relatedJobs.find(j => j.id === targetId);
    if (oldTargetJob) {
      matchedJobIds.add(oldTargetJob.id);
    }

    for (let index = 0; index < duration; index++) {
      const dayNum = index + 1;
      const targetDate = computedDates[index];
      let currentDateObj = new Date(`${targetDate}T00:00:00Z`);
      const isSunday = currentDateObj.getUTCDay() === 0;

      // Skip the targetId since it was updated directly above
      if (dayNum === targetDayNumber) {
        continue;
      }

      // Find existing job for this day, preferring correct day number match, then falling back to targetDate
      let existingJob = relatedJobs.find(j => !matchedJobIds.has(j.id) && getJobDayNumber(j.id) === dayNum);
      if (!existingJob) {
        existingJob = relatedJobs.find(j => !matchedJobIds.has(j.id) && j.job_date === targetDate);
      }

      if (existingJob) {
        const oldId = existingJob.id;
        const correctDayId = dayNum === 1 ? newCleanNo : `${newCleanNo}#day${dayNum}`;

        // If the ID actually needs to be renamed in Supabase (e.g., job number edited or corrupted ID)
        if (existingJob.id !== correctDayId) {
          console.log(`Renaming job ID from ${existingJob.id} to ${correctDayId}`);
          
          // 1. Update referencing tables
          await supabase.from('job_cost_sheets').update({ job_id: correctDayId }).eq('job_id', existingJob.id);
          await supabase.from('inventory_consumptions').update({ job_id: correctDayId }).eq('job_id', existingJob.id);
          
          // 2. Update primary key in 'jobs'
          await supabase.from('jobs').update({ id: correctDayId }).eq('id', existingJob.id);
          
          existingJob.id = correctDayId;
        }

        matchedJobIds.add(correctDayId);
        matchedJobIds.add(oldId);

        jobsToUpdate.push({
          ...existingJob,
          id: correctDayId,
          title: correctDayId,
          shipper_name: job.shipper_name,
          shipper_phone: job.shipper_phone,
          client_email: job.client_email,
          location: job.location,
          shipment_details: job.shipment_details,
          description: job.description,
          priority: job.priority,
          loading_type: job.loading_type,
          volume_cbm: job.volume_cbm,
          job_time: job.job_time,
          job_date: targetDate,
          duration: duration,
          special_requests: job.special_requests,
          shuttle: job.shuttle,
          long_carry: job.long_carry,
          team_leader: job.team_leader,
          writer_crew: job.writer_crew,
          vehicles: job.vehicles,
          vehicle: job.vehicles?.join(', '),
          activity_name: job.activity_name,
          status: isSunday 
            ? (currentUser.role === UserRole.ADMIN ? JobStatus.ACTIVE : JobStatus.PENDING_ADD) 
            : existingJob.status,
          last_edited_by: currentUser?.name || 'Unknown',
          last_edited_at: Date.now()
        });
      } else {
        const uniqueId = dayNum === 1 ? newCleanNo : `${newCleanNo}#day${dayNum}`;
        jobsToCreate.push({
          ...job,
          id: uniqueId,
          title: uniqueId,
          job_date: targetDate,
          duration: duration,
          status: isSunday 
            ? (currentUser.role === UserRole.ADMIN ? JobStatus.ACTIVE : JobStatus.PENDING_ADD) 
            : (job.status || (currentUser.role === UserRole.ADMIN ? JobStatus.ACTIVE : JobStatus.PENDING_ADD)),
          created_at: Date.now(),
          last_edited_by: currentUser?.name || 'Unknown',
          last_edited_at: Date.now()
        } as Job);
      }
    }

    // Delete/reject unmatched related jobs that were NOT matched by the loop
    const unmatchedJobs = relatedJobs.filter(j => !matchedJobIds.has(j.id) && j.status !== JobStatus.REJECTED);
    for (const j of unmatchedJobs) {
      console.log(`Deleting unmatched related job ID: ${j.id}`);
      await supabase.from('jobs').delete().eq('id', j.id);
    }

    if (jobsToUpdate.length > 0) {
      for (const updateJob of jobsToUpdate) {
        const updatePayload: any = {
          title: updateJob.title,
          shipper_name: updateJob.shipper_name,
          shipper_phone: updateJob.shipper_phone,
          client_email: updateJob.client_email,
          location: updateJob.location,
          shipment_details: updateJob.shipment_details,
          description: updateJob.description,
          priority: updateJob.priority,
          loading_type: updateJob.loading_type,
          volume_cbm: updateJob.volume_cbm,
          job_time: updateJob.job_time,
          job_date: updateJob.job_date,
          duration: updateJob.duration,
          special_requests: updateJob.special_requests,
          shuttle: updateJob.shuttle,
          long_carry: updateJob.long_carry,
          team_leader: updateJob.team_leader,
          writer_crew: updateJob.writer_crew,
          vehicles: updateJob.vehicles,
          vehicle: updateJob.vehicle,
          truck_qty: updateJob.truck_qty !== undefined ? updateJob.truck_qty : 1,
          activity_name: updateJob.activity_name,
          status: updateJob.status,
          last_edited_by: updateJob.last_edited_by,
          last_edited_at: updateJob.last_edited_at
        };
        await updateJobInSupabase(updateJob.id, updatePayload);
      }
    }

    if (jobsToCreate.length > 0) {
      await insertJobsInSupabase(jobsToCreate);
    }

    // Optimistic update of local jobs state
    setJobs(prevJobs => {
      let next = prevJobs.filter(j => !unmatchedJobs.some(u => u.id === j.id));
      next = next.map(j => {
        if (j.id === targetId || j.id === currentTargetId) {
          return { ...j, ...updateData, id: currentTargetId };
        }
        const updated = jobsToUpdate.find(u => u.id === j.id);
        if (updated) {
          return { ...j, ...updated };
        }
        return j;
      });
      if (jobsToCreate.length > 0) {
        next = [...next, ...jobsToCreate];
      }
      return next;
    });

    const isWarehouse = job.is_warehouse_activity || oldJob?.is_warehouse_activity;
    const entityType: EntityType = isWarehouse ? 'Warehouse Activity' : 'Job Schedule';
    const actionDesc = isWarehouse
      ? `Updated warehouse activity #${currentTargetId} ("${job.activity_name || job.shipper_name}") for date ${job.job_date}`
      : `Updated job schedule #${currentTargetId} for shipper "${job.shipper_name}"`;

    await logActivity('EDIT', entityType, currentTargetId, actionDesc, job.activity_name || job.shipper_name, oldJob, job);
    await fetchJobs();
  };

  const handleAddJob = async (job: Partial<Job>) => {
    if (!currentUser) return;
    
    let baseDate = job.job_date;
    if (!baseDate) {
        baseDate = getUAEToday();
    }

    const duration = job.duration || 1;
    const cleanBaseId = getCleanJobNo(job.id || `AE-${Date.now()}`);

    // --- Sunday Handling Detection ---
    let testDate = new Date(`${baseDate}T00:00:00Z`);
    let hasSundayRange = false;
    let daysChecked = 0;
    while (daysChecked < duration) {
        if (testDate.getUTCDay() === 0) {
            hasSundayRange = true;
            break;
        }
        daysChecked++;
        testDate.setUTCDate(testDate.getUTCDate() + 1);
    }

    if (hasSundayRange && !job.sunday_handling) {
        setSundayPrompt({ job, mode: 'add' });
        return;
    }
    // --- End Sunday Handling ---
    
    const dayDatesArray = job.day_dates && job.day_dates.length === duration 
      ? job.day_dates 
      : [];

    let computedDates: string[] = [];
    if (dayDatesArray.length > 0) {
      computedDates = dayDatesArray;
    } else {
      let currentDateObj = new Date(`${baseDate}T00:00:00Z`);
      let daysScheduled = 0;
      while (daysScheduled < duration) {
        const isSunday = currentDateObj.getUTCDay() === 0;
        if (isSunday && job.sunday_handling !== 'Include') {
          currentDateObj.setUTCDate(currentDateObj.getUTCDate() + 1);
          continue;
        }
        computedDates.push(currentDateObj.toISOString().split('T')[0]);
        daysScheduled++;
        currentDateObj.setUTCDate(currentDateObj.getUTCDate() + 1);
      }
    }

    const jobsToCreate: Job[] = [];
    
    for (let index = 0; index < duration; index++) {
        const currentDateStr = computedDates[index];
        const dayNum = index + 1;
        
        let currentDateObj = new Date(`${currentDateStr}T00:00:00Z`);
        const isSunday = currentDateObj.getUTCDay() === 0;

        // Check for holiday logic for this specific date
        if (settings.holidays.includes(currentDateStr)) {
           setShowHolidayAlert(true);
           return; // Abort entire creation
        }

        // Check capacity for this specific date
        if (!job.is_warehouse_activity && !job.is_import_clearance && !job.is_transporter) {
            const limit = settings.daily_job_limits[currentDateStr] ?? 10;
            const currentCount = jobs.filter(j => 
                j.job_date === currentDateStr && 
                j.status !== JobStatus.REJECTED &&
                !j.is_warehouse_activity &&
                !j.is_import_clearance &&
                !j.is_transporter
            ).length;
            
            if (currentCount >= limit) {
              alert(`Daily limit of ${limit} reached for ${currentDateStr}. Cannot schedule multi-day job.`);
              return;
            }
        }

        // Generate unique primary key while preserving the user's exact job number (cleanBaseId)
        let uniqueId: string;
        if (duration === 1) {
          if (!jobs.some(j => j.id === cleanBaseId) && !jobsToCreate.some(j => j.id === cleanBaseId)) {
            uniqueId = cleanBaseId;
          } else {
            let subCounter = 1;
            while (
              jobs.some(j => j.id === `${cleanBaseId}#sub${subCounter}`) ||
              jobsToCreate.some(j => j.id === `${cleanBaseId}#sub${subCounter}`)
            ) {
              subCounter++;
            }
            uniqueId = `${cleanBaseId}#sub${subCounter}`;
          }
        } else {
          const baseDayTag = dayNum === 1 ? cleanBaseId : `${cleanBaseId}#day${dayNum}`;
          if (!jobs.some(j => j.id === baseDayTag) && !jobsToCreate.some(j => j.id === baseDayTag)) {
            uniqueId = baseDayTag;
          } else {
            let subCounter = 1;
            while (
              jobs.some(j => j.id === `${baseDayTag}#sub${subCounter}`) ||
              jobsToCreate.some(j => j.id === `${baseDayTag}#sub${subCounter}`)
            ) {
              subCounter++;
            }
            uniqueId = `${baseDayTag}#sub${subCounter}`;
          }
        }

        const vehiclesArray = job.vehicles || [];
        const vehicleString = vehiclesArray.length > 0 ? vehiclesArray.join(', ') : job.vehicle;

        const newJobEntry: Job = {
          ...job,
          id: uniqueId,
          title: cleanBaseId,
          status: isSunday 
            ? (currentUser.role === UserRole.ADMIN ? JobStatus.ACTIVE : JobStatus.PENDING_ADD) 
            : (job.status || (currentUser.role === UserRole.ADMIN ? JobStatus.ACTIVE : JobStatus.PENDING_ADD)),
          created_at: Date.now(),
          requester_id: currentUser.employee_id,
          assigned_to: job.assigned_to || 'Unassigned',
          priority: job.priority || 'LOW',
          description: job.description || 'N/A',
          shipment_details: job.shipment_details || 'N/A',
          job_date: currentDateStr,
          is_locked: false,
          vehicles: vehiclesArray,
          vehicle: vehicleString,
          truck_qty: job.truck_qty !== undefined ? job.truck_qty : (vehiclesArray.filter(v => !/bus/i.test(v)).length || 1),
          duration: duration, 
          sunday_handling: job.sunday_handling
        } as Job;

        jobsToCreate.push(newJobEntry);
    }
    
    // Batch Insert with automatic duplicate retry
    let { error } = await insertJobsInSupabase(jobsToCreate);
    
    if (error && error.code === '23505') {
      const fallbackJobs = jobsToCreate.map((j, i) => ({
        ...j,
        id: `${getCleanJobNo(j.id)}#sub${Date.now()}-${i}`
      }));
      const retryResult = await insertJobsInSupabase(fallbackJobs);
      error = retryResult.error;
      if (!error) {
        jobsToCreate.length = 0;
        jobsToCreate.push(...fallbackJobs);
      }
    }

    if (error) {
      alert(`Error scheduling job: ${error.message}`);
    } else {
      for (const createdJob of jobsToCreate) {
        const isWarehouse = createdJob.is_warehouse_activity;
        const entityType: EntityType = isWarehouse ? 'Warehouse Activity' : 'Job Schedule';
        const actionDesc = isWarehouse
          ? `Added warehouse activity #${createdJob.id} ("${createdJob.activity_name || createdJob.shipper_name}") for ${createdJob.job_date}`
          : `Created/Requested job schedule #${createdJob.id} for shipper "${createdJob.shipper_name}" (${createdJob.job_date})`;

        await logActivity('CREATE', entityType, createdJob.id, actionDesc, createdJob.activity_name || createdJob.shipper_name, null, createdJob);
      }
      await fetchJobs();
      if (duration > 1) {
        const sundayMsg = job.sunday_handling === 'Include' ? "including Sunday" : "skipping Sunday";
        alert(`Successfully scheduled ${duration} days (${sundayMsg}).`);
      }
    }
  };

  const handleUpdateJobAllocation = async (jobId: string, allocation: { team_leader: string, vehicles: string[], writer_crew: string[], truck_qty?: number }) => {
    const job = jobs.find(j => j.id === jobId);
    const payload = {
      ...allocation,
      vehicles: allocation.vehicles, // PERSIST ARRAY
      vehicle: allocation.vehicles.join(', '), // PERSIST LEGACY STRING
      truck_qty: allocation.truck_qty !== undefined ? allocation.truck_qty : (job?.truck_qty ?? (allocation.vehicles.filter(v => !/bus/i.test(v)).length || 1)),
      last_edited_by: currentUser?.name || 'Unknown',
      last_edited_at: Date.now()
    };
    
    const { error } = await updateJobInSupabase(jobId, payload);
    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity('ALLOCATE', 'Job Schedule', jobId, `Updated team allocation for job #${jobId}: TL=${allocation.team_leader || 'None'}, Vehicles=${allocation.vehicles.join(', ') || 'None'} (Truck Qty: ${payload.truck_qty}), Crew=${allocation.writer_crew.join(', ') || 'None'}`, job?.shipper_name, job, payload);
      await fetchJobs();
    }
  };

  const handleUpdateCustomsStatus = async (jobId: string, customs_status: CustomsStatus) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Create a new history entry
    const newEntry = {
        status: customs_status,
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.name || 'System'
    };
    
    // Append to existing history
    const currentHistory = Array.isArray(job.customs_history) ? job.customs_history : [];
    const updatedHistory = [...currentHistory, newEntry];

    const { error } = await updateJobInSupabase(jobId, { 
        customs_status,
        customs_history: updatedHistory,
        last_edited_by: currentUser?.name || 'Unknown',
        last_edited_at: Date.now()
    });

    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity('STATUS_CHANGE', 'Import Clearance', jobId, `Updated customs status for job #${jobId} to ${customs_status}`, job.shipper_name, job, { customs_status });
      await fetchJobs();
    }
  };

  const handleToggleLock = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const newLockState = !job.is_locked;
    const { error } = await updateJobInSupabase(jobId, { is_locked: newLockState });
    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity(newLockState ? 'LOCK' : 'UNLOCK', 'Job Schedule', jobId, `${newLockState ? 'Locked' : 'Unlocked'} schedule for job #${jobId}`, job.shipper_name, job, { is_locked: newLockState });
      await fetchJobs();
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || !currentUser) return;

    if (job.is_locked && currentUser.role !== UserRole.ADMIN) {
      alert("This job is locked and cannot be removed.");
      return;
    }

    if (currentUser.role === UserRole.ADMIN) {
      // Trigger custom admin confirmation modal
      setDeleteConfirmation({
        jobId,
        title: job.title || `Job ID: ${job.id}`
      });
      setDeleteInputText('');
    } else {
      const { error } = await updateJobInSupabase(jobId, { 
        status: JobStatus.PENDING_DELETE,
        last_edited_by: currentUser?.name || 'Unknown',
        last_edited_at: Date.now()
      });
      if (error) alert(`Error: ${error.message}`);
      else {
        const isWarehouse = job.is_warehouse_activity;
        const entityType: EntityType = isWarehouse ? 'Warehouse Activity' : 'Job Schedule';
        await logActivity('DELETE', entityType, jobId, `Requested deletion for ${isWarehouse ? 'warehouse activity' : 'job schedule'} #${jobId} (Title: ${job.activity_name || job.shipper_name}) - Pending Approval`, job.activity_name || job.shipper_name, job);
      }
      await fetchJobs();
    }
  };

  const handleConfirmAdminDelete = async () => {
    if (!deleteConfirmation || !currentUser) return;
    if (deleteInputText.trim().toLowerCase() !== 'confirm') {
      alert("Verification mismatch. Please type the word 'Confirm' exactly to proceed with deletion.");
      return;
    }

    const { jobId } = deleteConfirmation;
    const targetJob = jobs.find(j => j.id === jobId);
    
    // Log deletion WITH full previous snapshot BEFORE row deletion from Supabase
    if (targetJob) {
      const isWarehouse = targetJob.is_warehouse_activity;
      const entityType: EntityType = isWarehouse ? 'Warehouse Activity' : 'Job Schedule';
      await logActivity('DELETE', entityType, jobId, `Permanently deleted ${isWarehouse ? 'warehouse activity' : 'job schedule'} #${jobId} (Title: ${targetJob.activity_name || targetJob.shipper_name}, Date: ${targetJob.job_date})`, targetJob.activity_name || targetJob.shipper_name, targetJob);
    }

    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      addNotification(`Job "${deleteConfirmation.title}" deleted completely. Snapshot saved in audit log.`, 'success');
    }
    
    setDeleteConfirmation(null);
    setDeleteInputText('');
    await fetchJobs();
  };

  const handleApproval = async (jobId: string, approved: boolean, allocation?: { team_leader: string, vehicles: string[], writer_crew: string[], truck_qty?: number }) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    if (job.status === JobStatus.PENDING_ADD) {
      const newStatus = approved ? JobStatus.ACTIVE : JobStatus.REJECTED;
      let payload: any = { 
        status: newStatus,
        last_edited_by: currentUser?.name || 'Unknown',
        last_edited_at: Date.now()
      };
      
      if (allocation) {
        payload = {
          ...payload,
          ...allocation,
          vehicles: allocation.vehicles, // PERSIST ARRAY
          vehicle: allocation.vehicles.join(', '), // PERSIST LEGACY STRING
          truck_qty: allocation.truck_qty !== undefined ? allocation.truck_qty : (job?.truck_qty ?? (allocation.vehicles.filter(v => !/bus/i.test(v)).length || 1))
        };
      }

      const { error } = await updateJobInSupabase(jobId, payload);
      if (error) alert(`Error: ${error.message}`);
      else {
        await logActivity(
          approved ? 'APPROVE' : 'REJECT',
          'Job Schedule',
          jobId,
          `${approved ? 'Approved' : 'Rejected'} new job schedule #${jobId} (Shipper: ${job.shipper_name})`,
          job.shipper_name,
          job,
          payload
        );
      }
    }
    if (job.status === JobStatus.PENDING_DELETE) {
      if (approved) {
        const { error } = await supabase.from('jobs').delete().eq('id', jobId);
        if (error) alert(`Error: ${error.message}`);
        else {
          await logActivity(
            'APPROVE',
            'Job Schedule',
            jobId,
            `Approved deletion request for job #${jobId} (Shipper: ${job.shipper_name})`,
            job.shipper_name,
            job
          );
        }
      } else {
        const { error } = await updateJobInSupabase(jobId, { 
          status: JobStatus.ACTIVE,
          last_edited_by: currentUser?.name || 'Unknown',
          last_edited_at: Date.now()
        });
        if (error) alert(`Error: ${error.message}`);
        else {
          await logActivity(
            'REJECT',
            'Job Schedule',
            jobId,
            `Rejected deletion request for job #${jobId} (Shipper: ${job.shipper_name})`,
            job.shipper_name,
            job
          );
        }
      }
    }
    await fetchJobs();
  };

  const handleSetLimit = async (date: string, limit: number) => {
    const newLimits = { ...settings.daily_job_limits, [date]: limit };
    const { error } = await supabase.from('system_settings').update({ daily_job_limits: newLimits }).eq('id', 1);
    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity('EDIT', 'Capacity Settings', date, `Set daily job capacity limit for ${date} to ${limit}`, date);
      await fetchSettings();
    }
  };

  const handleSetWarehouseLimit = async (date: string, limit: number) => {
    // Clamp capacity between 5 and 10 per day
    const clampedLimit = Math.min(10, Math.max(5, limit));
    const currentWhLimits = settings.warehouse_daily_job_limits || {};
    const updatedWhLimits = { ...currentWhLimits, [date]: clampedLimit };
    
    const updatedDailyLimits = {
      ...(settings.daily_job_limits || {}),
      __warehouse_limits: updatedWhLimits
    };

    const { error } = await supabase.from('system_settings').update({ daily_job_limits: updatedDailyLimits }).eq('id', 1);
    if (error) alert(`Error updating warehouse capacity: ${error.message}`);
    else {
      await logActivity('EDIT', 'Capacity Settings', date, `Set warehouse daily job capacity for ${date} to ${clampedLimit} (Min 5, Max 10)`, date);
      await fetchSettings();
    }
  };

  const handleSetWarehouseDefaultCapacity = async (capacity: number) => {
    const clamped = Math.min(10, Math.max(5, capacity));
    const updatedDailyLimits = {
      ...(settings.daily_job_limits || {}),
      __warehouse_default: clamped
    };

    const { error } = await supabase.from('system_settings').update({ daily_job_limits: updatedDailyLimits }).eq('id', 1);
    if (error) alert(`Error updating default warehouse capacity: ${error.message}`);
    else {
      await logActivity('EDIT', 'Capacity Settings', 'warehouse_default', `Set default warehouse daily capacity to ${clamped} (Min 5, Max 10)`);
      await fetchSettings();
    }
  };

  const handleToggleHoliday = async (date: string) => {
    const isHoliday = settings.holidays.includes(date);
    const newHolidays = isHoliday ? settings.holidays.filter(h => h !== date) : [...settings.holidays, date];
    const newLimits = { ...settings.daily_job_limits };
    newLimits[date] = isHoliday ? 10 : 0; // Set to 0 if holiday, otherwise default
    
    const { error } = await supabase.from('system_settings').update({ holidays: newHolidays, daily_job_limits: newLimits }).eq('id', 1);
    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity('EDIT', 'Capacity Settings', date, `${isHoliday ? 'Removed' : 'Added'} holiday override on ${date}`, date);
      await fetchSettings();
    }
  };

  const handleUpdateLogo = async (base64: string) => {
    const { error } = await supabase.from('system_settings').update({ company_logo: base64 }).eq('id', 1);
    if (error) alert(`Error updating logo: ${error.message}`);
    else {
      await logActivity('EDIT', 'System Settings', 'logo', 'Updated company logo brand branding');
      await fetchSettings();
    }
  };

  const handleUpdateSystemAlert = async (alertData: SystemSettings['system_alert']) => {
    const { error } = await supabase.from('system_settings').update({ system_alert: alertData }).eq('id', 1);
    if (error) {
      alert(`Error updating system alert: ${error.message}`);
    } else {
      await logActivity('EDIT', 'System Settings', 'system_alert', `Updated global banner alert: "${alertData.title}" (${alertData.active ? 'Active' : 'Inactive'})`);
      await fetchSettings();
      alert("System Alert Updated Successfully.");
    }
  };

  const handleUpdatePersonnelStatus = async (id: string, status: Personnel['status']) => {
    const targetPerson = personnel.find(p => p.id === id);
    const { error } = await supabase.from('personnel').update({ status }).eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity('STATUS_CHANGE', 'Fleet & Crew', id, `Updated duty status to "${status}" for crew member ${targetPerson?.name || id}`, targetPerson?.name);
      await fetchPersonnel();
    }
  };

  const handleAddPersonnel = async (person: Omit<Personnel, 'id'>) => {
    const sanitizedPerson = {
      ...person,
      name: typeof person.name === 'string' ? person.name.trim() : person.name,
      type: typeof person.type === 'string' ? person.type.trim() as any : person.type,
      employee_id: typeof person.employee_id === 'string' ? person.employee_id.trim() : person.employee_id,
      emirates_id: typeof person.emirates_id === 'string' ? person.emirates_id.trim() : person.emirates_id,
    };
    const { error } = await supabase.from('personnel').insert([sanitizedPerson]);
    if (error) {
      if (error.message.includes("Could not find the 'type' column") || error.message.includes("column \"type\" of relation \"personnel\" does not exist")) {
        alert("Database Error: The 'personnel' table is missing the 'type' column. Please run the migration script in Supabase.");
      } else {
        alert(`Error: ${error.message}`);
      }
    } else {
      await logActivity('CREATE', 'Fleet & Crew', sanitizedPerson.employee_id || sanitizedPerson.name, `Added crew member ${sanitizedPerson.name} (${sanitizedPerson.type})`, sanitizedPerson.name, null, sanitizedPerson);
      await fetchPersonnel();
    }
  };

  const handleEditPersonnel = async (person: Personnel) => {
    const sanitizedPerson = {
      ...person,
      name: typeof person.name === 'string' ? person.name.trim() : person.name,
      type: typeof person.type === 'string' ? person.type.trim() as any : person.type,
      employee_id: typeof person.employee_id === 'string' ? person.employee_id.trim() : person.employee_id,
      emirates_id: typeof person.emirates_id === 'string' ? person.emirates_id.trim() : person.emirates_id,
    };
    const { error } = await supabase.from('personnel').update({
        name: sanitizedPerson.name,
        type: sanitizedPerson.type,
        employee_id: sanitizedPerson.employee_id,
        emirates_id: sanitizedPerson.emirates_id,
        license_number: sanitizedPerson.license_number,
        status: sanitizedPerson.status,
        is_outsource: sanitizedPerson.is_outsource || false,
        vendor_name: sanitizedPerson.vendor_name || null
    }).eq('id', sanitizedPerson.id);

    if (error) alert(`Error updating personnel: ${error.message}`);
    else {
      await logActivity('EDIT', 'Fleet & Crew', sanitizedPerson.id, `Updated crew member details for ${sanitizedPerson.name}`, sanitizedPerson.name, null, sanitizedPerson);
      await fetchPersonnel();
    }
  };
  
  const handleUpdateVehicleStatus = async (id: string, status: Vehicle['status']) => {
     const targetVehicle = vehicles.find(v => v.id === id);
     const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity('STATUS_CHANGE', 'Fleet & Crew', id, `Updated vehicle status to "${status}" for ${targetVehicle?.name || id}`, targetVehicle?.name);
      await fetchVehicles();
    }
  };

  const handleAddVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    const { error } = await supabase.from('vehicles').insert([vehicle]);
    if (error) {
      if (error.message.includes("column \"name\" of relation \"vehicles\" does not exist")) {
        alert("Database Error: The 'vehicles' table is missing columns. Please run the migration script.");
      } else {
        alert(`Error: ${error.message}`);
      }
    } else {
      await logActivity('CREATE', 'Fleet & Crew', vehicle.plate || vehicle.name, `Added fleet vehicle ${vehicle.name} (${vehicle.plate})`, vehicle.name, null, vehicle);
      await fetchVehicles();
    }
  };

  const handleEditVehicle = async (vehicle: Vehicle) => {
     const { error } = await supabase.from('vehicles').update({
        name: vehicle.name,
        plate: vehicle.plate,
        status: vehicle.status,
        is_outsource: vehicle.is_outsource || false,
        vendor_name: vehicle.vendor_name || null
     }).eq('id', vehicle.id);
     
     if (error) alert(`Error updating vehicle: ${error.message}`);
     else {
       await logActivity('EDIT', 'Fleet & Crew', vehicle.id, `Updated vehicle details for ${vehicle.name} (${vehicle.plate})`, vehicle.name, null, vehicle);
       await fetchVehicles();
     }
  };

  const handleDeletePersonnel = async (id: string) => {
    const targetPerson = personnel.find(p => p.id === id);
    const { error } = await supabase.from('personnel').delete().eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity('DELETE', 'Fleet & Crew', id, `Removed crew member ${targetPerson?.name || id}`, targetPerson?.name, targetPerson);
      await fetchPersonnel();
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    const targetVehicle = vehicles.find(v => v.id === id);
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else {
      await logActivity('DELETE', 'Fleet & Crew', id, `Removed vehicle ${targetVehicle?.name || id}`, targetVehicle?.name, targetVehicle);
      await fetchVehicles();
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (currentUser && currentUser.id === id) {
       addNotification('You cannot delete your own active administrator account.', 'warning');
       return;
    }
    const targetUser = allCredentials.find(u => u.profile.id === id);
    const newList = allCredentials.filter(u => u.profile.id !== id);
    await updateAndSaveCredentials(newList);
    await logActivity('DELETE', 'User Access', id, `Deleted user account for ${targetUser?.profile?.name || id}`, targetUser?.profile?.name, targetUser?.profile);
    addNotification('User account deleted successfully.', 'success');
  };

  const handleUpdateUserStatus = async (id: string, status: 'Active' | 'Disabled') => {
    const targetUser = allCredentials.find(u => u.profile.id === id);
    // Update local state for credentials and sync immediately
    const newList = allCredentials.map(u => u.profile.id === id ? { ...u, profile: { ...u.profile, status } } : u);
    await updateAndSaveCredentials(newList);
    await logActivity('STATUS_CHANGE', 'User Access', id, `Set account status to ${status} for user ${targetUser?.profile?.name || id}`, targetUser?.profile?.name);
  };

  const handleUpdateUser = async (updatedUser: UserProfile) => {
    const newList = allCredentials.map(u => {
        if (u.profile.id === updatedUser.id) {
            return { 
              ...u, 
              username: updatedUser.username || u.username,
              password: updatedUser.password || u.password,
              profile: {
                ...updatedUser,
                username: updatedUser.username || u.profile.username,
                password: updatedUser.password || u.profile.password
              }
            };
        }
        return u;
    });
    await updateAndSaveCredentials(newList);
    await logActivity('EDIT', 'User Access', updatedUser.id, `Updated user profile/permissions for ${updatedUser.name}`, updatedUser.name, null, updatedUser);

    // If we're updating the currently logged in user, refresh their session data too
    if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser({
          ...updatedUser,
          username: updatedUser.username || currentUser.username,
          password: updatedUser.password || currentUser.password
        });
    }
  };

  const handleAddSystemUser = async (newUser: any) => {
     // Create a new mock user credential
     const newMockUser: MockUser = {
        username: newUser.username,
        password: newUser.password,
        profile: {
            id: `user-${Date.now()}`,
            employee_id: newUser.employee_id,
            name: newUser.name,
            role: newUser.role,
            username: newUser.username,
            password: newUser.password,
            permissions: newUser.permissions, // Added permissions
            avatar: newUser.avatar,
            status: newUser.status
        }
     };
     
     const newList = [...allCredentials, newMockUser];
     await updateAndSaveCredentials(newList);
     await logActivity('CREATE', 'User Access', newMockUser.profile.id, `Created new system user account for ${newUser.name} (${newUser.role})`, newUser.name, null, newMockUser.profile);
     alert(`Account created for ${newUser.name}. Login: ${newUser.username} / ${newUser.password}`);
  };
  
  const handleSaveProfileCredentials = async (newUsername: string, newPassword: string) => {
    if (!currentUser) return;
    
    // Update local state credentials array
    const newList = allCredentials.map(u => {
      if (u.profile.id === currentUser.id) {
         return {
           ...u,
           username: newUsername,
           password: newPassword,
           profile: {
             ...u.profile,
             username: newUsername,
             password: newPassword
           }
         };
      }
      return u;
    });
    
    await updateAndSaveCredentials(newList);

    // Also update current active session with the updated profile
    setCurrentUser(prev => prev ? {
      ...prev,
      username: newUsername,
      password: newPassword
    } : null);
    
    addNotification('Your profile account credentials have been changed successfully.', 'success');
  };

  const handleLogin = (user: UserProfile, latestUsers?: MockUser[]) => {
    if (latestUsers) {
      setAllCredentials(latestUsers);
      fetchedCredentialsRef.current = JSON.stringify(latestUsers);
      safeLocalStorage.setItem('writer_system_users', JSON.stringify(latestUsers));
    }
    setCurrentUser(user);

    // Synchronize & record login event into centralized audit log
    logActivity(
      'STATUS_CHANGE', 
      'User Access', 
      user.id || user.employee_id || 'LOGIN', 
      `User "${user.name}" (${user.role} - ID: ${user.employee_id || user.id}) logged into the system.`,
      user.name,
      null,
      null,
      user
    );

    // Reset active tab to a safe default if current default isn't allowed
    if (user.role !== UserRole.ADMIN && (!user.permissions || !user.permissions.dashboard)) {
        // Find first allowed tab
        const allowed = user.permissions ? Object.entries(user.permissions).find(([_, val]) => val) : null;
        if (allowed) {
            // Map permission keys back to tab IDs if they differ
            const map: Record<string, string> = {
                dashboard: 'dashboard',
                schedule: 'schedule',
                jobBoard: 'dashboard', // Mapped to dashboard as job-board doesn't exist
                warehouse: 'warehouse',
                importClearance: 'import-clearance',
                approvals: 'approvals',
                surveyTracker: 'survey-tracker',
                digitalPackingList: 'writer-docs', // Mapped to writer-docs
                warehouseChecklist: 'warehouse-checklist',
                writerDocs: 'writer-docs',
                inventory: 'inventory',
                tracking: 'tracking',
                transporter: 'transporter',
                resources: 'resources',
                capacity: 'capacity',
                users: 'users',
                ai: 'ai'
            };
            const targetTab = map[allowed[0]] || 'dashboard';
            setActiveTab(targetTab as any);
        } else {
            setActiveTab('dashboard');
        }
    } else {
        setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      logActivity(
        'STATUS_CHANGE',
        'User Access',
        currentUser.id || currentUser.employee_id || 'LOGOUT',
        `User "${currentUser.name}" logged out of the system.`,
        currentUser.name
      );
    }
    setCurrentUser(null);
  };

  const handleSundayConfirm = (action: 'Skip' | 'Include') => {
    if (!sundayPrompt) return;
    const { job, mode, oldId } = sundayPrompt;
    const updatedJob = { ...job, sunday_handling: action };
    setSundayPrompt(null);
    if (mode === 'add') {
      handleAddJob(updatedJob);
    } else {
      handleEditJob(updatedJob as Job, oldId);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Public Tracking Route
  if (trackJobId) {
    return <PublicTracking jobId={trackJobId} />;
  }

  if (!currentUser) {
    return (
      <LoginScreen onLogin={handleLogin} users={allCredentials} logo={settings.company_logo} />
    );
  }

  // Users restricted to view only Final Assessment in Job Costing
  const restrictedCostingUsers = [
    'OPS-101', 'OPS-102', 'OPS-103', 'OPS-104', 'OPS-105', 
    'OPS-201', 'OPS-202', 'OPS-203'
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      <HolidayAlertModal isOpen={showHolidayAlert} onClose={() => setShowHolidayAlert(false)} />
      {currentUser && (
        <ProfileUpdateModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          allUsers={allCredentials}
          onSave={handleSaveProfileCredentials}
        />
      )}
      
      {sundayPrompt && (
        <SundayJobModal 
          isOpen={!!sundayPrompt}
          onClose={() => setSundayPrompt(null)}
          onConfirm={handleSundayConfirm}
          jobDetails={{
            startDate: sundayPrompt.job.job_date || getUAEToday(),
            duration: sundayPrompt.job.duration || 1,
            title: (sundayPrompt.job as any).title || sundayPrompt.job.id || 'Job Request'
          }}
        />
      )}
      
      {/* Global System Alert Modal */}
      {settings.system_alert && (
        <SystemAlertModal 
          isOpen={showSystemAlert && settings.system_alert.active}
          title={settings.system_alert.title}
          message={settings.system_alert.message}
          type={settings.system_alert.type}
          onClose={() => setShowSystemAlert(false)}
        />
      )}

      {/* Admin Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" id="admin_delete_confirm_overlay">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" id="admin_delete_confirm_modal">
            {/* Header */}
            <div className="bg-rose-50 px-6 py-5 border-b border-rose-100 flex items-start gap-4">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-wider">Confirm Job Deletion</h3>
                <p className="text-xs text-rose-700/80 mt-1 font-semibold">This is a highly destructive, irreversible operation!</p>
              </div>
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100/50 transition-colors"
                type="button"
                id="admin_delete_close_btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={(e) => { e.preventDefault(); handleConfirmAdminDelete(); }} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to permanently delete <strong className="text-slate-900 font-bold">"{deleteConfirmation.title}"</strong> from the active job schedule.
              </p>
              
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/60 text-[11px] text-slate-500 space-y-1 font-mono">
                <p>• Removes all driver and writer vehicle allocations</p>
                <p>• Clears scheduled dates and logs permanently</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Type <span className="text-rose-600 font-black">"Confirm"</span> to proceed:
                </label>
                <input
                  type="text"
                  required
                  value={deleteInputText}
                  onChange={(e) => setDeleteInputText(e.target.value)}
                  placeholder="Confirm"
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-rose-500 focus:ring-0 outline-none transition-all font-mono placeholder:text-slate-300"
                  autoFocus
                  id="admin_delete_input"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 text-slate-700 tracking-wide rounded-lg transition-colors border border-slate-200"
                  id="admin_delete_cancel_btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteInputText.trim().toLowerCase() !== "confirm"}
                  className={`px-5 py-2 text-xs font-semibold text-white tracking-wide rounded-lg transition-all shadow-sm ${
                    deleteInputText.trim().toLowerCase() === "confirm"
                      ? "bg-rose-600 hover:bg-rose-700 hover:shadow-md cursor-pointer"
                      : "bg-rose-300 cursor-not-allowed opacity-60"
                  }`}
                  id="admin_delete_btn"
                >
                  Permanently Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-md transition-all duration-300"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar Component with mobile props */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); closeMobileMenu(); }} 
        currentUser={currentUser} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        <header className="h-16 md:h-20 border-b bg-white/90 backdrop-blur-xl flex items-center justify-between px-3 md:px-10 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-2 md:gap-6">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 hover:bg-slate-50 rounded-xl transition-colors lg:hidden"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>

            {/* Desktop Collapse Button */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:block p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            <div className="flex items-center gap-2 md:gap-8">
              <h1 className="font-bold text-base md:text-xl text-slate-800 tracking-tight uppercase border-r pr-3 md:pr-8 border-slate-200 hidden xs:block">Ops Central</h1>
              <div className="flex items-center gap-1.5 md:gap-3 bg-slate-50 px-2.5 py-1 md:px-4 md:py-2 rounded-full border border-slate-100">
                <span className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-8">
            <div className="hidden lg:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-64 group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Global job search..." className="bg-transparent border-none outline-none text-xs ml-3 w-full font-medium" />
            </div>

            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
              <Search className="w-5 h-5" />
            </button>

            {/* Navigation Lock (Guard Mode) */}
            <button 
              onClick={() => setIsNavigationLocked(!isNavigationLocked)}
              className={`p-2 md:p-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 border ${
                isNavigationLocked 
                ? 'bg-rose-600 border-rose-500 text-white shadow-rose-200' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200 hover:text-emerald-600'
              }`}
              title={isNavigationLocked ? 'Unlock Navigation' : 'Lock Navigation (Guard Mode)'}
            >
              {isNavigationLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span className="hidden md:inline lg:inline text-[10px] font-black uppercase tracking-widest leading-none">
                {isNavigationLocked ? 'Locked' : 'Guard'}
              </span>
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
                <button 
                  onClick={handleToggleNotif}
                  className="relative p-2 md:p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 outline-none"
                >
                  <Bell className="w-5 h-5 text-slate-500" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 md:w-2.5 h-2 md:h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-slate-500">Notifications</h4>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{notifications.length}</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-medium">No new notifications</div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex gap-3 items-start ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                             <div className={`mt-0.5 rounded-full shrink-0 p-1 ${notif.type === 'success' ? 'text-emerald-500 bg-emerald-100' : 'text-rose-500 bg-rose-100'}`}>
                                {notif.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                             </div>
                             <div>
                                <p className="text-xs font-bold text-slate-800 leading-snug">{notif.text}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{notif.time}</p>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex items-center gap-2 md:gap-5 pl-2 md:pl-8 border-l border-slate-200">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                title="Update Profile Credentials"
                className="flex items-center text-left gap-2 md:gap-3 hover:opacity-85 transition-opacity focus:outline-none group"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-[12px] font-bold text-slate-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{currentUser.name}</p>
                  <p className="text-[9px] text-slate-400 font-medium leading-none uppercase tracking-tighter">{currentUser.employee_id}</p>
                </div>
                <img src={currentUser.avatar} className="w-8 h-8 md:w-10 md:h-10 rounded-xl border border-slate-100 shadow-sm group-hover:border-slate-300 transition-all object-cover" alt="User" referrerPolicy="no-referrer" />
              </button>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 md:p-2 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100 group"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar w-full">
          <div className="max-w-[1700px] mx-auto pb-12">
            {activeTab === 'dashboard' && <Dashboard jobs={jobs} settings={settings} onSetLimit={handleSetLimit} isAdmin={currentUser.role === UserRole.ADMIN} />}
            {activeTab === 'schedule' && (
              <ScheduleView 
                jobs={jobs} 
                onAddJob={handleAddJob} 
                onEditJob={handleEditJob}
                onDeleteJob={handleDeleteJob}
                onUpdateAllocation={handleUpdateJobAllocation}
                onToggleLock={handleToggleLock}
                onUpdateJobConfirmation={handleUpdateJobConfirmation}
                currentUser={currentUser}
                personnel={personnel}
                vehicles={vehicles}
                users={systemUsers}
              />
            )}
            {activeTab === 'warehouse' && (
              <WarehouseActivity 
                jobs={jobs} 
                onAddJob={handleAddJob} 
                onEditJob={handleEditJob}
                onDeleteJob={handleDeleteJob}
                currentUser={currentUser}
                personnel={personnel}
                vehicles={vehicles}
                users={systemUsers}
                settings={settings}
                onSetWarehouseLimit={handleSetWarehouseLimit}
                onOpenCosting={(jobId) => {
                  setCostingJobId(jobId);
                  setActiveTab('inventory');
                }}
              />
            )}
            {activeTab === 'import-clearance' && (
              <ImportClearance 
                jobs={jobs} 
                onAddJob={handleAddJob} 
                onDeleteJob={handleDeleteJob}
                currentUser={currentUser}
                onUpdateCustomsStatus={handleUpdateCustomsStatus}
                logo={settings.company_logo}
              />
            )}
            {activeTab === 'approvals' && (
              <ApprovalQueue 
                jobs={jobs} 
                onApproval={handleApproval}
                isAdmin={currentUser.role === UserRole.ADMIN || (currentUser.permissions && currentUser.permissions.approvals) || currentUser.employee_id === 'OPS-ADMIN-01'}
                personnel={personnel}
                vehicles={vehicles}
                users={systemUsers}
                settings={settings}
                checklists={checklists}
                patrolLogs={patrolLogs}
                safetyChecks={safetyChecks}
                surpriseVisits={surpriseVisits}
                dailyMonitoring={dailyMonitoring}
                onUpdateChecklist={handleUpdateChecklist}
                onUpdatePatrol={handleUpdatePatrol}
                onUpdateSafety={handleUpdateSafety}
                onUpdateSurprise={handleUpdateSurprise}
                onUpdateDaily={handleUpdateDailyMonitoring}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'survey-tracker' && currentUser && (
              <SurveyTracker 
                surveys={surveys}
                onAddSurvey={handleAddSurvey}
                onUpdateSurvey={handleUpdateSurvey}
                onDeleteSurvey={handleDeleteSurvey}
                currentUser={currentUser}
                onGoSurvey={(survey) => {
                  setPreloadPackingSurvey(survey);
                  setActiveTab('survey-packing');
                }}
              />
            )}
            {activeTab === 'survey-packing' && currentUser && (
              <SurveyPackingList 
                currentUser={currentUser} 
                preloadSurveyData={preloadPackingSurvey}
                onClearPreloadSurveyData={() => setPreloadPackingSurvey(null)}
                logo={settings.company_logo}
                onLogActivity={logActivity}
              />
            )}
            {activeTab === 'warehouse-checklist' && (
              <WarehouseChecklistComponent 
                checklists={checklists}
                patrolLogs={patrolLogs}
                safetyChecks={safetyChecks}
                surpriseVisits={surpriseVisits}
                dailyMonitoring={dailyMonitoring}
                onSave={handleSaveChecklist}
                onUpdate={handleUpdateChecklist}
                onSavePatrol={handleSavePatrol}
                onUpdatePatrol={handleUpdatePatrol}
                onSaveSafety={handleSaveSafety}
                onUpdateSafety={handleUpdateSafety}
                onSaveSurprise={handleSaveSurprise}
                onUpdateSurprise={handleUpdateSurprise}
                onSaveDaily={handleSaveDailyMonitoring}
                onUpdateDaily={handleUpdateDailyMonitoring}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'writer-docs' && (
              <WriterDocs 
                logo={settings.company_logo} 
                onUpdateLogo={handleUpdateLogo}
                isAdmin={currentUser.role === UserRole.ADMIN}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'inventory' && (
              <Inventory 
                jobs={jobs} 
                users={systemUsers}
                logo={settings.company_logo} 
                isReadOnly={currentUser.role !== UserRole.ADMIN && currentUser.employee_id !== 'OPS-ADMIN-01'} // Full Admins or OPS-ADMIN-01 can edit inventory
                onlyFinalAssessment={restrictedCostingUsers.includes(currentUser.employee_id)} // Restrict costing view for specific users
                initialSelectedJobId={costingJobId}
                onLogActivity={logActivity}
              />
            )}
            {activeTab === 'tracking' && <TrackingView jobs={jobs} onUpdateJob={handleUpdateJob} logo={settings.company_logo} />}
            {activeTab === 'transporter' && (
              <Transporter 
                jobs={jobs}
                personnel={personnel}
                vehicles={vehicles}
                currentUser={currentUser}
                onAddJob={handleAddJob}
                onEditJob={handleEditJob}
                onDeleteJob={handleDeleteJob}
                onLogActivity={logActivity}
              />
            )}
            {activeTab === 'groupage-tracker' && (
              <GroupageTracker currentUser={currentUser} onLogActivity={logActivity} />
            )}
            {activeTab === 'activity-log' && (
              <ActivityLogView 
                logs={activityLogs} 
                allUsers={systemUsers} 
                currentUser={currentUser} 
                onRestoreItem={handleRestoreItem}
                onRefreshLogs={fetchActivityLogs}
              />
            )}
            {activeTab === 'resources' && (
              <ResourceManager 
                personnel={personnel}
                onUpdatePersonnelStatus={handleUpdatePersonnelStatus}
                vehicles={vehicles}
                onUpdateVehicleStatus={handleUpdateVehicleStatus}
                isAdmin={currentUser.role === UserRole.ADMIN || (currentUser.permissions && currentUser.permissions.resources)}
                onDeletePersonnel={handleDeletePersonnel}
                onDeleteVehicle={handleDeleteVehicle}
                onAddPersonnel={handleAddPersonnel}
                onAddVehicle={handleAddVehicle}
                onEditPersonnel={handleEditPersonnel}
                onEditVehicle={handleEditVehicle}
                onLogActivity={logActivity}
              />
            )}
            {activeTab === 'capacity' && (
              <CapacityManager 
                settings={settings}
                onSetLimit={handleSetLimit}
                onSetWarehouseLimit={handleSetWarehouseLimit}
                onSetWarehouseDefaultCapacity={handleSetWarehouseDefaultCapacity}
                onToggleHoliday={handleToggleHoliday}
                isAdmin={currentUser.role === UserRole.ADMIN}
              />
            )}
            {activeTab === 'users' && (
              <UserManagement 
                users={systemUsers}
                onAddUser={handleAddSystemUser}
                onUpdateStatus={handleUpdateUserStatus}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                isAdmin={currentUser.role === UserRole.ADMIN}
                systemAlert={settings.system_alert}
                onUpdateSystemAlert={handleUpdateSystemAlert}
                jobs={jobs}
              />
            )}
            {activeTab === 'ai' && <AIPlanner jobs={jobs} />}
          </div>
        </main>
      </div>
    </div>
  );
};
export default App;
