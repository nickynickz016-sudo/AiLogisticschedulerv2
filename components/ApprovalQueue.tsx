
import React, { useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Job, JobStatus, Personnel, Vehicle, UserProfile, SystemSettings, WarehouseChecklist, NightPatrollingChecklist, SafetyMonitoringChecklist, SurpriseVisitChecklist, DailyMonitoringChecklist } from '../types';
import { Check, X, User, AlertTriangle, Truck, Users, Layout, CheckCircle2, Calendar, AlertCircle, Maximize2, Minimize2, Search, FileText, Box, FileCheck, ShieldAlert, ShieldCheck, Flame, Activity, Clock8, ClipboardCheck } from 'lucide-react';

interface ApprovalQueueProps {
  jobs: Job[];
  onApproval: (jobId: string, approved: boolean, allocation?: any) => void;
  isAdmin: boolean;
  personnel: Personnel[];
  vehicles: Vehicle[];
  users: UserProfile[];
  settings: SystemSettings;
  checklists?: WarehouseChecklist[];
  patrolLogs?: NightPatrollingChecklist[];
  safetyChecks?: SafetyMonitoringChecklist[];
  surpriseVisits?: SurpriseVisitChecklist[];
  dailyMonitoring?: DailyMonitoringChecklist[];
  onUpdateChecklist?: (id: string, checklist: Partial<WarehouseChecklist>) => void;
  onUpdatePatrol?: (id: string, log: Partial<NightPatrollingChecklist>) => void;
  onUpdateSafety?: (id: string, check: Partial<SafetyMonitoringChecklist>) => void;
  onUpdateSurprise?: (id: string, visit: Partial<SurpriseVisitChecklist>) => void;
  onUpdateDaily?: (id: string, check: Partial<DailyMonitoringChecklist>) => void;
  currentUser: UserProfile;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ 
  jobs, 
  onApproval, 
  isAdmin, 
  personnel, 
  vehicles, 
  users, 
  settings,
  checklists = [],
  patrolLogs = [],
  safetyChecks = [],
  surpriseVisits = [],
  dailyMonitoring = [],
  onUpdateChecklist,
  onUpdatePatrol,
  onUpdateSafety,
  onUpdateSurprise,
  onUpdateDaily,
  currentUser
}) => {
  const [allocatingJobId, setAllocatingJobId] = useState<string | null>(null);
  const [signingWarehouse, setSigningWarehouse] = useState<{ item: any, type: string } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const sigPad = React.useRef<any>(null);

  const [allocation, setAllocation] = useState<{ team_leader: string, vehicles: string[], writer_crew: string[] }>({
    team_leader: '',
    vehicles: [],
    writer_crew: []
  });

  // UI States for Expansion and Search
  const [expandedSection, setExpandedSection] = useState<'leader' | 'crew' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isOpsAdmin = currentUser.employee_id === 'OPS-ADMIN-01';
  const isKarthik = currentUser.name.toLowerCase().includes('karthik') || isOpsAdmin;

  const canApproveWarehouse = (type: string) => {
     if (type === 'safety' || type === 'surprise') return isKarthik;
     return isAdmin || isOpsAdmin;
  };

  const pendingJobs = jobs.filter(j => 
    (j.status === JobStatus.PENDING_ADD || j.status === JobStatus.PENDING_DELETE) && !j.is_transporter
  );

  const pendingWarehouse = [
    ...checklists.filter(c => c.status === 'Pending Approval').map(item => ({ item, type: 'closing' })),
    ...patrolLogs.filter(c => c.status === 'Pending Approval').map(item => ({ item, type: 'patrolling' })),
    ...safetyChecks.filter(c => c.status === 'Pending Approval').map(item => ({ item, type: 'safety' })),
    ...surpriseVisits.filter(c => c.status === 'Pending Approval').map(item => ({ item, type: 'surprise' })),
    ...dailyMonitoring.filter(c => c.status === 'Pending Approval').map(item => ({ item, type: 'daily' }))
  ].sort((a, b) => (b.item.created_at || 0) - (a.item.created_at || 0));

  const totalPending = pendingJobs.length + pendingWarehouse.length;

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

  const handleWarehouseAuth = (approved: boolean) => {
    if (!signingWarehouse) return;
    const { item, type } = signingWarehouse;
    const sig = sigPad.current?.isEmpty() ? null : sigPad.current?.toDataURL('image/png');

    if (approved && !sig) {
        alert("Digital signature is mandatory for approval");
        return;
    }

    if (!approved && !declineReason.trim()) {
        alert("Please provide a reason for declining");
        return;
    }

    const updates = approved ? {
        status: 'Approved' as const,
        admin_incharge_name: currentUser.name,
        admin_incharge_signature: sig || undefined,
        warehouse_incharge_name: currentUser.name,
        warehouse_incharge_signature: sig || undefined,
        approved_at: Date.now(),
        approved_by: currentUser.name
    } : {
        status: 'Declined' as const,
        declined_at: Date.now(),
        declined_by: currentUser.name,
        decline_comments: declineReason
    };

    if (type === 'closing' && onUpdateChecklist) onUpdateChecklist(item.id, updates);
    else if (type === 'patrolling' && onUpdatePatrol) onUpdatePatrol(item.id, updates);
    else if (type === 'safety' && onUpdateSafety) onUpdateSafety(item.id, updates);
    else if (type === 'surprise' && onUpdateSurprise) onUpdateSurprise(item.id, updates);
    else if (type === 'daily' && onUpdateDaily) onUpdateDaily(item.id, updates);

    setSigningWarehouse(null);
    setDeclineReason('');
    setIsDeclining(false);
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
          const currentCount = jobs.filter(j => 
            j.job_date === jobDate && 
            j.status !== JobStatus.REJECTED &&
            !j.is_warehouse_activity &&
            !j.is_import_clearance &&
            !j.is_transporter
          ).length;
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
                <p className="text-sm text-slate-500 font-medium font-mono uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg inline-flex items-center gap-2">
                    {job.is_warehouse_activity ? (
                        <><Box className="w-4 h-4 text-blue-500"/> Warehouse Activity</>
                    ) : job.is_import_clearance ? (
                        <><FileCheck className="w-4 h-4 text-emerald-500"/> Import Clearance</>
                    ) : (
                        <>{job.location} • {job.loading_type}</>
                    )}
                </p>

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
                 <button onClick={() => onApproval(job.id, false)} className="p-6 rounded-3xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-200 shadow-sm">
                   <X className="w-8 h-8" />
                 </button>
                 <button onClick={() => startApproval(job)} className="p-6 rounded-3xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                   <Check className="w-8 h-8" />
                 </button>
              </div>
            </div>
          );
        })}

        {pendingWarehouse.map(({ item, type }) => (
          <div key={item.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 hover:shadow-md transition-shadow">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  type === 'closing' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                  type === 'patrolling' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                  type === 'safety' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  {type === 'closing' ? 'Warehouse Closing 9.3' :
                   type === 'patrolling' ? 'Night Patrolling Log' :
                   type === 'safety' ? 'Safety Monitoring' :
                   'Surprise Visit Audit'}
                </span>
                <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">ID: {item.id.split('-')[0]}</span>
              </div>
              
              <h4 className="text-2xl font-black text-slate-800 mb-2">{item.date}</h4>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                  {type === 'closing' ? <span><Clock8 className="w-4 h-4 inline mr-1"/> Closing Time: {(item as WarehouseChecklist).time}</span> :
                   type === 'patrolling' ? <span><Layout className="w-4 h-4 inline mr-1"/> Location: {(item as NightPatrollingChecklist).location}</span> :
                   type === 'safety' ? <span><ShieldAlert className="w-4 h-4 inline mr-1"/> Safety Audit: {(item as SafetyMonitoringChecklist).time}</span> :
                   <span><Activity className="w-4 h-4 inline mr-1"/> Visit Time: {(item as SurpriseVisitChecklist).in_time}</span>}
              </p>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1.5">Submitted By</p>
                    <p className="text-sm font-bold text-slate-800">{item.submitted_by}</p>
                 </div>
              </div>
            </div>

            <div className="flex gap-4 shrink-0 self-center lg:self-center w-full lg:w-auto justify-center lg:justify-end mt-4 lg:mt-0">
               {canApproveWarehouse(type) ? (
                <>
                  <button 
                    onClick={() => { setSigningWarehouse({ item, type }); setIsDeclining(true); }}
                    className="p-6 rounded-3xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-200"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <button 
                    onClick={() => { setSigningWarehouse({ item, type }); setIsDeclining(false); }}
                    className="p-6 rounded-3xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </button>
                </>
               ) : (
                <div className="px-6 py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Restricted Access</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Karthik's Signature Required</p>
                </div>
               )}
            </div>
          </div>
        ))}

        {totalPending === 0 && (
          <div className="p-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center shadow-sm mx-auto mb-6">
                <Layout className="w-10 h-10 text-slate-300" />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest">No pending authorizations found</p>
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

      {signingWarehouse && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
              <div className={`p-8 border-b text-white rounded-t-[2.5rem] shrink-0 flex justify-between items-center ${isDeclining ? 'bg-rose-500' : 'bg-slate-900'}`}>
                 <div>
                    <h3 className="text-2xl font-bold tracking-tight uppercase">
                      {isDeclining ? 'Confirm Decline' : 'Digital Authorization'}
                    </h3>
                    <p className="text-xs font-medium uppercase tracking-widest opacity-80 mt-1">
                      {signingWarehouse.type.toUpperCase()} • {signingWarehouse.item.date}
                    </p>
                 </div>
                 <button onClick={() => setSigningWarehouse(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-8 space-y-6">
                 {isDeclining ? (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Reason for Decline</label>
                    <textarea 
                      autoFocus
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-rose-500/20 focus:bg-white outline-none transition-all"
                      placeholder="Explain why this checklist is being rejected..."
                    />
                  </div>
                 ) : (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Draw Digital Signature Below</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 overflow-hidden h-48">
                      <SignatureCanvas 
                        ref={sigPad}
                        penColor="black"
                        canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
                      />
                    </div>
                    <button 
                      onClick={() => sigPad.current?.clear()}
                      className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 w-full text-center"
                    >
                      Clear Signature
                    </button>
                  </div>
                 )}

                 <div className="grid grid-cols-2 gap-4 pt-4">
                    <button 
                      onClick={() => setSigningWarehouse(null)} 
                      className="py-4 font-black text-slate-400 hover:text-slate-600 rounded-2xl uppercase tracking-widest text-[10px]"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleWarehouseAuth(!isDeclining)} 
                      className={`py-4 font-black text-white rounded-2xl shadow-lg uppercase tracking-widest text-[10px] ${
                        isDeclining ? 'bg-rose-500 shadow-rose-100 hover:bg-rose-600' : 'bg-slate-900 shadow-slate-100 hover:bg-slate-800'
                      }`}
                    >
                      {isDeclining ? 'Decline Record' : 'Sign & Authorize'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
