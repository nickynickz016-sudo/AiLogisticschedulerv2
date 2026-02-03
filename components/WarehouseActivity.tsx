
import React, { useState, useEffect } from 'react';
import { Job, JobStatus, UserProfile, Personnel, Vehicle } from '../types';
import { Plus, X, Box, User, Clock, AlertCircle, Info, Calendar, RefreshCw, ChevronLeft, ChevronRight, FileText, Activity, LayoutList, CalendarDays, Edit2, Truck, Users, CheckCircle2 } from 'lucide-react';

interface WarehouseActivityProps {
  jobs: Job[];
  onAddJob: (job: Partial<Job>) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: string) => void;
  currentUser: UserProfile;
  personnel: Personnel[];
  vehicles: Vehicle[];
  users: UserProfile[]; // Added users prop
}

// Helper to get local date string YYYY-MM-DD to avoid timezone issues
const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const WarehouseActivity: React.FC<WarehouseActivityProps> = ({ jobs, onAddJob, onEditJob, onDeleteJob, currentUser, personnel, vehicles, users }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  
  const [newActivity, setNewActivity] = useState({
    id: 'WH-', // Job No.
    shipper_name: '',
    job_date: selectedDate,
    activity_name: '',
    description: '',
    team_leader: '',
    writer_crew: [] as string[],
    vehicles: [] as string[]
  });

  // Filtered resource lists
  const teamLeaders = personnel.filter(p => p.type === 'Team Leader');
  const availableCrew = personnel.filter(p => p.type !== 'Team Leader'); // Drivers and Writer Crew

  // Effect to sync new activity date when selected date changes (if in day mode and not editing)
  useEffect(() => {
      if (!isEditing && !showModal) {
        setNewActivity(prev => ({ ...prev, job_date: selectedDate }));
      }
  }, [selectedDate, isEditing, showModal]);

  const dailyActivities = jobs.filter(j => j.is_warehouse_activity && j.job_date === selectedDate);
  const slotsRemaining = 5 - dailyActivities.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
        shipper_name: newActivity.shipper_name,
        activity_name: newActivity.activity_name,
        job_date: newActivity.job_date,
        description: newActivity.description,
        team_leader: newActivity.team_leader,
        writer_crew: newActivity.writer_crew,
        vehicles: newActivity.vehicles,
        vehicle: newActivity.vehicles.join(', ') // Legacy support
    };

    if (isEditing) {
        // Find original job to merge (preserve fields like created_at, status etc)
        const originalJob = jobs.find(j => j.id === newActivity.id);
        if (originalJob) {
            onEditJob({
                ...originalJob,
                ...payload
            });
        }
    } else {
        onAddJob({
          ...payload,
          id: newActivity.id,
          title: newActivity.id,
          is_warehouse_activity: true,
          loading_type: 'Local Storage',
          priority: 'MEDIUM',
          special_requests: {
            handyman: false, manpower: false, overtime: false,
            documents: false, packingList: false, crateCertificate: false, walkThrough: false
          }
        });
    }
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNewActivity({ 
        id: 'WH-', 
        shipper_name: '', 
        job_date: selectedDate, 
        activity_name: '', 
        description: '',
        team_leader: '',
        writer_crew: [],
        vehicles: []
    });
    setIsEditing(false);
  };

  const openAddModal = () => {
    resetForm();
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (activity: Job) => {
    setNewActivity({
        id: activity.id,
        shipper_name: activity.shipper_name,
        job_date: activity.job_date,
        activity_name: activity.activity_name || '',
        description: activity.description || '',
        team_leader: activity.team_leader || '',
        writer_crew: activity.writer_crew || [],
        vehicles: activity.vehicles || []
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const generateUniqueId = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const suffix = new Date().getFullYear().toString().slice(-2);
    setNewActivity(prev => ({ ...prev, id: `WH-${random}-${suffix}` }));
  };

  const handlePrevDate = () => {
    const date = new Date(selectedDate);
    if (viewMode === 'month') {
        date.setMonth(date.getMonth() - 1);
    } else {
        date.setDate(date.getDate() - 1);
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const date = new Date(selectedDate);
    if (viewMode === 'month') {
        date.setMonth(date.getMonth() + 1);
    } else {
        date.setDate(date.getDate() + 1);
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const toggleCrew = (name: string) => {
    setNewActivity(prev => {
        const exists = prev.writer_crew.includes(name);
        if (exists) return { ...prev, writer_crew: prev.writer_crew.filter(c => c !== name) };
        return { ...prev, writer_crew: [...prev.writer_crew, name] };
    });
  };

  // Month View Component
  const MonthView = () => {
    const dateObj = new Date(selectedDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

    const days = [];
    // Padding
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(null);
    }
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                 {dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })}
               </h3>
               <div className="flex gap-2">
                  <button onClick={handlePrevDate} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-700 hover:shadow-sm">
                     <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={handleNextDate} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-700 hover:shadow-sm">
                     <ChevronRight className="w-5 h-5" />
                  </button>
               </div>
            </div>
            <div className="grid grid-cols-7 text-center border-b border-slate-100 bg-slate-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-px border-b border-slate-200 flex-1">
                {days.map((date, idx) => {
                    if (!date) return <div key={idx} className="bg-slate-50/30 min-h-[100px]"></div>;
                    
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${d}`;

                    const isToday = dateStr === getLocalToday();
                    const isSelected = dateStr === selectedDate;
                    
                    const activities = jobs.filter(j => j.is_warehouse_activity && j.job_date === dateStr);
                    const count = activities.length;
                    const isFull = count >= 5;

                    return (
                        <div 
                            key={idx} 
                            onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
                            className={`bg-white min-h-[100px] p-2 flex flex-col hover:bg-blue-50/50 transition-colors cursor-pointer group relative ${isSelected ? 'ring-2 ring-inset ring-blue-500 z-10' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400 group-hover:text-slate-700'}`}>
                                    {date.getDate()}
                                </span>
                                {count > 0 && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isFull ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {count}/5
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                                {activities.slice(0, 3).map(act => (
                                    <div key={act.id} className="text-[9px] font-bold text-slate-600 bg-slate-50 p-1 rounded truncate border border-slate-100/50">
                                        {act.shipper_name}
                                    </div>
                                ))}
                                {activities.length > 3 && (
                                    <div className="text-[8px] font-bold text-slate-400 text-center">+ {activities.length - 3} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Box className="w-8 h-8 text-blue-600" />
            Warehouse Activity Area
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Operational slot management for loading docks</p>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                    onClick={() => setViewMode('day')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutList className="w-4 h-4" /> Day
                </button>
                <button 
                    onClick={() => setViewMode('month')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CalendarDays className="w-4 h-4" /> Month
                </button>
            </div>

            <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facility Capacity</p>
                    <p className="text-xl font-black text-slate-800">
                        {viewMode === 'day' ? `${slotsRemaining} Slots Left` : 'Overview'}
                    </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <div className={`w-2.5 h-2.5 rounded-full ${slotsRemaining > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-1 space-y-6 sticky top-24">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <label htmlFor="warehouse-date-picker" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                {viewMode === 'day' ? 'Operation Date' : 'Target Month'}
            </label>
            <div className="flex items-center gap-2">
                <button onClick={handlePrevDate} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                    <div className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                        <span>
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <Calendar className="w-5 h-5 text-slate-400" />
                    </div>
                    <input 
                        id="warehouse-date-picker"
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                <button onClick={handleNextDate} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              disabled={slotsRemaining <= 0}
              onClick={openAddModal}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white p-5 rounded-3xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase text-xs tracking-widest"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Book Facility Slot
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex gap-3 text-slate-600 mb-3">
              <Info className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-widest">Dock Policy</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Daily limit is set to 5 units to ensure safe movement and prevent terminal congestion.
            </p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {viewMode === 'month' ? (
              <MonthView />
          ) : (
              dailyActivities.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-32 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Box className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-400">No dock bookings for this date</h3>
                </div>
              ) : (
                dailyActivities.map((activity, index) => {
                  // Lookup requester details from users array
                  const requester = users.find(u => u.employee_id === activity.requester_id);
                  
                  return (
                  <div key={activity.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-8 flex-1">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 font-bold text-xl border border-slate-100 shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">UNIT {activity.id}</span>
                          {activity.status === JobStatus.PENDING_ADD && (
                             <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full uppercase border border-amber-100">Authorization Pending</span>
                          )}
                        </div>
                        <h4 className="font-bold text-2xl text-slate-800">{activity.shipper_name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {activity.activity_name && (
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mr-2">
                                <Activity className="w-4 h-4 text-slate-400" />
                                {activity.activity_name}
                            </div>
                            )}
                            
                            {/* Resource Badges */}
                            {activity.team_leader && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                    <User className="w-3 h-3 text-slate-400" /> 
                                    <span className="uppercase tracking-tight">TL: {activity.team_leader}</span>
                                </div>
                            )}
                            {activity.vehicles && activity.vehicles.length > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                    <Truck className="w-3 h-3 text-slate-400" /> 
                                    <span>{activity.vehicles.join(', ')}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Crew List Display */}
                        {activity.writer_crew && activity.writer_crew.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {activity.writer_crew.map((crewName, i) => (
                                    <div key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold border border-blue-100">
                                        <Users className="w-3 h-3 opacity-50" />
                                        {crewName}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-6 mt-4 text-xs text-slate-400 font-bold uppercase tracking-tighter pt-3 border-t border-slate-50">
                           <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Facility Reserved</span>
                           <span className="flex items-center gap-2">
                             <User className="w-4 h-4" /> 
                             {requester ? `Requested by: ${requester.name}` : `Request # ${activity.requester_id}`}
                           </span>
                        </div>
                        
                        {activity.description && (
                          <p className="mt-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-lg">
                            <span className="font-bold text-slate-700 text-xs block mb-1">NOTES:</span>
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-start md:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(activity)}
                          className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => onDeleteJob(activity.id)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                          title="Delete"
                        >
                          <X className="w-7 h-7" />
                        </button>
                    </div>
                  </div>
                )})
              )
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b bg-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">
                    {isEditing ? 'Edit Reservation' : 'Warehouse Reservation'}
                </h3>
                <p className="text-sm text-slate-400 font-medium">Booking for {selectedDate}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job No. *</label>
                <div className="relative">
                    <input 
                        required 
                        type="text" 
                        disabled={isEditing}
                        className={`w-full px-5 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        value={newActivity.id} 
                        onChange={e => setNewActivity({...newActivity, id: e.target.value})} 
                        placeholder="e.g. WH-AE-101" 
                    />
                    {!isEditing && (
                        <button 
                            type="button" 
                            onClick={generateUniqueId}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Generate Unique ID"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipper Name *</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newActivity.shipper_name} onChange={e => setNewActivity({...newActivity, shipper_name: e.target.value})} placeholder="e.g. Global Trade LLC" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Warehouse Activity</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                  value={newActivity.activity_name} 
                  onChange={e => setNewActivity({...newActivity, activity_name: e.target.value})} 
                  placeholder="e.g. Loading / Unloading / Inspection" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date of Activity</label>
                <input 
                  type="date" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                  value={newActivity.job_date} 
                  onChange={e => setNewActivity({...newActivity, job_date: e.target.value})} 
                />
              </div>

              {/* Resource Allocation Section */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Resource Allocation (Optional)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Team Leader</label>
                          <select 
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
                            value={newActivity.team_leader}
                            onChange={e => setNewActivity({...newActivity, team_leader: e.target.value})}
                          >
                              <option value="">Select Leader</option>
                              {teamLeaders.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Truck</label>
                          <select 
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
                            value={newActivity.vehicles[0] || ''}
                            onChange={e => {
                                const val = e.target.value;
                                setNewActivity({...newActivity, vehicles: val ? [val] : []});
                            }}
                          >
                              <option value="">Select Vehicle</option>
                              {vehicles.map(v => <option key={v.id} value={v.name}>{v.name} ({v.plate})</option>)}
                          </select>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Crew Members</label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                          {availableCrew.map(c => (
                              <label key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${newActivity.writer_crew.includes(c.name) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                    checked={newActivity.writer_crew.includes(c.name)}
                                    onChange={() => toggleCrew(c.name)}
                                  />
                                  <span className="text-[10px] font-bold text-slate-700 truncate">{c.name}</span>
                              </label>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                <textarea 
                  rows={3} 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none resize-none" 
                  value={newActivity.description} 
                  onChange={e => setNewActivity({...newActivity, description: e.target.value})} 
                  placeholder="Additional operational details..." 
                />
              </div>

              <div className="flex items-center gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
                <p className="text-xs font-bold text-blue-700 leading-snug">
                    {isEditing ? 'Updating this entry will retain its slot allocation.' : 'Submission consumes 1 dock slot. Admin approval required.'}
                </p>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest">
                    {isEditing ? 'Update Slot' : 'Confirm Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
