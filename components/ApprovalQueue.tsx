
import React, { useState } from 'react';
import { Job, JobStatus, Personnel, Vehicle, UserProfile } from '../types';
import { Check, X, User, AlertTriangle, Truck, Users, Layout, CheckCircle2 } from 'lucide-react';

interface ApprovalQueueProps {
  jobs: Job[];
  onApproval: (jobId: string, approved: boolean, allocation?: any) => void;
  isAdmin: boolean;
  personnel: Personnel[];
  vehicles: Vehicle[];
  users: UserProfile[];
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ jobs, onApproval, isAdmin, personnel, vehicles, users }) => {
  const [allocatingJobId, setAllocatingJobId] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<{ team_leader: string, vehicles: string[] }>({
    team_leader: '',
    vehicles: []
  });

  const pendingJobs = jobs.filter(j => 
    j.status === JobStatus.PENDING_ADD || j.status === JobStatus.PENDING_DELETE
  );

  const availableTLs = personnel.filter(p => p.type === 'Team Leader' && p.status === 'Available');
  const availableVehicles = vehicles.filter(v => v.status === 'Available');

  const startApproval = (job: Job) => {
    if (job.status === JobStatus.PENDING_DELETE) {
      onApproval(job.id, true);
    } else {
      setAllocatingJobId(job.id);
    }
  };

  const confirmApproval = (skipAllocation: boolean = false) => {
    if (!skipAllocation && (!allocation.team_leader || allocation.vehicles.length === 0)) {
      alert("Please allocate a Team Leader and at least one Vehicle, or choose 'Skip Allocation'.");
      return;
    }
    onApproval(allocatingJobId!, true, skipAllocation ? undefined : allocation);
    setAllocatingJobId(null);
    setAllocation({ team_leader: '', vehicles: [] });
  };

  const toggleVehicle = (name: string) => {
    setAllocation(prev => {
      const exists = prev.vehicles.includes(name);
      if (exists) {
        return { ...prev, vehicles: prev.vehicles.filter(v => v !== name) };
      } else {
        return { ...prev, vehicles: [...prev.vehicles, name] };
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-20 bg-white rounded-3xl text-slate-800 border border-slate-200 shadow-sm">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-6" />
        <h3 className="text-2xl font-bold uppercase tracking-tight">Access Denied</h3>
        <p className="text-slate-500 mt-4 max-w-md font-medium">Administrator privileges are required to access the approval pool.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Review Pool</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Manage pending authorizations and unit dispatching</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pendingJobs.map((job) => {
          const requester = users.find(u => u.employee_id === job.requester_id);
          return (
            <div key={job.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10 hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    job.status === JobStatus.PENDING_ADD ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}>
                    {job.status === JobStatus.PENDING_ADD ? 'Authorization Request' : 'Removal Request'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">ID: {job.id}</span>
                </div>
                <h4 className="text-2xl font-bold text-slate-800 mb-2">{job.shipper_name}</h4>
                <p className="text-sm text-slate-500 font-medium">{job.location} • {job.loading_type} • {job.volume_cbm} CBM</p>
                
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1.5">Scheduled Time</p>
                      <p className="text-sm font-bold text-slate-800">{job.job_time}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1.5">Requester</p>
                      <p className="text-sm font-bold text-slate-800">{requester ? requester.name : `ID #${job.requester_id}`}</p>
                   </div>
                </div>
              </div>

              <div className="flex gap-4 shrink-0">
                 <button onClick={() => onApproval(job.id, false)} className="p-6 rounded-3xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-200">
                   <X className="w-8 h-8" />
                 </button>
                 <button onClick={() => startApproval(job)} className="p-6 rounded-3xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                   <Check className="w-8 h-8" />
                 </button>
              </div>
            </div>
          )
        })}
        {pendingJobs.length === 0 && (
          <div className="p-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center shadow-sm mx-auto mb-6">
                <Layout className="w-10 h-10 text-slate-300" />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest">No pending authorizations</p>
          </div>
        )}
      </div>

      {allocatingJobId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-10 border-b bg-blue-600 text-white rounded-t-[2.5rem] shrink-0">
                 <h3 className="text-2xl font-bold tracking-tight uppercase">Resource Dispatch</h3>
                 <p className="text-xs font-medium uppercase tracking-widest opacity-80 mt-1">Final Authorization Step</p>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                 <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" /> Assign Team Leader
                    </label>
                    <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={allocation.team_leader} onChange={e => setAllocation({...allocation, team_leader: e.target.value})}>
                       <option value="">Choose Leader...</option>
                       {availableTLs.map(tl => <option key={tl.id} value={tl.name}>{tl.name}</option>)}
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-400" /> Dispatch Vehicles
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableVehicles.map(v => (
                        <button
                          key={v.id}
                          onClick={() => toggleVehicle(v.name)}
                          className={`px-4 py-3 rounded-2xl border text-[11px] font-bold transition-all text-left flex justify-between items-center ${
                            allocation.vehicles.includes(v.name)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col">
                             <span>{v.name}</span>
                             <span className={`text-[8px] uppercase tracking-tighter ${allocation.vehicles.includes(v.name) ? 'text-blue-100' : 'text-slate-400'}`}>{v.plate}</span>
                          </div>
                          {allocation.vehicles.includes(v.name) && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="pt-8 flex flex-col gap-3">
                   <div className="flex gap-4">
                     <button onClick={() => setAllocatingJobId(null)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-2xl transition-all uppercase tracking-widest text-[10px]">Cancel</button>
                     <button onClick={() => confirmApproval(false)} className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Approve & Dispatch</button>
                   </div>
                   <button 
                     onClick={() => confirmApproval(true)}
                     className="w-full py-4 text-blue-600 font-bold border border-blue-100 hover:bg-blue-50 rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                   >
                     Skip Allocation & Approve
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
