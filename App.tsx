
import React, { useState, useEffect, useCallback } from 'react';
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
import { UserRole, Job, JobStatus, UserProfile, Personnel, Vehicle, SystemSettings, CustomsStatus } from './types';
import { Bell, Search, Menu, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import { USERS } from './mockData';


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'job-board' | 'approvals' | 'ai' | 'warehouse' | 'import-clearance' | 'resources' | 'capacity' | 'users'>('dashboard');
  
  // Local state for app data, fetched from Supabase
  const [jobs, setJobs] = useState<Job[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({ daily_job_limits: {}, holidays: [] });
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showHolidayAlert, setShowHolidayAlert] = useState(false);

  // Data Fetching Functions
  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching jobs:', error.message);
    else setJobs(data || []);
  }, []);

  const fetchUsers = useCallback(async () => {
    // Use hardcoded user profiles instead of fetching from Supabase table
    const userProfiles = USERS.map(u => u.profile);
    setSystemUsers(userProfiles);
  }, []);

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
    const { data, error } = await supabase.from('system_settings').select('daily_job_limits, holidays').eq('id', 1).single();
    if (data) {
      setSettings({
        daily_job_limits: data.daily_job_limits || {},
        holidays: data.holidays || [],
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
    }
  }, [currentUser, fetchJobs, fetchUsers, fetchPersonnel, fetchVehicles, fetchSettings]);

  // Data Mutation Handlers
  const handleAddJob = async (job: Partial<Job>) => {
    if (!currentUser) return;
    const date = job.job_date || new Date().toISOString().split('T')[0];
    
    if (settings.holidays.includes(date)) {
      setShowHolidayAlert(true);
      return;
    }

    const limit = settings.daily_job_limits[date] ?? 10;
    const { count } = await supabase.from('jobs').select('*', { count: 'exact' }).eq('job_date', date).neq('status', JobStatus.REJECTED);

    if ((count ?? 0) >= limit) {
      alert(`Daily limit of ${limit} reached for ${date}. Contact Admin to increase capacity.`);
      return;
    }

    const newJob: Job = {
      ...job,
      id: job.id!,
      title: job.id!,
      status: currentUser.role === UserRole.ADMIN ? JobStatus.ACTIVE : JobStatus.PENDING_ADD,
      created_at: Date.now(),
      requester_id: currentUser.employee_id,
      assigned_to: job.assigned_to || 'Unassigned',
      priority: job.priority || 'LOW',
      description: job.description || 'N/A',
      shipment_details: job.shipment_details || 'N/A',
      job_date: date,
      is_locked: false,
    } as Job;
    
    const { error } = await supabase.from('jobs').insert([newJob]);
    if (error) alert(`Error: ${error.message}`);
    else await fetchJobs();
  };

  const handleUpdateJobAllocation = async (jobId: string, allocation: { team_leader: string, vehicle: string, writer_crew: string[] }) => {
    const { error } = await supabase.from('jobs').update(allocation).eq('id', jobId);
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

  const handleApproval = async (jobId: string, approved: boolean, allocation?: { team_leader: string, vehicle: string, writer_crew: string[] }) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    if (job.status === JobStatus.PENDING_ADD) {
      const newStatus = approved ? JobStatus.ACTIVE : JobStatus.REJECTED;
      const { error } = await supabase.from('jobs').update({ status: newStatus, ...allocation }).eq('id', jobId);
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

  const handleUpdatePersonnelStatus = async (id: string, status: Personnel['status']) => {
    const { error } = await supabase.from('personnel').update({ status }).eq('id', id);
    if (error) alert(`Error: ${error.message}`);
    else await fetchPersonnel();
  };
  
  const handleUpdateVehicleStatus = async (id: string, status: Vehicle['status']) => {
     const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
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
    console.log(`(DEMO) User status update for ID ${id} to ${status}. This is not persisted.`);
    setSystemUsers(prevUsers => prevUsers.map(u => u.id === id ? { ...u, status } : u));
  };

  const handleAddSystemUser = async (newUser: Omit<UserProfile, 'id'>) => {
     console.log(`(DEMO) Add user called for ${newUser.name}. This is not persisted.`);
  };
  
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <LoginScreen onLogin={handleLogin} />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      <HolidayAlertModal isOpen={showHolidayAlert} onClose={() => setShowHolidayAlert(false)} />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={currentUser.role === UserRole.ADMIN} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b bg-white flex items-center justify-between px-10 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-8">
              <h1 className="font-bold text-xl text-slate-800 tracking-tight uppercase border-r pr-8 border-slate-200 hidden sm:block">Operations Central</h1>
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">
                  {currentUser.role} CHANNEL SECURE
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-64 group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
              <input type="text" placeholder="Global job search..." className="bg-transparent border-none outline-none text-xs ml-3 w-full font-medium" />
            </div>

            <div className="relative group cursor-pointer p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
            </div>

            <div className="flex items-center gap-5 pl-8 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none mb-1.5">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-none">{currentUser.role}</p>
              </div>
              <img src={currentUser.avatar} className="w-11 h-11 rounded-2xl border-2 border-slate-100 shadow-md transition-transform hover:scale-105" alt="User" />
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 group"
              >
                <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-500 transition-colors" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
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
                isAdmin={currentUser.role === UserRole.ADMIN}
                personnel={personnel}
                vehicles={vehicles}
                users={systemUsers}
              />
            )}
            {activeTab === 'resources' && (
              <ResourceManager 
                personnel={personnel}
                onUpdatePersonnelStatus={handleUpdatePersonnelStatus}
                vehicles={vehicles}
                onUpdateVehicleStatus={handleUpdateVehicleStatus}
                isAdmin={currentUser.role === UserRole.ADMIN}
                onDeletePersonnel={handleDeletePersonnel}
                onDeleteVehicle={handleDeleteVehicle}
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