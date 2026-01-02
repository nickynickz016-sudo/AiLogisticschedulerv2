
import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { UserPlus, ShieldAlert, ToggleLeft, ToggleRight, User, Fingerprint, Mail, CheckCircle, X } from 'lucide-react';

interface UserManagementProps {
  users: UserProfile[];
  onAddUser: (user: Omit<UserProfile, 'id'>) => void;
  onUpdateStatus: (id: string, status: 'Active' | 'Disabled') => void;
  isAdmin: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onUpdateStatus, isAdmin }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    employee_id: '',
    role: UserRole.USER,
    status: 'Active' as const,
    avatar: `https://picsum.photos/seed/${Math.random()}/100`
  });

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
    if (!newUser.name || !newUser.employee_id) {
      alert("Name and Employee ID are mandatory.");
      return;
    }
    onAddUser(newUser);
    setShowAddModal(false);
    setNewUser({
      name: '',
      employee_id: '',
      role: UserRole.USER,
      status: 'Active',
      avatar: `https://picsum.photos/seed/${Math.random()}/100`
    });
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
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                    user.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex justify-center">
                    <button 
                      onClick={() => onUpdateStatus(user.id, user.status === 'Active' ? 'Disabled' : 'Active')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
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

      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="p-8 border-b bg-white flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Create System Account</h3>
                 <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Access Level</label>
                    <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                       <option value={UserRole.USER}>Standard User Access</option>
                       <option value={UserRole.ADMIN}>Administrative Access</option>
                    </select>
                 </div>
                 <div className="pt-4 flex gap-4">
                   <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-200">Authorize Account</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};