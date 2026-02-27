
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUAEToday } from './utils';
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
import { JobBoard } from './components/JobBoard';
import { LoginScreen } from './components/LoginScreen';
import { HolidayAlertModal } from './components/HolidayAlertModal';
import { SystemAlertModal } from './components/SystemAlertModal';
import { WriterDocs } from './components/WriterDocs';
import { Inventory } from './components/Inventory';
import { TrackingView } from './components/TrackingView';
import { Transporter } from './components/Transporter';
import { UserRole, Job, JobStatus, UserProfile, Personnel, Vehicle, SystemSettings, CustomsStatus } from './types';
import { Bell, Search, Menu, LogOut, X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { supabase } from './supabaseClient';
import { USERS, MockUser } from './mockData';


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'job-board' | 'approvals' | 'writer-docs' | 'inventory' | 'tracking' | 'transporter' | 'ai' | 'warehouse' | 'import-clearance' | 'resources' | 'capacity' | 'users'>('dashboard');
  
  // Local state for app data, fetched from Supabase
  const [jobs, setJobs] = useState<Job[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
  const [allCredentials, setAllCredentials] = useState<MockUser[]>(USERS); // State to hold login credentials
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ daily_job_limits: {}, holidays: [] });
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New state for mobile
  const [showHolidayAlert, setShowHolidayAlert] = useState(false);
  const [showSystemAlert, setShowSystemAlert] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<{id: string, text: string, time: string, read: boolean, type: 'success'|'error'|'info'|'warning'}[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Data Fetching Functions
  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching jobs:', error.message);
      } else {
        // Normalize data: Ensure 'vehicles' array exists. 
        // If 'vehicles' is null but 'vehicle' exists (legacy), convert 'vehicle' string to array.
        const normalizedData = (data || []).map((j: any) => ({
          ...j,
          vehicles: j.vehicles || (j.vehicle ? j.vehicle.split(',').map((s: string) => s.trim()) : [])
        }));
        setJobs(normalizedData);
      }
    } catch (err) {
      console.error('Unexpected error fetching jobs:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
        // Sync systemUsers with the profiles in allCredentials
        const userProfiles = allCredentials.map(u => u.profile);
        setSystemUsers(userProfiles);
    } catch (err) {
        console.error('Unexpected error fetching users:', err);
    }
  }, [allCredentials]);

  const fetchPersonnel = useCallback(async () => {
    try {
        const { data, error } = await supabase.from('personnel').select('*');
        if (error) console.error('Error fetching personnel:', error.message);
        else setPersonnel(data || []);
    } catch (err) {
        console.error('Unexpected error fetching personnel:', err);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
        const { data, error } = await supabase.from('vehicles').select('*');
        if (error) console.error('Error fetching vehicles:', error.message);
        else setVehicles(data || []);
    } catch (err) {
        console.error('Unexpected error fetching vehicles:', err);
    }
  }, []);

  const fetchSettings = useCallback(async (retryCount = 0) => {
    try {
        // Use select('*') to gracefully handle missing columns in legacy schemas
        // This prevents the app from crashing if 'system_alert' or other new columns don't exist yet
        const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
        
        if (data) {
          setSettings({
            daily_job_limits: data.daily_job_limits || {},
            holidays: data.holidays || [],
            company_logo: data.company_logo || undefined,
            // Fallback for system_alert if column is missing
            system_alert: data.system_alert || { active: false, title: '', message: '', type: 'info' }
          });
          
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
             else if (retryCount < 3) {
                 setTimeout(() => fetchSettings(retryCount + 1), 1000);
             }
          } else {
             throw error; // Throw error to trigger retry logic
          }
        }
    } catch (err) {
        console.error('Unexpected error fetching settings (attempt ' + (retryCount + 1) + '):', err);
        // Retry logic for transient network errors
        if (retryCount < 3) {
            setTimeout(() => fetchSettings(retryCount + 1), 2000);
        }
    }
  }, []);

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

      // Poll for job updates (alerts)
      const interval = setInterval(fetchJobs, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchJobs, fetchUsers, fetchPersonnel, fetchVehicles, fetchSettings]);

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
    const saved = localStorage.getItem(`notifications_${currentUser.employee_id}`);
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
    const lastSnapshotStr = localStorage.getItem(snapshotKey);
    const lastSnapshot: Job[] = lastSnapshotStr ? JSON.parse(lastSnapshotStr) : [];

    // If first run (no snapshot), baseline it and return
    if (lastSnapshot.length === 0) {
        localStorage.setItem(snapshotKey, JSON.stringify(jobs));
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

        const prevVehicles = previousJob.vehicles || [];
        const currVehicles = currentJob.vehicles || [];
        if (JSON.stringify(prevVehicles.sort()) !== JSON.stringify(currVehicles.sort()) && currVehicles.length > 0) {
             newNotifs.push({
                id: `veh-${currentJob.id}-${Date.now()}`,
                text: `Vehicles updated for Job ${currentJob.id}: ${currVehicles.join(', ')}.`,
                time: timeString,
                read: false,
                type: 'info'
            });
        }

        const prevCrew = previousJob.writer_crew || [];
        const currCrew = currentJob.writer_crew || [];
        if (JSON.stringify(prevCrew.sort()) !== JSON.stringify(currCrew.sort()) && currCrew.length > 0) {
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
            localStorage.setItem(`notifications_${currentUser.employee_id}`, JSON.stringify(updated));
            return updated;
        });
    }

    // Update snapshot for next diff
    localStorage.setItem(snapshotKey, JSON.stringify(jobs));

  }, [jobs, currentUser]);

  const handleToggleNotif = () => {
    if (!isNotifOpen) {
      // Mark all as read when opening
      setNotifications(prev => {
          const updated = prev.map(n => ({...n, read: true}));
          localStorage.setItem(`notifications_${currentUser?.employee_id}`, JSON.stringify(updated));
          return updated;
      });
    }
    setIsNotifOpen(!isNotifOpen);
  };

  const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0;

  // Data Mutation Handlers
  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(prevJobs => prevJobs.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  const handleEditJob = async (job: Job) => {
    // Exclude restricted fields or ensure data consistency if needed
    const { error } = await supabase.from('jobs').update({
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
        job_date: job.job_date, 
        duration: job.duration,
        special_requests: job.special_requests,
        shuttle: job.shuttle,
        long_carry: job.long_carry,
        // Ensure allocation and warehouse fields are updated
        team_leader: job.team_leader,
        writer_crew: job.writer_crew,
        vehicles: job.vehicles,
        vehicle: job.vehicles?.join(', '), // Maintain legacy string compatibility
        activity_name: job.activity_name
    }).eq('id', job.id);

    if (error) {
        alert(`Error updating job: ${error.message}`);
    } else {
        await fetchJobs();
    }
  };

  const handleAddJob = async (job: Partial<Job>) => {
    if (!currentUser) return;
    
    // Ensure we use a date string. If none provided, use LOCAL today, not UTC.
    // However, job.job_date usually comes from inputs which are YYYY-MM-DD.
    let baseDate = job.job_date;
    if (!baseDate) {
        baseDate = getUAEToday();
    }

    const duration = job.duration || 1;
    const baseId = job.id!;
    
    // Logic to create multiple jobs based on duration
    const jobsToCreate: Job[] = [];
    
    // We treat the string 'YYYY-MM-DD' as UTC Midnight for the purpose of calculation logic
    // to allow 'getUTCDay()' to accurately reflect the day of that string regardless of local browser timezone.
    let currentDateObj = new Date(baseDate); 
    
    let daysScheduled = 0;
    
    while (daysScheduled < duration) {
       // Check if Sunday (0). Use getUTCDay() to align with the date string (YYYY-MM-DD treated as UTC).
       if (currentDateObj.getUTCDay() === 0) {
          // Skip Sunday, move to next day
          currentDateObj.setDate(currentDateObj.getDate() + 1);
          continue;
       }

       const currentDateStr = currentDateObj.toISOString().split('T')[0];
       
       // Check for holiday logic for this specific date
       if (settings.holidays.includes(currentDateStr)) {
          setShowHolidayAlert(true);
          return; // Abort entire creation
       }

       // Check capacity for this specific date
       // Only enforce limit for non-warehouse jobs
       if (!job.is_warehouse_activity) {
           const limit = settings.daily_job_limits[currentDateStr] ?? 10;
           const currentCount = jobs.filter(j => 
               j.job_date === currentDateStr && 
               j.status !== JobStatus.REJECTED &&
               !j.is_warehouse_activity
           ).length;
           
           if (currentCount >= limit) {
             alert(`Daily limit of ${limit} reached for ${currentDateStr}. Cannot schedule multi-day job.`);
             return;
           }
       }

       // Generate ID
       let dayId = daysScheduled === 0 ? baseId : `${baseId}-D${daysScheduled + 1}`;
       
       // Allow duplicate base IDs by appending suffix if ID already exists
       // This handles the request: "User can use the same unique ID" by making it technically unique but same base.
       let uniqueId = dayId;
       let counter = 1;
       // Check against local jobs state AND jobs being created in this batch
       while (jobs.some(j => j.id === uniqueId) || jobsToCreate.some(j => j.id === uniqueId)) {
           uniqueId = `${dayId}-${counter}`;
           counter++;
       }
       
       // Prepare vehicles data
       const vehiclesArray = job.vehicles || [];
       const vehicleString = vehiclesArray.length > 0 ? vehiclesArray.join(', ') : job.vehicle;

       const newJobEntry: Job = {
         ...job,
         id: uniqueId,
         title: uniqueId,
         // Allow status to be passed (e.g. for BLOCKED slots), otherwise default based on role
         status: job.status || (currentUser.role === UserRole.ADMIN ? JobStatus.ACTIVE : JobStatus.PENDING_ADD),
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
         duration: duration, 
       } as Job;

       jobsToCreate.push(newJobEntry);
       
       // Increment loop
       daysScheduled++;
       currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    // Batch Insert
    const { error } = await supabase.from('jobs').insert(jobsToCreate);
    
    if (error) {
      if (error.code === '23505') {
        alert("System Warning: Job ID collision detected. Please retry or use a unique ID.");
      } else {
        alert(`Error: ${error.message}`);
      }
    } else {
      await fetchJobs();
      if (duration > 1) {
        alert(`Successfully scheduled ${duration} days (skipping Sundays).`);
      }
    }
  };

  const handleUpdateJobAllocation = async (jobId: string, allocation: { team_leader: string, vehicles: string[], writer_crew: string[] }) => {
    const payload = {
      ...allocation,
      vehicles: allocation.vehicles, // PERSIST ARRAY
      vehicle: allocation.vehicles.join(', ') // PERSIST LEGACY STRING
    };
    
    const { error } = await supabase.from('jobs').update(payload).eq('id', jobId);
    if (error) alert(`Error: ${error.message}`);
    else await fetchJobs();
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

    const { error } = await supabase.from('jobs').update({ 
        customs_status,
        customs_history: updatedHistory
    }).eq('id', jobId);

    if (error) alert(`Error: ${error.message}`);
    else await fetchJobs();
  };

  const handleToggleLock = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const { error } = await supabase.from('jobs').update({ is_locked: !job.is_locked }).eq('id', jobId);
    if (error) alert(`Error: ${error.message}`);
    else await fetchJobs();
  };

  const handleDeleteJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || !currentUser) return;

    if (job.is_locked && currentUser.role !== UserRole.ADMIN) {
      alert("This job is locked and cannot be removed.");
      return;
    }

    if (currentUser.role === UserRole.ADMIN) {
      const { error } = await supabase.from('jobs').delete().eq('id', jobId);
      if (error) alert(`Error: ${error.message}`);
    } else {
      const { error } = await supabase.from('jobs').update({ status: JobStatus.PENDING_DELETE }).eq('id', jobId);
      if (error) alert(`Error: ${error.message}`);
    }
    await fetchJobs();
  };

  const handleApproval = async (jobId: string, approved: boolean, allocation?: { team_leader: string, vehicles: string[], writer_crew: string[] }) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    if (job.status === JobStatus.PENDING_ADD) {
      const newStatus = approved ? JobStatus.ACTIVE : JobStatus.REJECTED;
      let payload: any = { status: newStatus };
      
      if (allocation) {
        payload = {
          ...payload,
          ...allocation,
          vehicles: allocation.vehicles, // PERSIST ARRAY
          vehicle: allocation.vehicles.join(', ') // PERSIST LEGACY STRING
        };
      }

      const { error } = await supabase.from('jobs').update(payload).eq('id', jobId);
      if (error) alert(`Error: ${error.message}`);
    }
    if (job.status === JobStatus.PENDING_DELETE) {
      if (approved) {
        const { error } = await supabase.from('jobs').delete().eq('id', jobId);
        if (error) alert(`Error: ${error.message}`);
      } else {
        const { error } = await supabase.from('jobs').update({ status: JobStatus.ACTIVE }).eq('id', jobId);
        if (error) alert(`Error: ${error.message}`);
      }
    }
    await fetchJobs();
  };

  const handleSetLimit = async (date: string, limit: number) => {
    const newLimits = { ...settings.daily_job_limits, [date]: limit };
    const { error } = await supabase.from('system_settings').update({ daily_job_limits: newLimits }).eq('id', 1);
    if (error) alert(`Error: ${error.message}`);
    else await fetchSettings();
  };

  const handleToggleHoliday = async (date: string) => {
    const isHoliday = settings.holidays.includes(date);
    const newHolidays = isHoliday ? settings.holidays.filter(h => h !== date) : [...settings.holidays, date];
    const newLimits = { ...settings.daily_job_limits };
    newLimits[date] = isHoliday ? 10 : 0; // Set to 0 if holiday, otherwise default
    
    const { error } = await supabase.from('system_settings').update({ holidays: newHolidays, daily_job_limits: newLimits }).eq('id', 1);
    if (error) alert(`Error: ${error.message}`);
    else await fetchSettings();
  };

  const handleUpdateLogo = async (base64: string) => {
    const { error } = await supabase.from('system_settings').update({ company_logo: base64 }).eq('id', 1);
    if (error) alert(`Error updating logo: ${error.message}`);
    else await fetchSettings();
  };

  const handleUpdateSystemAlert = async (alertData: SystemSettings['system_alert']) => {
    const { error } = await supabase.from('system_settings').update({ system_alert: alertData }).eq('id', 1);
    if (error) {
      alert(`Error updating system alert: ${error.message}`);
    } else {
      await fetchSettings();
      alert("System Alert Updated Successfully.");
    }
  };

  const handleUpdatePersonnelStatus = async (id: string, status: Personnel['status']) => {
    const { error } = await supabase.from('personnel').update({ status }).eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else await fetchPersonnel();
  };

  const handleAddPersonnel = async (person: Omit<Personnel, 'id'>) => {
    const { error } = await supabase.from('personnel').insert([person]);
    if (error) {
      if (error.message.includes("Could not find the 'type' column") || error.message.includes("column \"type\" of relation \"personnel\" does not exist")) {
        alert("Database Error: The 'personnel' table is missing the 'type' column. Please run the migration script in Supabase.");
      } else {
        alert(`Error: ${error.message}`);
      }
    } else {
      await fetchPersonnel();
    }
  };

  const handleEditPersonnel = async (person: Personnel) => {
    const { error } = await supabase.from('personnel').update({
        name: person.name,
        type: person.type,
        employee_id: person.employee_id,
        emirates_id: person.emirates_id,
        license_number: person.license_number,
        status: person.status
    }).eq('id', person.id);

    if (error) alert(`Error updating personnel: ${error.message}`);
    else await fetchPersonnel();
  };
  
  const handleUpdateVehicleStatus = async (id: string, status: Vehicle['status']) => {
     const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else await fetchVehicles();
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
      await fetchVehicles();
    }
  };

  const handleEditVehicle = async (vehicle: Vehicle) => {
     const { error } = await supabase.from('vehicles').update({
        name: vehicle.name,
        plate: vehicle.plate,
        status: vehicle.status
     }).eq('id', vehicle.id);
     
     if (error) alert(`Error updating vehicle: ${error.message}`);
     else await fetchVehicles();
  };

  const handleDeletePersonnel = async (id: string) => {
    const { error } = await supabase.from('personnel').delete().eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else await fetchPersonnel();
  };

  const handleDeleteVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else await fetchVehicles();
  };

  const handleUpdateUserStatus = async (id: string, status: 'Active' | 'Disabled') => {
    // Update local state for credentials
    setAllCredentials(prev => prev.map(u => u.profile.id === id ? { ...u, profile: { ...u.profile, status } } : u));
  };

  const handleUpdateUser = async (updatedUser: UserProfile) => {
    setAllCredentials(prev => prev.map(u => {
        if (u.profile.id === updatedUser.id) {
            return { ...u, profile: updatedUser };
        }
        return u;
    }));
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
            permissions: newUser.permissions, // Added permissions
            avatar: newUser.avatar,
            status: newUser.status
        }
     };
     
     // Add to local state (this enables login for the session)
     setAllCredentials(prev => [...prev, newMockUser]);
     alert(`Account created for ${newUser.name}. Login: ${newUser.username} / ${newUser.password}`);
  };
  
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    // Reset active tab to a safe default if current default isn't allowed
    if (user.role !== UserRole.ADMIN && !user.permissions.dashboard) {
        // Find first allowed tab
        const allowed = Object.entries(user.permissions).find(([_, val]) => val);
        if (allowed) {
            // Map permission keys back to tab IDs if they differ
            const map: Record<string, string> = {
                dashboard: 'dashboard',
                schedule: 'schedule',
                jobBoard: 'job-board',
                warehouse: 'warehouse',
                importClearance: 'import-clearance',
                approvals: 'approvals',
                writerDocs: 'writer-docs',
                inventory: 'inventory',
                tracking: 'tracking',
                transporter: 'transporter',
                resources: 'resources',
                capacity: 'capacity',
                users: 'users',
                ai: 'ai'
            };
            setActiveTab(map[allowed[0]] as any);
        }
    } else {
        setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
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
        <header className="h-16 md:h-20 border-b bg-white flex items-center justify-between px-4 md:px-10 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 hover:bg-slate-50 rounded-xl transition-colors lg:hidden"
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

            <div className="flex items-center gap-4 md:gap-8">
              <h1 className="font-bold text-lg md:text-xl text-slate-800 tracking-tight uppercase border-r pr-4 md:pr-8 border-slate-200 hidden sm:block">Operations Central</h1>
              <div className="flex items-center gap-2 md:gap-3 bg-slate-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-100">
                <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-8">
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-64 group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Global job search..." className="bg-transparent border-none outline-none text-xs ml-3 w-full font-medium" />
            </div>

            <button className="md:hidden p-2 text-slate-500">
              <Search className="w-5 h-5" />
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

            <div className="flex items-center gap-3 md:gap-5 pl-4 md:pl-8 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none mb-1.5">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-none">{currentUser.role}</p>
              </div>
              <img src={currentUser.avatar} className="w-9 h-9 md:w-11 md:h-11 rounded-2xl border-2 border-slate-100 shadow-md" alt="User" />
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2 md:p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 group"
              >
                <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-500 transition-colors" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto custom-scrollbar w-full">
          <div className="max-w-[1600px] mx-auto pb-12">
            {activeTab === 'dashboard' && <Dashboard jobs={jobs} settings={settings} onSetLimit={handleSetLimit} isAdmin={currentUser.role === UserRole.ADMIN} />}
            {activeTab === 'schedule' && (
              <ScheduleView 
                jobs={jobs} 
                onAddJob={handleAddJob} 
                onEditJob={handleEditJob}
                onDeleteJob={handleDeleteJob}
                onUpdateAllocation={handleUpdateJobAllocation}
                onToggleLock={handleToggleLock}
                currentUser={currentUser}
                personnel={personnel}
                vehicles={vehicles}
                users={systemUsers}
              />
            )}
            {activeTab === 'job-board' && (
              <JobBoard 
                jobs={jobs}
                onAddJob={handleAddJob}
                onDeleteJob={handleDeleteJob}
                currentUser={currentUser}
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
              />
            )}
            {activeTab === 'import-clearance' && (
              <ImportClearance 
                jobs={jobs} 
                onAddJob={handleAddJob} 
                onDeleteJob={handleDeleteJob}
                currentUser={currentUser}
                onUpdateCustomsStatus={handleUpdateCustomsStatus}
              />
            )}
            {activeTab === 'approvals' && (
              <ApprovalQueue 
                jobs={jobs} 
                onApproval={handleApproval}
                isAdmin={currentUser.role === UserRole.ADMIN || currentUser.permissions.approvals} // Updated for Semi-Admin
                personnel={personnel}
                vehicles={vehicles}
                users={systemUsers}
                settings={settings} // Added settings prop
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
                logo={settings.company_logo} 
                isReadOnly={currentUser.role !== UserRole.ADMIN} // Only full Admins can edit inventory
                onlyFinalAssessment={restrictedCostingUsers.includes(currentUser.employee_id)} // Restrict costing view for specific users
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
              />
            )}
            {activeTab === 'resources' && (
              <ResourceManager 
                personnel={personnel}
                onUpdatePersonnelStatus={handleUpdatePersonnelStatus}
                vehicles={vehicles}
                onUpdateVehicleStatus={handleUpdateVehicleStatus}
                isAdmin={currentUser.role === UserRole.ADMIN || currentUser.permissions.resources}
                onDeletePersonnel={handleDeletePersonnel}
                onDeleteVehicle={handleDeleteVehicle}
                onAddPersonnel={handleAddPersonnel}
                onAddVehicle={handleAddVehicle}
                onEditPersonnel={handleEditPersonnel}
                onEditVehicle={handleEditVehicle}
              />
            )}
            {activeTab === 'capacity' && (
              <CapacityManager 
                settings={settings}
                onSetLimit={handleSetLimit}
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
                isAdmin={currentUser.role === UserRole.ADMIN}
                systemAlert={settings.system_alert}
                onUpdateSystemAlert={handleUpdateSystemAlert}
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
