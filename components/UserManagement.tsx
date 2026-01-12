
import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, UserPermissions } from '../types';
import { UserPlus, ShieldAlert, ToggleLeft, ToggleRight, User, Fingerprint, Mail, CheckCircle, X, Lock, Key, Shield, Edit2, Save } from 'lucide-react';

interface UserManagementProps {
  users: UserProfile[];
  onAddUser: (user: any) => void;
  onUpdateStatus: (id: string, status: 'Active' | 'Disabled') => void;
  onUpdateUser: (user: UserProfile) => void; // New prop for updating user
  isAdmin: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: true,
  schedule: true,
  jobBoard: true,
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

const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  dashboard: 'Dashboard View',
  schedule: 'Job Schedule',
  jobBoard: 'Simple Board',
  warehouse: 'Warehouse Activity',
  importClearance: 'Import Clearance',
  approvals: 'Approval Queue',
  writerDocs: 'Writer Docs',
  inventory: 'Inventory Control',
  tracking: 'Shipment Tracking',
  resources: 'Fleet & Crew',
  capacity: 'Capacity Limits',
  users: 'User Management',
  ai: 'AI Planner',
};

export const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onUpdateStatus, onUpdateUser, isAdmin }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    employee_id: '',
    username: '',
    password: '',
    role: UserRole.USER,
    status: 'Active' as const,
    avatar: `https://picsum.photos/seed/${Math.random()}/100`,
    permissions: { ...DEFAULT_PERMISSIONS }
  });

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

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

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <th className="p-6">Employee ID</th>
              <th className="p-6">User Details</th>
              <th className="p-6">Role</th>
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
                   <div className="flex flex-wrap gap-1 max-w-xs">
                      {user.role === UserRole.ADMIN ? (
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">All Access</span>
                      ) : (
                        Object.entries(user.permissions).filter(([_, hasAccess]) => hasAccess).map(([key]) => (
                           <span key={key} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {PERMISSION_LABELS[key as keyof UserPermissions].split(' ')[0]}
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

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Access Level</label>
                        <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}>
                        <option value={UserRole.USER}>Standard User Access</option>
                        <option value={UserRole.ADMIN}>Administrative Access</option>
                        </select>
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
    </div>
  );
};
