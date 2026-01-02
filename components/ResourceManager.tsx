
import React, { useState } from 'react';
import { Personnel, Vehicle } from '../types';
import { Plus, X, Users, Truck, ShieldAlert, IdCard, Hash, Trash2, Fingerprint } from 'lucide-react';

interface ResourceManagerProps {
  personnel: Personnel[];
  onUpdatePersonnelStatus: (id: string, status: Personnel['status']) => void;
  vehicles: Vehicle[];
  onUpdateVehicleStatus: (id: string, status: Vehicle['status']) => void;
  isAdmin: boolean;
  onDeletePersonnel: (id: string) => void;
  onDeleteVehicle: (id: string) => void;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({ 
  personnel, onUpdatePersonnelStatus, vehicles, onUpdateVehicleStatus, isAdmin, onDeletePersonnel, onDeleteVehicle 
}) => {
  const [activeResTab, setActiveResTab] = useState<'personnel' | 'fleet'>('personnel');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states - these can remain as local component state
  const [newPerson, setNewPerson] = useState({ name: '', type: 'Writer Crew' as 'Writer Crew' | 'Team Leader', emirates_id: '', employee_id: '' });
  const [newVehicle, setNewVehicle] = useState({ name: '', plate: '' });
  
  // These handlers need to be created to add new resources via Supabase
  // For simplicity, we assume the parent `App.tsx` will handle adding.
  // This component will only manage what's passed in.
  // In a real-world scenario, you might pass `onAddPersonnel` and `onAddVehicle` as props.
  // For now, this component will just manage displaying and updating status.
  const handleAddPersonnel = (e: React.FormEvent) => {
    // This functionality should ideally be passed from App.tsx
    alert("Add functionality is managed at the app level.");
  }
  const handleAddVehicle = (e: React.FormEvent) => {
     alert("Add functionality is managed at the app level.");
  }


  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center bg-white rounded-3xl text-slate-900 text-center border border-slate-200">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-6" />
        <h3 className="text-xl font-bold uppercase tracking-widest">Access Restricted</h3>
        <p className="text-slate-500 mt-4 max-w-sm font-medium italic">Manager level authentication required for resource pool access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Fleet & Crew</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Resource readiness and availability monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200">
             <button onClick={() => setActiveResTab('personnel')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeResTab === 'personnel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Personnel</button>
             <button onClick={() => setActiveResTab('fleet')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeResTab === 'fleet' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Fleet Units</button>
          </div>
          <button onClick={() => alert("Add functionality is managed at the main app level.")} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 lg:p-10">
        {activeResTab === 'personnel' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {personnel.map(p => (
              <div key={p.id} className="p-6 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between hover:border-blue-200 transition-all group relative">
                <div>
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <Users className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                          p.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {p.status}
                        </span>
                        <button 
                          onClick={() => onDeletePersonnel(p.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                   <h4 className="font-bold text-lg text-slate-800 leading-tight">{p.name}</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{p.type}</p>
                   <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1.5 rounded">
                        <Fingerprint className="w-3 h-3 text-slate-400" /> EMP ID: {p.employee_id}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1.5 rounded">
                        <IdCard className="w-3 h-3 text-slate-400" /> EID: {p.emirates_id}
                      </div>
                   </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                   {['Available', 'Annual Leave', 'Sick Leave', 'Personal Leave'].map(s => (
                     <button key={s} onClick={() => onUpdatePersonnelStatus(p.id, s as any)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-tighter transition-all ${p.status === s ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{s}</button>
                   ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.map(v => (
              <div key={v.id} className="p-6 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between hover:border-blue-200 transition-all group relative">
                <div>
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <Truck className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                          v.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {v.status}
                        </span>
                        <button 
                          onClick={() => onDeleteVehicle(v.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                   <h4 className="font-bold text-lg text-slate-800">{v.name}</h4>
                   <p className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block">PLATE: {v.plate}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                   {['Available', 'Out of Service', 'Maintenance'].map(s => (
                     <button key={s} onClick={() => onUpdateVehicleStatus(v.id, s as any)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-tighter transition-all ${v.status === s ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{s}</button>
                   ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};