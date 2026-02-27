
import React, { useState, useEffect } from 'react';
import { Personnel, Vehicle } from '../types';
import { Plus, X, Users, Truck, ShieldAlert, IdCard, Trash2, Fingerprint, CreditCard, User, CheckCircle2, Edit2, Loader2, Search } from 'lucide-react';

interface ResourceManagerProps {
  personnel: Personnel[];
  onUpdatePersonnelStatus: (id: string, status: Personnel['status']) => void;
  vehicles: Vehicle[];
  onUpdateVehicleStatus: (id: string, status: Vehicle['status']) => void;
  isAdmin: boolean;
  onDeletePersonnel: (id: string) => void;
  onDeleteVehicle: (id: string) => void;
  onAddPersonnel: (person: Omit<Personnel, 'id'>) => Promise<boolean | void> | void;
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<boolean | void> | void;
  onEditPersonnel?: (person: Personnel) => Promise<boolean | void> | void;
  onEditVehicle?: (vehicle: Vehicle) => Promise<boolean | void> | void;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({ 
  personnel, onUpdatePersonnelStatus, vehicles, onUpdateVehicleStatus, isAdmin, onDeletePersonnel, onDeleteVehicle,
  onAddPersonnel, onAddVehicle, onEditPersonnel, onEditVehicle
}) => {
  const [activeResTab, setActiveResTab] = useState<'personnel' | 'fleet'>('personnel');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter resources based on search term
  const filteredPersonnel = personnel.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.employee_id && p.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.type && p.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form states
  const [personForm, setPersonForm] = useState({ 
    name: '', 
    type: 'Writer Crew' as 'Writer Crew' | 'Team Leader' | 'Driver', 
    emirates_id: '', 
    employee_id: '',
    license_number: '',
    status: 'Available' as Personnel['status']
  });
  const [vehicleForm, setVehicleForm] = useState({ name: '', plate: '', status: 'Available' as Vehicle['status'] });
  
  // Reset form when modal opens or tab changes
  useEffect(() => {
    if (!isEditing && showModal) {
        setPersonForm({ 
          name: '', 
          type: 'Writer Crew', 
          emirates_id: '', 
          employee_id: '', 
          license_number: '',
          status: 'Available'
        });
        setVehicleForm({ name: '', plate: '', status: 'Available' });
    }
  }, [showModal, activeResTab, isEditing]);

  const openAddModal = () => {
      setIsEditing(false);
      setEditingId(null);
      setShowModal(true);
  };

  const openEditPersonModal = (p: Personnel) => {
      setIsEditing(true);
      setEditingId(p.id);
      setPersonForm({
          name: p.name,
          type: p.type || 'Writer Crew', // Handle potentially missing type
          emirates_id: p.emirates_id || '',
          employee_id: p.employee_id || '',
          license_number: p.license_number || '',
          status: p.status
      });
      setShowModal(true);
  };

  const openEditVehicleModal = (v: Vehicle) => {
      setIsEditing(true);
      setEditingId(v.id);
      setVehicleForm({
          name: v.name || '',
          plate: v.plate,
          status: v.status
      });
      setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let success = true;

    try {
      if (activeResTab === 'personnel') {
        const missingFields = [];
        if (!personForm.name) missingFields.push("Full Name");
        if (!personForm.employee_id) missingFields.push("Employee ID");
        // Ensure Emirates ID is provided
        if (!personForm.emirates_id) missingFields.push("Emirates ID"); 
        if (personForm.type === 'Driver' && !personForm.license_number) missingFields.push("Drivers License Number");

        if (missingFields.length > 0) {
          alert(`Missing Requirements:\n\nPlease fill in the following mandatory fields:\n• ${missingFields.join('\n• ')}`);
          setIsSubmitting(false);
          return;
        }

        const personnelPayload = {
          ...personForm,
          // Explicitly set license_number to null if not Driver to clear it or keep it clean in DB
          license_number: personForm.type === 'Driver' ? personForm.license_number : null
        };

        // Cast to any to handle potential null vs undefined mismatch in types vs DB
        const payload: any = personnelPayload;

        if (isEditing && editingId && onEditPersonnel) {
            const res = await onEditPersonnel({ id: editingId, ...payload } as Personnel);
            if (res === false) success = false;
        } else {
            const res = await onAddPersonnel(payload);
            if (res === false) success = false;
        }
      } else {
        const missingFields = [];
        if (!vehicleForm.name) missingFields.push("Vehicle Name/Model");
        if (!vehicleForm.plate) missingFields.push("Plate Number");

        if (missingFields.length > 0) {
          alert(`Missing Requirements:\n\nPlease fill in the following mandatory fields:\n• ${missingFields.join('\n• ')}`);
          setIsSubmitting(false);
          return;
        }

        if (isEditing && editingId && onEditVehicle) {
            const res = await onEditVehicle({ id: editingId, ...vehicleForm } as Vehicle);
            if (res === false) success = false;
        } else {
            const res = await onAddVehicle(vehicleForm);
            if (res === false) success = false;
        }
      }
    } catch (err) {
      console.error("Submission Error", err);
      success = false;
    }

    setIsSubmitting(false);
    
    // Only close if no error occurred (returned true or void/undefined, assuming void is success)
    if (success) {
      setShowModal(false);
    }
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
    <div key={p.id} className="p-6 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between hover:border-blue-200 transition-all group relative shadow-sm hover:shadow-md">
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
                onClick={() => openEditPersonModal(p)}
                className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDeletePersonnel(p.id)}
                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
         </div>
         <h4 className="font-bold text-lg text-slate-800 leading-tight">{p.name}</h4>
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{p.type || 'Unassigned'}</p>
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1.5 rounded">
              <Fingerprint className="w-3 h-3 text-slate-400" /> EMP ID: {p.employee_id}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1.5 rounded">
              <IdCard className="w-3 h-3 text-slate-400" /> EID: {p.emirates_id || 'N/A'}
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
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search resources..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 w-64 transition-all"
            />
          </div>
          <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200">
             <button onClick={() => setActiveResTab('personnel')} className={`px-4 lg:px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeResTab === 'personnel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Crew</button>
             <button onClick={() => setActiveResTab('fleet')} className={`px-4 lg:px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeResTab === 'fleet' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Fleet Units</button>
          </div>
          <button onClick={openAddModal} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 lg:p-10">
        {activeResTab === 'fleet' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVehicles.map(v => (
              <div key={v.id} className="p-6 bg-white border border-slate-200 rounded-3xl flex flex-col justify-between hover:border-blue-200 transition-all group relative shadow-sm hover:shadow-md">
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
                            onClick={() => openEditVehicleModal(v)}
                            className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteVehicle(v.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-100 rounded-lg transition-all"
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
            {filteredPersonnel.map(renderPersonnelCard)}
             {filteredPersonnel.length === 0 && (
               <div className="col-span-full py-12 text-center text-slate-400 text-sm font-medium">
                 No crew members found matching your search.
               </div>
             )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-white flex justify-between items-center shrink-0">
                 <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">
                    {isEditing ? 'Edit' : 'Add'} {activeResTab === 'fleet' ? 'Fleet Unit' : 'Crew Member'}
                 </h3>
                 <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                 {activeResTab === 'fleet' ? (
                   <>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Vehicle Name/Model *</label>
                        <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} placeholder="e.g. Mitsubishi Canter" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Plate Number *</label>
                        <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={vehicleForm.plate} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value})} placeholder="e.g. DXB A 12345" />
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Full Name *</label>
                        <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={personForm.name} onChange={e => setPersonForm({...personForm, name: e.target.value})} placeholder="e.g. John Doe" />
                     </div>
                     
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Role *</label>
                        <select 
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium" 
                            value={personForm.type} 
                            onChange={e => setPersonForm({...personForm, type: e.target.value as any})}
                        >
                           <option value="Writer Crew">Writer Crew</option>
                           <option value="Team Leader">Team Leader</option>
                           <option value="Driver">Driver</option>
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Employee ID *</label>
                            <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={personForm.employee_id} onChange={e => setPersonForm({...personForm, employee_id: e.target.value})} placeholder="WR-..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Emirates ID *</label>
                            <input required className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" value={personForm.emirates_id} onChange={e => setPersonForm({...personForm, emirates_id: e.target.value})} placeholder="784-..." />
                        </div>
                     </div>
                     
                     {personForm.type === 'Driver' && (
                        <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                               <CreditCard className="w-3 h-3" />
                               Drivers License No. *
                            </label>
                            <input 
                              required 
                              className="w-full p-3.5 mt-1 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-medium" 
                              value={personForm.license_number} 
                              onChange={e => setPersonForm({...personForm, license_number: e.target.value})} 
                              placeholder="Enter License Number..." 
                            />
                        </div>
                     )}
                   </>
                 )}
                 <div className="pt-4 flex gap-4">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest">Cancel</button>
                   <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isEditing ? 'Save Changes' : `Add ${activeResTab === 'fleet' ? 'Unit' : 'Member'}`}
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
