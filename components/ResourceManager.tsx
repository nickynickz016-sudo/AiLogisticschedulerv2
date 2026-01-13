
import React, { useState, useEffect } from 'react';
import { Personnel, Vehicle } from '../types';
import { Plus, X, Users, Truck, ShieldAlert, IdCard, Trash2, Fingerprint, CreditCard, User, CheckCircle2 } from 'lucide-react';

interface ResourceManagerProps {
  personnel: Personnel[];
  onUpdatePersonnelStatus: (id: string, status: Personnel['status']) => void;
  vehicles: Vehicle[];
  onUpdateVehicleStatus: (id: string, status: Vehicle['status']) => void;
  isAdmin: boolean;
  onDeletePersonnel: (id: string) => void;
  onDeleteVehicle: (id: string) => void;
  onAddPersonnel: (person: Omit<Personnel, 'id'>) => void;
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({ 
  personnel, onUpdatePersonnelStatus, vehicles, onUpdateVehicleStatus, isAdmin, onDeletePersonnel, onDeleteVehicle,
  onAddPersonnel, onAddVehicle
}) => {
  const [activeResTab, setActiveResTab] = useState<'personnel' | 'fleet'>('personnel');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [newPerson, setNewPerson] = useState({ 
    name: '', 
    type: 'Writer Crew' as 'Writer Crew' | 'Team Leader' | 'Driver', 
    emirates_id: '', 
    employee_id: '',
    license_number: ''
  });
  const [newVehicle, setNewVehicle] = useState({ name: '', plate: '' });
  
  // Reset form when modal opens or tab changes
  useEffect(() => {
    setNewPerson({ 
      name: '', 
      type: 'Writer Crew', 
      emirates_id: '', 
      employee_id: '', 
      license_number: '' 
    });
    setNewVehicle({ name: '', plate: '' });
  }, [showAddModal, activeResTab]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeResTab === 'personnel') {
      const missingFields = [];
      if (!newPerson.name) missingFields.push("Full Name");
      if (!newPerson.employee_id) missingFields.push("Employee ID");
      if (!newPerson.emirates_id) missingFields.push("Emirates ID");
      if (newPerson.type === 'Driver' && !newPerson.license_number) missingFields.push("Drivers License Number");

      if (missingFields.length > 0) {
        alert(`Missing Requirements:\n\nPlease fill in the following mandatory fields:\n• ${missingFields.join('\n• ')}`);
        return;
      }

      // Prepare payload: Remove license_number if not a driver to keep DB clean
      const personnelPayload = {
        ...newPerson,
        status: 'Available' as const,
        // Only include license_number if type is Driver, otherwise undefined
        license_number: newPerson.type === 'Driver' ? newPerson.license_number : undefined
      };

      onAddPersonnel(personnelPayload);
    } else {
      const missingFields = [];
      if (!newVehicle.name) missingFields.push("Vehicle Name/Model");
      if (!newVehicle.plate) missingFields.push("Plate Number");

      if (missingFields.length > 0) {
        alert(`Missing Requirements:\n\nPlease fill in the following mandatory fields:\n• ${missingFields.join('\n• ')}`);
        return;
      }

      onAddVehicle({
        ...newVehicle,
        status: 'Available'
      });
    }
    setShowAddModal(false);
  };

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center bg-white rounded-3xl text-slate-900 text-center border border-slate-200">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-6" />
        <h3 className="text-xl font-bold uppercase tracking-widest">Access Restricted</h3>
        <p className="text-slate-500 mt-4 max-w-sm font-medium italic">Manager level authentication required for resource pool access.</p>
      </div>
    );
  }

  const renderPersonnelCard = (p: Personnel) => (
    <div key={p.id} className="p-6 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between hover:border-blue-200 transition-all group relative">
      <div>
         <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl border ${p.type === 'Driver' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
              {p.type === 'Driver' ? <User className="w-5 h-5 text-blue-500" /> : <Users className="w-5 h-5 text-slate-400" />}
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
            {p.type === 'Driver' && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1.5 rounded border border-blue-100 mt-1">
                <CreditCard className="w-3 h-3 text-blue-400 shrink-0" /> 
                <span className="truncate">LIC: {p.license_number || 'N/A'}</span>
              </div>
            )}
         </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-50">
         {['Available', 'Annual Leave', 'Sick Leave', 'Personal Leave'].map(s => (
           <button key={s} onClick={() => onUpdatePersonnelStatus(p.id, s as any)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-tighter transition-all ${p.status === s ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{s}</button>
         ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Fleet & Crew</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Resource readiness and availability monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200">
             <button onClick={() => setActiveResTab('personnel')} className={`px-4 lg:px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeResTab === 'personnel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Crew</button>
             <button onClick={() => setActiveResTab('fleet')} className={`px-4 lg:px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeResTab === 'fleet' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Fleet Units</button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 lg:p-10">
        {activeResTab === 'fleet' ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {personnel.map(renderPersonnelCard)}
             {personnel.length === 0 && (
               <div className="col-span-full py-12 text-center text-slate-400 text-sm font-medium">
                 No crew members found. Click the + button to add.
               </div>
             )}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="p-8 border-b bg-white flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">
                    Add {activeResTab === 'fleet' ? 'Fleet Unit' : 'Crew Member'}
                 </h3>
                 <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-8 space-y-6">
                 {activeResTab === 'fleet' ? (
                   <>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Vehicle Name/Model *</label>
                        <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} placeholder="e.g. Mitsubishi Canter" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Plate Number *</label>
                        <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} placeholder="e.g. DXB A 12345" />
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Full Name *</label>
                        <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} placeholder="e.g. John Doe" />
                     </div>
                     
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Role *</label>
                        <select 
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium" 
                            value={newPerson.type} 
                            onChange={e => setNewPerson({...newPerson, type: e.target.value as any})}
                        >
                           <option value="Writer Crew">Writer Crew</option>
                           <option value="Team Leader">Team Leader</option>
                           <option value="Driver">Driver</option>
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Employee ID *</label>
                            <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newPerson.employee_id} onChange={e => setNewPerson({...newPerson, employee_id: e.target.value})} placeholder="WR-..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Emirates ID *</label>
                            <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={newPerson.emirates_id} onChange={e => setNewPerson({...newPerson, emirates_id: e.target.value})} placeholder="784-..." />
                        </div>
                     </div>
                     
                     {newPerson.type === 'Driver' && (
                        <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                               <CreditCard className="w-3 h-3" />
                               Drivers License No. *
                            </label>
                            <input 
                              required 
                              className="w-full p-3.5 mt-1 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" 
                              value={newPerson.license_number} 
                              onChange={e => setNewPerson({...newPerson, license_number: e.target.value})} 
                              placeholder="Enter License Number..." 
                            />
                        </div>
                     )}
                   </>
                 )}
                 <div className="pt-4 flex gap-4">
                   <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-200">
                      Add {activeResTab === 'fleet' ? 'Unit' : 'Member'}
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
