
import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, UserPermissions, SystemSettings, BranchCode, BRANCHES } from '../types';
import { 
  UserPlus, ShieldAlert, ToggleLeft, ToggleRight, User, Fingerprint, Mail, 
  CheckCircle, X, Lock, Key, Shield, Edit2, Save, Radio, MessageSquare, 
  AlertTriangle, Power, Trash2, Database, RefreshCw, History, Check, ExternalLink, AlertCircle, Globe,
  ShieldCheck, CheckCircle2, XCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { safeLocalStorage } from '../utils';

interface UserManagementProps {
  users: UserProfile[];
  onAddUser: (user: any) => void;
  onUpdateStatus: (id: string, status: 'Active' | 'Disabled') => void;
  onUpdateUser: (user: UserProfile) => void; 
  onDeleteUser: (id: string) => void;
  isAdmin: boolean;
  systemAlert?: SystemSettings['system_alert'];
  onUpdateSystemAlert: (alert: SystemSettings['system_alert']) => void;
  jobs?: any[];
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: true,
  schedule: true,
  jobBoard: false,
  warehouse: false,
  importClearance: false,
  approvals: false,
  writerDocs: true,
  inventory: false,
  tracking: false,
  surveyTracker: true,
  digitalPackingList: false,
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

const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  dashboard: 'Dashboard View',
  schedule: 'Job Schedule',
  jobBoard: 'Job Board (Admin)',
  warehouse: 'Warehouse Activity',
  importClearance: 'Import Clearance',
  quotations: 'Quotations Management',
  approvals: 'Approval Queue',
  writerDocs: 'Writer Docs',
  inventory: 'Inventory Control',
  tracking: 'Shipment Tracking',
  surveyTracker: 'Survey Tracker',
  digitalPackingList: 'Digital Packing List',
  warehouseChecklist: 'Warehouse Checklist',
  resources: 'Fleet & Crew',
  capacity: 'Capacity Limits',
  users: 'User Management',
  transporter: 'Transporter',
  ai: 'AI Planner',
  groupageTracker: 'Groupage Tracker',
  activityLog: 'Activity Audit Log',
};

export const UserManagement: React.FC<UserManagementProps> = ({ 
  users, onAddUser, onUpdateStatus, onUpdateUser, onDeleteUser, isAdmin, systemAlert, onUpdateSystemAlert, jobs = [] 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    employee_id: '',
    username: '',
    password: '',
    role: UserRole.USER,
    status: 'Active' as const,
    avatar: `https://picsum.photos/seed/${Math.random()}/100`,
    branch: 'UAE' as BranchCode,
    allowed_branches: ['UAE', 'KSA', 'QATAR'] as BranchCode[],
    permissions: { ...DEFAULT_PERMISSIONS }
  });

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [branchModalUser, setBranchModalUser] = useState<UserProfile | null>(null);
  const [modalBranches, setModalBranches] = useState<BranchCode[]>([]);

  const toggleAllowedBranch = (branchCode: BranchCode, isEditing = false) => {
    if (isEditing && editingUser) {
      const current: BranchCode[] = editingUser.allowed_branches && editingUser.allowed_branches.length > 0 
        ? editingUser.allowed_branches 
        : (['UAE', 'KSA', 'QATAR'] as BranchCode[]);
      const next: BranchCode[] = current.includes(branchCode)
        ? (current.length > 1 ? current.filter(b => b !== branchCode) : current)
        : [...current, branchCode];
      setEditingUser({ ...editingUser, allowed_branches: next });
    } else {
      const current: BranchCode[] = newUser.allowed_branches && newUser.allowed_branches.length > 0 
        ? newUser.allowed_branches 
        : (['UAE', 'KSA', 'QATAR'] as BranchCode[]);
      const next: BranchCode[] = current.includes(branchCode)
        ? (current.length > 1 ? current.filter(b => b !== branchCode) : current)
        : [...current, branchCode];
      setNewUser({ ...newUser, allowed_branches: next });
    }
  };

  const openBranchModal = (user: UserProfile) => {
    setBranchModalUser(user);
    const current: BranchCode[] = user.allowed_branches && user.allowed_branches.length > 0
      ? user.allowed_branches
      : (user.role === UserRole.ADMIN ? (['UAE', 'KSA', 'QATAR'] as BranchCode[]) : [(user.branch || 'UAE') as BranchCode]);
    setModalBranches(current);
  };

  const handleToggleModalBranch = (branchCode: BranchCode) => {
    setModalBranches(prev => {
      if (prev.includes(branchCode)) {
        if (prev.length <= 1) {
          alert(`At least one branch must remain AUTHORIZED so staff member "${branchModalUser?.name}" can access the system.`);
          return prev;
        }
        return prev.filter(b => b !== branchCode);
      } else {
        return [...prev, branchCode];
      }
    });
  };

  const handleSaveModalBranches = () => {
    if (!branchModalUser) return;
    if (modalBranches.length === 0) {
      alert("At least one branch must be AUTHORIZED.");
      return;
    }
    const newPrimaryBranch: BranchCode = (branchModalUser.branch && modalBranches.includes(branchModalUser.branch)) 
      ? branchModalUser.branch 
      : modalBranches[0];
    
    const updatedUser: UserProfile = {
      ...branchModalUser,
      branch: newPrimaryBranch,
      allowed_branches: modalBranches
    };
    onUpdateUser(updatedUser);
    setBranchModalUser(null);
  };

  const handleQuickToggleBranch = (user: UserProfile, branchCode: BranchCode) => {
    const currentAllowed: BranchCode[] = user.allowed_branches && user.allowed_branches.length > 0
      ? user.allowed_branches
      : (user.role === UserRole.ADMIN ? (['UAE', 'KSA', 'QATAR'] as BranchCode[]) : [(user.branch || 'UAE') as BranchCode]);
    
    const isCurrentlyAllowed = currentAllowed.includes(branchCode);
    let nextAllowed: BranchCode[];

    if (isCurrentlyAllowed) {
      if (currentAllowed.length <= 1) {
        alert(`Cannot mark ${branchCode} as UNAUTHORIZED: Staff member "${user.name}" must retain at least one authorized branch.`);
        return;
      }
      nextAllowed = currentAllowed.filter(b => b !== branchCode);
    } else {
      nextAllowed = [...currentAllowed, branchCode];
    }

    const newPrimaryBranch: BranchCode = (user.branch && nextAllowed.includes(user.branch)) 
      ? user.branch 
      : nextAllowed[0];
    const updatedUser: UserProfile = {
      ...user,
      branch: newPrimaryBranch,
      allowed_branches: nextAllowed
    };
    onUpdateUser(updatedUser);
  };

  // System Alert State
  const [alertForm, setAlertForm] = useState({
    active: false,
    title: 'System Maintenance',
    message: 'The system is currently undergoing scheduled maintenance.',
    type: 'maintenance' as 'info' | 'warning' | 'error' | 'maintenance'
  });

  // Data Recovery Console States
  const [scannedJobs, setScannedJobs] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  const scanForDeletedJobs = () => {
    setIsScanning(true);
    const found: any[] = [];
    const activeIds = new Set((jobs || []).map(j => j.id));

    // 1. Scan offline cache backup
    try {
      const saved = safeLocalStorage.getItem('writer_local_jobs_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach(job => {
            if (job && job.id && !activeIds.has(job.id)) {
              if (!found.some(f => f.id === job.id)) {
                found.push({ ...job, source: 'Offline Storage Backup' });
              }
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 1b. Scan archived deleted jobs
    try {
      const archived = safeLocalStorage.getItem('writer_deleted_jobs_archive');
      if (archived) {
        const parsed = JSON.parse(archived);
        if (Array.isArray(parsed)) {
          parsed.forEach(job => {
            if (job && job.id && !activeIds.has(job.id)) {
              if (!found.some(f => f.id === job.id)) {
                found.push({ 
                  ...job,
                  shipper_name: job.shipper_name || 'Restored Job',
                  job_date: job.job_date || 'N/A',
                  source: 'Deleted Jobs Backup Archive' 
                });
              }
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Scan snapshot keys
    try {
      const keys = safeLocalStorage.getAllKeys();
      keys.forEach(key => {
        if (key && key.startsWith('jobs_snapshot_')) {
          const saved = safeLocalStorage.getItem(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              parsed.forEach(job => {
                if (job && job.id && !activeIds.has(job.id)) {
                  if (!found.some(f => f.id === job.id)) {
                    found.push({ 
                      id: job.id, 
                      shipper_name: job.shipper_name || 'Multi-day Sub-job', 
                      job_date: job.job_date || 'N/A',
                      job_time: job.job_time || '08:00',
                      location: job.location || 'N/A',
                      volume_cbm: job.volume_cbm || 0,
                      team_leader: job.team_leader || 'Unassigned',
                      vehicles: job.vehicles || [],
                      vehicle: job.vehicle || '',
                      status: job.status || 'ACTIVE',
                      description: job.description || 'Restored from local backup.',
                      created_at: job.created_at || Date.now(),
                      source: `Browser Snapshot (${key.replace('jobs_snapshot_', '')})` 
                    });
                  }
                }
              });
            }
          }
        }
      });
    } catch (e) {
      console.error(e);
    }

    setScannedJobs(found);
    setIsScanning(false);
  };

  const handleRestoreJob = async (job: any) => {
    setRestoreStatus(prev => ({ ...prev, [job.id]: 'loading' }));
    try {
      const payload = {
        id: job.id,
        title: job.title || job.id || job.shipper_name || 'Restored Job',
        shipper_name: job.shipper_name || 'Restored Job',
        job_date: job.job_date || new Date().toISOString().split('T')[0],
        job_time: job.job_time || '08:00',
        location: job.location || 'N/A',
        volume_cbm: job.volume_cbm || 0,
        team_leader: job.team_leader || 'Unassigned',
        vehicles: job.vehicles || [],
        vehicle: job.vehicle || '',
        status: job.status || 'ACTIVE',
        description: job.description || 'Restored from backup console.',
        created_at: job.created_at || Date.now(),
        last_edited_by: 'Recovery Console',
        last_edited_at: Date.now(),
        priority: job.priority || 'LOW',
        sunday_handling: job.sunday_handling || 'Skip',
        is_warehouse_activity: job.is_warehouse_activity || false,
        is_import_clearance: job.is_import_clearance || false,
        is_transporter: job.is_transporter || false,
        is_locked: job.is_locked || false,
        requester_id: job.requester_id || 'System'
      };

      let { error } = await supabase.from('jobs').insert(payload);
      if (error && (error.message.includes("is_confirmed") || error.message.includes("column"))) {
        const { is_confirmed, ...strippedPayload } = payload as any;
        let { error: retryError } = await supabase.from('jobs').insert(strippedPayload);
        error = retryError;
      }
      if (error && error.message.includes("last_edited_at")) {
        const { last_edited_by, last_edited_at, is_confirmed, ...fallbackPayload } = payload as any;
        const { error: retryError } = await supabase.from('jobs').insert(fallbackPayload);
        error = retryError;
      }
      if (error) throw error;

      setRestoreStatus(prev => ({ ...prev, [job.id]: 'success' }));
      setScannedJobs(prev => prev.filter(j => j.id !== job.id));
      alert(`Job "${job.id}" has been recovered and restored to Supabase successfully! Please refresh or toggle tabs to view.`);
    } catch (err: any) {
      console.error(err);
      setRestoreStatus(prev => ({ ...prev, [job.id]: 'error' }));
      alert(`Error restoring job to Supabase: ${err.message}`);
    }
  };

  useEffect(() => {
    if (systemAlert) {
      setAlertForm({
        active: systemAlert.active,
        title: systemAlert.title || 'System Alert',
        message: systemAlert.message || '',
        type: systemAlert.type || 'info'
      });
    }
  }, [systemAlert]);

  const handleAlertSave = () => {
    onUpdateSystemAlert(alertForm);
  };

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center bg-white rounded-3xl text-slate-900 text-center border border-slate-200">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-6" />
        <h3 className="text-xl font-bold uppercase tracking-widest">Access Denied</h3>
        <p className="text-slate-500 mt-4 max-w-sm font-medium italic">Administrative privileges required for user account management.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.employee_id || !newUser.username || !newUser.password) {
      alert("Name, Employee ID, Username, and Password are mandatory.");
      return;
    }
    
    // If role is Admin, force all permissions
    const finalPermissions = newUser.role === UserRole.ADMIN 
      ? Object.keys(DEFAULT_PERMISSIONS).reduce((acc, key) => ({...acc, [key]: true}), {} as UserPermissions)
      : newUser.permissions;

    onAddUser({ ...newUser, permissions: finalPermissions });
    setShowAddModal(false);
    setNewUser({
      name: '',
      employee_id: '',
      username: '',
      password: '',
      role: UserRole.USER,
      status: 'Active',
      avatar: `https://picsum.photos/seed/${Math.random()}/100`,
      branch: 'UAE' as BranchCode,
      allowed_branches: ['UAE', 'KSA', 'QATAR'] as BranchCode[],
      permissions: { ...DEFAULT_PERMISSIONS }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
        // If role changed to Admin, enforce full permissions
        const finalPermissions = editingUser.role === UserRole.ADMIN 
            ? Object.keys(DEFAULT_PERMISSIONS).reduce((acc, key) => ({...acc, [key]: true}), {} as UserPermissions)
            : editingUser.permissions;
        
        onUpdateUser({ ...editingUser, permissions: finalPermissions });
        setShowEditModal(false);
        setEditingUser(null);
    }
  };

  const togglePermission = (key: keyof UserPermissions, isEditMode: boolean = false) => {
    if (isEditMode && editingUser) {
        setEditingUser(prev => prev ? ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key]
            }
        }) : null);
    } else {
        setNewUser(prev => ({
        ...prev,
        permissions: {
            ...prev.permissions,
            [key]: !prev.permissions[key]
        }
        }));
    }
  };

  const openEditModal = (user: UserProfile) => {
      setEditingUser(user);
      setShowEditModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">User Access Management</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Control system access for admins and operations staff</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-100"
        >
          <UserPlus className="w-5 h-5" />
          Create Account
        </button>
      </div>

      {/* SYSTEM ALERT CONFIGURATION PANEL */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
           <div className="p-2 bg-amber-50 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
           </div>
           <div>
              <h3 className="font-bold text-slate-800 uppercase tracking-widest">System Status Broadcast</h3>
              <p className="text-xs text-slate-400 font-medium">Alert all users about maintenance or outages</p>
           </div>
           <div className="ml-auto flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${alertForm.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                {alertForm.active ? 'Broadcasting' : 'Inactive'}
              </span>
              <button 
                onClick={() => setAlertForm({...alertForm, active: !alertForm.active})}
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${alertForm.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${alertForm.active ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alert Title</label>
                 <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                    value={alertForm.title}
                    onChange={(e) => setAlertForm({...alertForm, title: e.target.value})}
                    placeholder="e.g. System Maintenance"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alert Type</label>
                 <div className="grid grid-cols-2 gap-3">
                    {['maintenance', 'error', 'warning', 'info'].map((type) => (
                       <button
                          key={type}
                          onClick={() => setAlertForm({...alertForm, type: type as any})}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                             alertForm.type === type 
                             ? 'bg-slate-800 text-white border-slate-800' 
                             : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                       >
                          {type}
                       </button>
                    ))}
                 </div>
              </div>
           </div>
           
           <div className="space-y-4 flex flex-col">
              <div className="space-y-1.5 flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Message Content</label>
                 <textarea 
                    className="w-full h-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                    value={alertForm.message}
                    onChange={(e) => setAlertForm({...alertForm, message: e.target.value})}
                    placeholder="Enter the explanation for users..."
                 />
              </div>
              <button 
                onClick={handleAlertSave}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Alert Settings
              </button>
           </div>
        </div>
      </div>

      {/* SUPABASE SUBSCRIPTION & DATA RECOVERY CENTER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="supabase_recovery_center">
        {/* LOCAL RESTORATION SCANNER */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-widest">Local Backup & Recovery Scan</h3>
                <p className="text-xs text-slate-400 font-medium">Scan local browser cache snapshots for deleted jobs</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              This utility scans your browser's offline storage and snapshots for job data. If multi-day jobs were recently shortened or accidentally deleted, they may still exist in your browser's history and can be restored back to the live Supabase database with a single click.
            </p>

            {scannedJobs.length > 0 ? (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 mb-6">
                {scannedJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-xl text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{job.id}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">{job.source}</span>
                      </div>
                      <div className="font-medium text-slate-500">Shipper: <strong className="text-slate-700 font-bold">{job.shipper_name}</strong></div>
                      <div className="text-[10px] text-slate-400 font-mono">Date: {job.job_date}</div>
                    </div>
                    <button
                      onClick={() => handleRestoreJob(job)}
                      disabled={restoreStatus[job.id] === 'loading' || restoreStatus[job.id] === 'success'}
                      className={`px-4 py-2 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1.5 ${
                        restoreStatus[job.id] === 'success'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : restoreStatus[job.id] === 'loading'
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed animate-pulse'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                      }`}
                    >
                      {restoreStatus[job.id] === 'loading' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {restoreStatus[job.id] === 'success' && <Check className="w-3 h-3" />}
                      {restoreStatus[job.id] === 'success' ? 'Restored' : restoreStatus[job.id] === 'loading' ? 'Restoring' : 'Restore to DB'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center mb-6">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Click "Scan Browser Caches" to search for lost records</p>
              </div>
            )}
          </div>

          <button
            onClick={scanForDeletedJobs}
            disabled={isScanning}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Browser Caches...' : 'Scan Browser Caches'}
          </button>
        </div>

        {/* SUPABASE PRO SUBSCRIPTION PITR GUIDE */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 border border-slate-700 shadow-lg text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Database className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 uppercase tracking-widest text-sm">Supabase Subscription Protection</h3>
                  <p className="text-xs text-slate-400 font-medium">Your Pro/Enterprise Tier Data Protection is ACTIVE</p>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-500/30">
                PRO ACTIVE
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Congratulations on upgrading to a <strong>paid Supabase subscription</strong>! Since your project is on a paid tier, your database is protected by continuous, industrial-grade backups and enterprise rollbacks:
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex gap-3 text-xs leading-relaxed">
                <div className="mt-0.5 p-1 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-200 block font-bold">Point-in-Time Recovery (PITR)</strong>
                  You can restore your entire database to the exact millisecond before deletions happened. Go to your <strong>Supabase Dashboard → Database → Backups</strong> and select the exact timestamp to restore.
                </div>
              </div>

              <div className="flex gap-3 text-xs leading-relaxed">
                <div className="mt-0.5 p-1 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-200 block font-bold">Daily Automatic Backups</strong>
                  Supabase keeps standard daily snapshots of your schemas and data, allowing clean restorations via a single click in your backups portal.
                </div>
              </div>

              <div className="flex gap-3 text-xs leading-relaxed">
                <div className="mt-0.5 p-1 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-200 block font-bold font-mono">Need Immediate Hands-on Support?</strong>
                  As a paid subscriber, you have priority support tickets. You can submit a support ticket in the Supabase Dashboard, and their engineers can restore deleted data logs for you directly.
                </div>
              </div>
            </div>
          </div>

          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            referrerPolicy="no-referrer"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2"
          >
            <span>Access Supabase Dashboard</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <th className="p-6">Employee ID</th>
              <th className="p-6">User Details</th>
              <th className="p-6">Role</th>
              <th className="p-6">Branch Access (Strict Authorization)</th>
              <th className="p-6">Credentials</th>
              <th className="p-6">Access Modules</th>
              <th className="p-6">Status</th>
              <th className="p-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${user.status === 'Disabled' ? 'opacity-60' : ''}`}>
                <td className="p-6">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <Fingerprint className="w-4 h-4 text-slate-300" />
                    {user.employee_id}
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <img src={user.avatar} className="w-10 h-10 rounded-xl border border-slate-100" alt="" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Writer Relocations Staff</p>
                    </div>
                  </div>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                    user.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex flex-col gap-1.5 min-w-[210px]">
                    <div className="space-y-1">
                      {(['UAE', 'KSA', 'QATAR'] as BranchCode[]).map(b => {
                        const userAllowed = user.allowed_branches && user.allowed_branches.length > 0
                          ? user.allowed_branches
                          : (user.role === UserRole.ADMIN ? ['UAE', 'KSA', 'QATAR'] : [(user.branch || 'UAE') as BranchCode]);
                        const isAuth = userAllowed.includes(b);

                        return (
                          <button
                            key={b}
                            type="button"
                            onClick={() => handleQuickToggleBranch(user, b)}
                            className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all text-left group/btn cursor-pointer ${
                              isAuth 
                                ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' 
                                : 'bg-rose-50/50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                            }`}
                            title={`Click to mark ${b} as ${isAuth ? 'UNAUTHORIZED' : 'AUTHORIZED'}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span>{BRANCHES[b]?.flag}</span>
                              <span className="font-extrabold">{b}</span>
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              isAuth ? 'bg-emerald-200/70 text-emerald-900' : 'bg-rose-200/70 text-rose-900'
                            }`}>
                              {isAuth ? 'Authorized' : 'Unauthorized'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => openBranchModal(user)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200/50 transition-colors w-fit mt-0.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Manage Hubs</span>
                    </button>
                  </div>
                </td>
                <td className="p-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <User className="w-3 h-3 text-slate-400" />
                      {user.username}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 text-nowrap">
                      <Lock className="w-3 h-3" />
                      {user.password || '••••••••'}
                    </div>
                  </div>
                </td>
                <td className="p-6">
                   <div className="flex flex-wrap gap-1 max-w-xs">
                      {user.role === UserRole.ADMIN ? (
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">All Access</span>
                      ) : (
                        Object.entries(user.permissions).filter(([key, hasAccess]) => hasAccess && PERMISSION_LABELS[key as keyof UserPermissions]).map(([key]) => (
                           <span key={key} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {PERMISSION_LABELS[key as keyof UserPermissions]?.split(' ')[0] || key}
                           </span>
                        ))
                      )}
                   </div>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                    user.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex justify-center gap-2">
                    <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                        title="Edit Permissions"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onUpdateStatus(user.id, user.status === 'Active' ? 'Disabled' : 'Active')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                        user.status === 'Active' 
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {user.status === 'Active' ? (
                        <>
                          <ToggleRight className="w-4 h-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4" />
                          Activate
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setUserIdToDelete(user.id)}
                      className="p-2 bg-slate-50 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-xl transition-all"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-white flex justify-between items-center shrink-0">
                 <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Create System Account</h3>
                 <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar">
                 <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Staff Full Name *</label>
                        <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input required className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="e.g. Robert Smith" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Mandatory Employee ID *</label>
                        <div className="relative">
                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input required className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newUser.employee_id} onChange={e => setNewUser({...newUser, employee_id: e.target.value})} placeholder="e.g. WR-1005" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Username *</label>
                            <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input required className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="User1" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Password *</label>
                            <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input required type="password" className="w-full p-3.5 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="****" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Access Level</label>
                        <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                        <option value={UserRole.USER}>Standard User Access</option>
                        <option value={UserRole.ADMIN}>Administrative Access</option>
                        </select>
                    </div>

                    {/* Branch Authorization */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-600" />
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Branch Access Authorization</h4>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                Strict Multi-Hub Control
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-4 font-medium leading-relaxed">
                            Strictly specify which branches this user is authorized to use. Any branch left as <strong>Unauthorized</strong> will be completely restricted and inaccessible to them.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(['UAE', 'KSA', 'QATAR'] as BranchCode[]).map(bCode => {
                                const isAuth = (newUser.allowed_branches || ['UAE', 'KSA', 'QATAR']).includes(bCode);
                                return (
                                    <div 
                                        key={bCode} 
                                        onClick={() => toggleAllowedBranch(bCode, false)}
                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                                            isAuth 
                                              ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' 
                                              : 'bg-rose-50/30 border-rose-200 hover:border-rose-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl">{BRANCHES[bCode]?.flag}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                isAuth 
                                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                                            }`}>
                                                {isAuth ? 'Authorized' : 'Unauthorized'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-xs text-slate-800">{BRANCHES[bCode]?.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{BRANCHES[bCode]?.currency} Hub</p>
                                        </div>
                                        <button
                                            type="button"
                                            className={`w-full py-1 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
                                                isAuth
                                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                                  : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                                            }`}
                                        >
                                            {isAuth ? '✓ Authorized' : '✕ Unauthorized'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {newUser.role === UserRole.USER && (
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-4 h-4 text-slate-400" />
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Module Permissions</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                    <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${newUser.permissions[key as keyof UserPermissions] ? 'bg-white border-blue-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" 
                                            checked={newUser.permissions[key as keyof UserPermissions]} 
                                            onChange={() => togglePermission(key as keyof UserPermissions)}
                                        />
                                        <span className={`text-[11px] font-bold ${newUser.permissions[key as keyof UserPermissions] ? 'text-blue-700' : 'text-slate-500'}`}>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>
                 
                 <div className="pt-8 flex gap-4">
                   <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-200">Authorize Account</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-white flex justify-between items-center shrink-0">
                 <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Edit User Permissions</h3>
                 <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-8 overflow-y-auto custom-scrollbar">
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Staff Full Name</label>
                            <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Employee ID</label>
                            <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={editingUser.employee_id} onChange={e => setEditingUser({...editingUser, employee_id: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Username *</label>
                            <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={editingUser.username || ''} onChange={e => setEditingUser({...editingUser, username: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Password *</label>
                            <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Access Level</label>
                        <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                        <option value={UserRole.USER}>Standard User Access</option>
                        <option value={UserRole.ADMIN}>Administrative Access</option>
                        </select>
                    </div>

                    {/* Branch Authorization */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-600" />
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Branch Access Authorization</h4>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                Strict Multi-Hub Control
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-4 font-medium leading-relaxed">
                            Strictly specify which branches this user is authorized to use. Any branch left as <strong>Unauthorized</strong> will be completely restricted and inaccessible to them.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(['UAE', 'KSA', 'QATAR'] as BranchCode[]).map(bCode => {
                                const isAuth = (editingUser.allowed_branches || ['UAE', 'KSA', 'QATAR']).includes(bCode);
                                return (
                                    <div 
                                        key={bCode} 
                                        onClick={() => toggleAllowedBranch(bCode, true)}
                                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                                            isAuth 
                                              ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' 
                                              : 'bg-rose-50/30 border-rose-200 hover:border-rose-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl">{BRANCHES[bCode]?.flag}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                isAuth 
                                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                                            }`}>
                                                {isAuth ? 'Authorized' : 'Unauthorized'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-xs text-slate-800">{BRANCHES[bCode]?.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{BRANCHES[bCode]?.currency} Hub</p>
                                        </div>
                                        <button
                                            type="button"
                                            className={`w-full py-1 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
                                                isAuth
                                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                                  : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                                            }`}
                                        >
                                            {isAuth ? '✓ Authorized' : '✕ Unauthorized'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {editingUser.role === UserRole.USER && (
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-4 h-4 text-slate-400" />
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Select Authorized Modules</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                    <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editingUser.permissions[key as keyof UserPermissions] ? 'bg-white border-blue-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" 
                                            checked={editingUser.permissions[key as keyof UserPermissions]} 
                                            onChange={() => togglePermission(key as keyof UserPermissions, true)}
                                        />
                                        <span className={`text-[11px] font-bold ${editingUser.permissions[key as keyof UserPermissions] ? 'text-blue-700' : 'text-slate-500'}`}>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>
                 
                 <div className="pt-8 flex gap-4">
                   <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* STRICT BRANCH ACCESS MANAGEMENT MODAL */}
      {branchModalUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="p-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg">
                    <Globe className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                    Branch Security & Access Control
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Strict Branch Access: {branchModalUser.name}
                </h3>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  Staff ID: <span className="font-mono text-white font-bold">{branchModalUser.employee_id}</span> • Role: <span className="uppercase text-blue-300 font-bold">{branchModalUser.role}</span>
                </p>
              </div>
              <button 
                onClick={() => setBranchModalUser(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed">
                <strong>Strict Branch Isolation Rule:</strong> You can explicitly mark which hub(s) this user is authorized to use. Any hub marked <strong>UNAUTHORIZED</strong> is strictly locked out — jobs, warehouse checklists, quotations, cost sheets, and reports from that branch will never be accessible to them.
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                  Quick Access Presets:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalBranches(['UAE'])}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      modalBranches.length === 1 && modalBranches[0] === 'UAE'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🇦🇪 UAE Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalBranches(['KSA'])}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      modalBranches.length === 1 && modalBranches[0] === 'KSA'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🇸🇦 KSA Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalBranches(['QATAR'])}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      modalBranches.length === 1 && modalBranches[0] === 'QATAR'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🇶🇦 Qatar Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalBranches(['UAE', 'KSA', 'QATAR'])}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      modalBranches.length === 3
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🌐 All Hubs
                  </button>
                </div>
              </div>

              {/* Branch Cards */}
              <div className="space-y-3">
                {(['UAE', 'KSA', 'QATAR'] as BranchCode[]).map(bCode => {
                  const isAuth = modalBranches.includes(bCode);
                  const branch = BRANCHES[bCode];

                  return (
                    <div
                      key={bCode}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isAuth
                          ? 'bg-emerald-50/50 border-emerald-400 shadow-sm'
                          : 'bg-rose-50/30 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-3xl p-1 bg-white rounded-xl border border-slate-100 shadow-xs">
                          {branch?.flag}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{branch?.name}</h4>
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {bCode}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Port: <span className="font-semibold text-slate-700">{branch?.port}</span> • Currency: <span className="font-semibold text-slate-700">{branch?.currency}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          isAuth
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {isAuth ? '✓ AUTHORIZED' : '✕ UNAUTHORIZED'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleModalBranch(bCode)}
                          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            isAuth
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isAuth ? 'Mark Unauthorized' : 'Mark Authorized'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex items-center justify-between gap-4 shrink-0">
              <p className="text-xs text-slate-500 font-medium">
                Authorized Hubs: <strong className="text-slate-800">{modalBranches.join(', ')}</strong>
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBranchModalUser(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalBranches}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-200 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Branch Restrictions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userIdToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden border border-slate-100 p-8">
              <div className="flex flex-col items-center text-center">
                 <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center border-4 border-rose-100 mb-4 text-rose-500">
                    <Trash2 className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900">Delete User Account</h3>
                 <p className="text-sm text-slate-500 mt-2">
                    Are you sure you want to delete the account for <strong className="text-slate-800">{users.find(u => u.id === userIdToDelete)?.name || 'this user'}</strong>? 
                    This action is permanent and cannot be undone.
                 </p>
              </div>
              <div className="flex gap-3 mt-6">
                 <button 
                   type="button" 
                   onClick={() => setUserIdToDelete(null)}
                   className="flex-grow py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                   type="button" 
                   onClick={() => {
                     onDeleteUser(userIdToDelete);
                     setUserIdToDelete(null);
                   }}
                   className="flex-grow py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-lg shadow-rose-100"
                 >
                    Confirm Delete
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
