
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { WriterDocs } from './components/WriterDocs';
import { Inventory } from './components/Inventory';
import { TrackingView } from './components/TrackingView'; // Import TrackingView
import { UserRole, Job, JobStatus, UserProfile, Personnel, Vehicle, SystemSettings, CustomsStatus } from './types';
import { Bell, Search, Menu, LogOut, X, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { USERS, MockUser } from './mockData';


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'job-board' | 'approvals' | 'writer-docs' | 'inventory' | 'tracking' | 'ai' | 'warehouse' | 'import-clearance' | 'resources' | 'capacity' | 'users'>('dashboard');
  
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

  // Notification State
  const [notifications, setNotifications] = useState<{id: string, text: string, time: string, read: boolean, type: 'success'|'error'}[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Data Fetching Functions
  const fetchJobs = useCallback(async () => {
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
  }, []);

  const fetchUsers = useCallback(async () => {
    // Sync systemUsers with the profiles in allCredentials
    const userProfiles = allCredentials.map(u => u.profile);
    setSystemUsers(userProfiles);
  }, [allCredentials]);

  const fetchPersonnel = useCallback(async () => {
    const { data, error } = await supabase.from('personnel').select('*');
    if (error) console.error('Error fetching personnel:', error.message);
    else setPersonnel(data || []);
  }, []);

  const fetchVehicles = useCallback(async () => {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) console.error('Error fetching vehicles:', error.message);
    else setVehicles(data || []);
  }, []);

  const fetchSettings = useCallback(async () => {
    // Updated query to include company_logo
    const { data, error } = await supabase.from('system_settings').select('daily_job_limits, holidays, company_logo').eq('id', 1).single();
    if (data) {
      setSettings({
        daily_job_limits: data.daily_job_limits || {},
        holidays: data.holidays || [],
        company_logo: data.company_logo || undefined
      });
    } else if (error) {
      console.error('Error fetching settings:', error.message);
      // If settings don't exist, create them
      const { error: insertError } = await supabase.from('system_settings').insert([{ id: 1, daily_job_limits: {}, holidays: [] as string[] }]);
      if (insertError) console.error('Error creating initial settings:', insertError.message);
    }
  }, []);

  useEffect(() => {
    // Fetch data only when a user is logged in
    if (currentUser) {
      fetchJobs();
      fetchUsers();
      fetchPersonnel();
      fetchVehicles();
      fetchSettings();

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

  // Process Notifications
  useEffect(() => {
    if (!currentUser) return;
    
    // Get read receipts from local storage
    const readKey = `read_notifs_${currentUser.employee_id}`;
    const readIds = JSON.parse(localStorage.getItem(readKey) || '[]');

    // Filter jobs where current user is requester and status is decided
    const relevantJobs = jobs.filter(j => 
      j.requester_id === currentUser.employee_id && 
      (j.status === JobStatus.ACTIVE || j.status === JobStatus.REJECTED)
    );

    const generatedNotifs = relevantJobs.map(j => {
      const id = `${j.id}-${j.status}`;
      return {
        id,
        text: `Job ${j.id} ${j.status === JobStatus.ACTIVE ? 'Approved' : 'Rejected'} by Admin`,
        time: new Date(j.created_at).toLocaleDateString(), 
        read: readIds.includes(id),
        type: j.status === JobStatus.ACTIVE ? 'success' : 'error' as 'success'|'error'
      };
    }).sort((a,b) => {
        if (a.read === b.read) return 0;
        return a.read ? 1 : -1;
    });

    setNotifications(generatedNotifs);
  }, [jobs, currentUser]);

  const handleToggleNotif = () => {
    if (!isNotifOpen) {
      // Mark all as read when opening
      const readKey = `read_notifs_${currentUser?.employee_id}`;
      const allIds = notifications.map(n => n.id);
      localStorage.setItem(readKey, JSON.stringify(allIds));
      // Update local state to reflect read status
      setNotifications(prev => prev.map(n => ({...n, read: true})));
    }
    setIsNotifOpen(!isNotifOpen);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Data Mutation Handlers
  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(prevJobs => prevJobs.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  const handleAddJob = async (job: Partial<Job>) => {
    if (!currentUser) return;
    
    // Ensure we use a date string. If none provided, use LOCAL today, not UTC.
    // However, job.job_date usually comes from inputs which are YYYY-MM-DD.
    let baseDate = job.job_date;
    if (!baseDate) {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        baseDate = `${year}-${month}-${day}`;
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
       const limit = settings.daily_job_limits[currentDateStr] ?? 10;
       const currentCount = jobs.filter(j => j.job_date === currentDateStr && j.status !== JobStatus.REJECTED).length;
       
       if (currentCount >= limit) {
         alert(`Daily limit of ${limit} reached for ${currentDateStr}. Cannot schedule multi-day job.`);
         return;
       }

       // Generate ID
       const dayId = daysScheduled === 0 ? baseId : `${baseId}-D${daysScheduled + 1}`;
       
       // Prepare vehicles data
       const vehiclesArray = job.vehicles || [];
       const vehicleString = vehiclesArray.length > 0 ? vehiclesArray.join(', ') : job.vehicle;

       const newJobEntry: Job = {
         ...job,
         id: dayId,
         title: dayId,
         status: currentUser.role === UserRole.ADMIN ? JobStatus.ACTIVE : JobStatus.PENDING_ADD,
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
        alert("Error: A job with this ID already exists. Please use a unique Job No.");
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
    const { error } = await supabase.from('jobs').update({ customs_status }).eq('id', jobId);
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

  const handleUpdatePersonnelStatus = async (id: string, status: Personnel['status']) => {
    const { error } = await supabase.from('personnel').update({ status }).eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else await fetchPersonnel();
  };

  const handleAddPersonnel = async (person: Omit<Personnel, 'id'>) => {
    const { error } = await supabase.from('personnel').insert([person]);
    if (error) alert(`Error: ${error.message}`);
    else await fetchPersonnel();
  };
  
  const handleUpdateVehicleStatus = async (id: string, status: Vehicle['status']) => {
     const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else await fetchVehicles();
  };

  const handleAddVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    const { error } = await supabase.from('vehicles').insert([vehicle]);
    if (error) alert(`Error: ${error.message}`);
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
      <LoginScreen onLogin={handleLogin} users={allCredentials} />
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
                onDeleteJob={handleDeleteJob}
                currentUser={currentUser}
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
            {activeTab === 'resources' && (
              <ResourceManager 
                personnel={personnel}
                onUpdatePersonnelStatus={handleUpdatePersonnelStatus}
                vehicles={vehicles}
                onUpdateVehicleStatus={handleUpdateVehicleStatus}
                isAdmin={currentUser.role === UserRole.ADMIN}
                onDeletePersonnel={handleDeletePersonnel}
                onDeleteVehicle={handleDeleteVehicle}
                onAddPersonnel={handleAddPersonnel}
                onAddVehicle={handleAddVehicle}
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
