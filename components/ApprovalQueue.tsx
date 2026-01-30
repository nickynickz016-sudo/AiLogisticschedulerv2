
import React, { useState } from 'react';
import { Job, JobStatus, Personnel, Vehicle, UserProfile, SystemSettings } from '../types';
import { Check, X, User, AlertTriangle, Truck, Users, Layout, CheckCircle2, Calendar, AlertCircle, Maximize2, Minimize2, Search, FileText, Box, FileCheck } from 'lucide-react';

interface ApprovalQueueProps {
  jobs: Job[];
  onApproval: (jobId: string, approved: boolean, allocation?: any) => void;
  isAdmin: boolean;
  personnel: Personnel[];
  vehicles: Vehicle[];
  users: UserProfile[];
  settings: SystemSettings;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ jobs, onApproval, isAdmin, personnel, vehicles, users, settings }) => {
  const [allocatingJobId, setAllocatingJobId] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<{ team_leader: string, vehicles: string[], writer_crew: string[] }>({
    team_leader: '',
    vehicles: [],
    writer_crew: []
  });

  // UI States for Expansion and Search
  const [expandedSection, setExpandedSection] = useState<'leader' | 'crew' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const pendingJobs = jobs.filter(j => 
    j.status === JobStatus.PENDING_ADD || j.status === JobStatus.PENDING_DELETE
  );

  // Filtered lists based on search
  const teamLeaders = personnel.filter(p => p.type === 'Team Leader' && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const allCrew = personnel.filter(p => p.type !== 'Team Leader' && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const allVehicles = vehicles; 

  const startApproval = (job: Job) => {
    if (job.status === JobStatus.PENDING_DELETE) {
      onApproval(job.id, true);
    } else {
      setAllocatingJobId(job.id);
      setExpandedSection(null);
      setSearchTerm('');
    }
  };

  const confirmApproval = (skipAllocation: boolean = false) => {
    if (!skipAllocation && (!allocation.team_leader || allocation.vehicles.length === 0)) {
      alert("Please allocate a Team Leader and at least one Vehicle, or choose 'Skip Allocation'.");
      return;
    }
    onApproval(allocatingJobId!, true, skipAllocation ? undefined : allocation);
    setAllocatingJobId(null);
    setAllocation({ team_leader: '', vehicles: [], writer_crew: [] });
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

  const toggleCrewMember = (name: string) => {
    setAllocation(prev => {
      const exists = prev.writer_crew.includes(name);
      if (exists) {
        return { ...prev, writer_crew: prev.writer_crew.filter(n => n !== name) };
      } else {
        return { ...prev, writer_crew: [...prev.writer_crew, name] };
      }
    });
  };

  const toggleSection = (section: 'leader' | 'crew') => {
    if (expandedSection === section) {
        setExpandedSection(null);
        setSearchTerm('');
    } else {
        setExpandedSection(section);
        setSearchTerm('');
    }
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
          const jobDate = job.job_date;
          const currentCount = jobs.filter(j => j.job_date === jobDate && j.status !== JobStatus.REJECTED).length;
          const dailyLimit = settings.daily_job_limits[jobDate] ?? 10;
          const isAtCapacity = currentCount >= dailyLimit;

          return (
            <div key={job.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 hover:shadow-md transition-shadow">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    job.status === JobStatus.PENDING_ADD ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}>
                    {job.status === JobStatus.PENDING_ADD ? 'Authorization Request' : 'Removal Request'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">ID: {job.id}</span>
                  
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                     <Calendar className="w-3.5 h-3.5 text-slate-400" />
                     <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        {new Date(jobDate).toLocaleDateString()}
                     </span>
                     <span className="text-slate-300">|</span>
                     <span className={`text-[10px] font-bold uppercase tracking-wide ${isAtCapacity ? 'text-rose-500' : 'text-emerald-600'}`}>
                        Load: {currentCount} / {dailyLimit}
                     </span>
                  </div>
                </div>
                
                <h4 className="text-2xl font-bold text-slate-800 mb-2">{job.shipper_name}</h4>
                <p className="text-sm text-slate-500 font-medium">
                    {job.is_warehouse_activity ? (
                        <span className="flex items-center gap-2"><Box className="w-4 h-4"/> Warehouse Activity</span>
                    ) : job.is_import_clearance ? (
                        <span className="flex items-center gap-2"><FileCheck className="w-4 h-4"/> Import Clearance</span>
                    ) : (
                        <span>{job.location} • {job.loading_type}</span>
                    )}
                    {job.volume_cbm ? ` • ${job.volume_cbm} CBM` : ''}
                </p>
                
                {/* Specific Details for Warehouse/Import Jobs */}
                {(job.is_warehouse_activity || job.is_import_clearance) && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2 max-w-2xl">
                        {job.is_warehouse_activity && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <p><span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Operation Type:</span> <br/><span className="font-bold text-slate-800 text-sm">{job.activity_name || 'General Warehouse Op'}</span></p>
                                </div>
                                {job.description && (
                                    <div className="pt-2 border-t border-slate-200 mt-1">
                                        <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block mb-1">Operational Notes:</span>
                                        <p className="italic text-slate-700">{job.description}</p>
                                    </div>
                                )}
                            </>
                        )}
                        {job.is_import_clearance && (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div><span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">Agent / SD Name</span> <span className="font-bold text-slate-800">{job.agent_name || 'N/A'}</span></div>
                                    <div><span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">BOL / AWB</span> <span className="font-mono text-slate-700">{job.bol_number || 'N/A'}</span></div>
                                    <div><span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">Container / Flight</span> <span className="font-mono text-slate-700">{job.container_number || 'N/A'}</span></div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1.5">Scheduled Time</p>
                      <p className="text-sm font-bold text-slate-800">{job.job_time || '08:00'}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1.5">Requester</p>
                      <p className="text-sm font-bold text-slate-800">{requester ? requester.name : `ID #${job.requester_id}`}</p>
                   </div>
                </div>
              </div>

              <div className="flex gap-4 shrink-0 self-center lg:self-center w-full lg:w-auto justify-center lg:justify-end mt-4 lg:mt-0">
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
           <div className={`bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col ${expandedSection ? 'h-[85vh]' : 'max-h-[90vh]'}`}>
              <div className="p-8 border-b bg-blue-600 text-white rounded-t-[2.5rem] shrink-0 flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-bold tracking-tight uppercase">Resource Dispatch</h3>
                    <p className="text-xs font-medium uppercase tracking-widest opacity-80 mt-1">Final Authorization Step</p>
                 </div>
                 {expandedSection && (
                    <button onClick={() => { setExpandedSection(null); setSearchTerm(''); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all">
                        <Minimize2 className="w-5 h-5" />
                    </button>
                 )}
              </div>
              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                 
                 {/* Team Leader Section */}
                 <div className={`bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 flex flex-col ${expandedSection === 'leader' ? 'flex-1 h-full min-h-[300px]' : ''} ${expandedSection === 'crew' ? 'hidden' : ''}`}>
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" /> Assign Team Leader
                        </label>
                        <div className="flex items-center gap-2">
                            {expandedSection === 'leader' && (
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        autoFocus
                                        className="bg-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold outline-none w-40 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" 
                                        placeholder="Search Leaders..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            )}
                            <button 
                                onClick={() => toggleSection('leader')} 
                                className={`p-1.5 rounded-lg transition-all ${expandedSection === 'leader' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                title={expandedSection === 'leader' ? "Collapse View" : "Expand View"}
                            >
                                {expandedSection === 'leader' ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                    <div className={`p-2 overflow-y-auto custom-scrollbar grid grid-cols-1 gap-2 ${expandedSection === 'leader' ? 'flex-1' : 'max-h-32'}`}>
                       {teamLeaders.length === 0 && <p className="text-xs text-slate-400 p-4 text-center">No Team Leaders available.</p>}
                       {teamLeaders.map(tl => (
                           <button
                             key={tl.id}
                             onClick={() => setAllocation({...allocation, team_leader: tl.name})}
                             className={`px-4 py-3 rounded-xl border text-[11px] font-bold transition-all text-left flex justify-between items-center ${
                               allocation.team_leader === tl.name
                                 ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                 : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                             }`}
                           >
                             <div className="flex flex-col">
                                <span className="truncate pr-2 text-sm">{tl.name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${tl.status === 'Available' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                  <span className={`text-[9px] uppercase tracking-tighter ${allocation.team_leader === tl.name ? 'text-blue-200' : 'text-slate-400'}`}>
                                    {tl.status}
                                  </span>
                                </div>
                             </div>
                             {allocation.team_leader === tl.name && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                           </button>
                       ))}
                    </div>
                 </div>

                 {/* Crew Section */}
                 <div className={`bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 flex flex-col ${expandedSection === 'crew' ? 'flex-1 h-full min-h-[300px]' : ''} ${expandedSection === 'leader' ? 'hidden' : ''}`}>
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" /> Assign Crew Members
                        </label>
                        <div className="flex items-center gap-2">
                            {expandedSection === 'crew' && (
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    <input 
                                        autoFocus
                                        className="bg-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold outline-none w-40 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" 
                                        placeholder="Search Crew..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            )}
                            <button 
                                onClick={() => toggleSection('crew')} 
                                className={`p-1.5 rounded-lg transition-all ${expandedSection === 'crew' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                title={expandedSection === 'crew' ? "Collapse View" : "Expand View"}
                            >
                                {expandedSection === 'crew' ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                    <div className={`p-2 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-2 ${expandedSection === 'crew' ? 'flex-1 auto-rows-min' : 'max-h-48'}`}>
                      {allCrew.length === 0 && <p className="text-xs text-slate-400 p-4 col-span-2 text-center">No crew found.</p>}
                      {allCrew.map(crew => (
                        <button
                          key={crew.id}
                          type="button"
                          onClick={() => toggleCrewMember(crew.name)}
                          className={`px-3 py-3 rounded-xl border text-[11px] font-bold transition-all text-left flex justify-between items-center group relative ${
                            allocation.writer_crew.includes(crew.name)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                             <span className="truncate pr-2">{crew.name}</span>
                             <div className="flex items-center gap-1.5 mt-0.5">
                               <div className={`w-1.5 h-1.5 rounded-full ${crew.status === 'Available' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                               <span className={`text-[8px] uppercase tracking-tighter truncate ${allocation.writer_crew.includes(crew.name) ? 'text-blue-100' : 'text-slate-400'}`}>
                                 {crew.status}
                               </span>
                             </div>
                          </div>
                          {allocation.writer_crew.includes(crew.name) && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                 </div>

                 {/* Vehicle Section */}
                 {!expandedSection && (
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400" /> Dispatch Vehicles
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                          {allVehicles.map(v => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => toggleVehicle(v.name)}
                              className={`px-4 py-3 rounded-xl border text-[11px] font-bold transition-all text-left flex justify-between items-center ${
                                allocation.vehicles.includes(v.name)
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex flex-col">
                                 <span className="truncate pr-2">{v.name}</span>
                                 <div className="flex items-center gap-1.5 mt-0.5">
                                   <div className={`w-1.5 h-1.5 rounded-full ${v.status === 'Available' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                   <span className={`text-[8px] uppercase tracking-tighter ${allocation.vehicles.includes(v.name) ? 'text-blue-100' : 'text-slate-400'}`}>{v.plate}</span>
                                 </div>
                              </div>
                              {allocation.vehicles.includes(v.name) && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                            </button>
                          ))}
                          {allVehicles.length === 0 && <p className="text-xs text-slate-400 p-2 col-span-2 text-center">No vehicles available.</p>}
                        </div>
                     </div>
                 )}

                 <div className="pt-4 flex flex-col gap-3 shrink-0">
                   <div className="flex gap-4">
                     <button onClick={() => setAllocatingJobId(null)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-2xl transition-all uppercase tracking-widest text-[10px]">Cancel</button>
                     <button onClick={() => confirmApproval(false)} className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Approve & Dispatch</button>
                   </div>
                   {!expandedSection && (
                       <button 
                         onClick={() => confirmApproval(true)}
                         className="w-full py-4 text-blue-600 font-bold border border-blue-100 hover:bg-blue-50 rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                       >
                         Skip Allocation & Approve
                       </button>
                   )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
