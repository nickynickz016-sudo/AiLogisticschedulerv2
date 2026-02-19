
import React, { useState, useEffect } from 'react';
import { Job, JobStatus, UserProfile, Personnel, Vehicle } from '../types';
import { Plus, X, Box, User, Clock, AlertCircle, Info, Calendar, RefreshCw, ChevronLeft, ChevronRight, Activity, LayoutList, CalendarDays, Edit2, Truck, Users, ArrowRight } from 'lucide-react';

interface WarehouseActivityProps {
  jobs: Job[];
  onAddJob: (job: Partial<Job>) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: string) => void;
  currentUser: UserProfile;
  personnel?: Personnel[];
  vehicles?: Vehicle[];
  users?: UserProfile[];
}

// Helper to get local date string YYYY-MM-DD
const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const WarehouseActivity: React.FC<WarehouseActivityProps> = ({ 
  jobs, 
  onAddJob, 
  onEditJob, 
  onDeleteJob, 
  currentUser, 
  personnel = [], 
  vehicles = [], 
  users = [] 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  
  const [newActivity, setNewActivity] = useState({
    id: 'WH-', 
    shipper_name: '',
    job_date: selectedDate,
    activity_name: '',
    description: '',
    team_leader: '',
    writer_crew: [] as string[],
    vehicles: [] as string[]
  });

  // Safe filtering
  const teamLeaders = personnel ? personnel.filter(p => p.type === 'Team Leader') : [];
  const availableCrew = personnel ? personnel.filter(p => p.type !== 'Team Leader') : [];

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
        vehicle: newActivity.vehicles.join(', ')
    };

    if (isEditing) {
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

  const renderMonthView = () => {
    const dateObj = new Date(selectedDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
               <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 <CalendarDays className="w-5 h-5 text-blue-600" />
                 {dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })}
               </h3>
               <div className="flex gap-2">
                  <button onClick={handlePrevDate} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200"><ChevronLeft className="w-5 h-5 text-slate-500" /></button>
                  <button onClick={handleNextDate} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200"><ChevronRight className="w-5 h-5 text-slate-500" /></button>
               </div>
            </div>
            <div className="grid grid-cols-7 text-center bg-slate-100 border-b border-slate-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-50 gap-px border-b border-slate-200">
                {days.map((date, idx) => {
                    if (!date) return <div key={idx} className="bg-white min-h-[120px]"></div>;
                    
                    const dateStr = date.toISOString().split('T')[0];
                    const isToday = dateStr === getLocalToday();
                    const acts = jobs.filter(j => j.is_warehouse_activity && j.job_date === dateStr);
                    
                    return (
                        <div 
                            key={idx} 
                            onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
                            className={`min-h-[120px] p-2 bg-white hover:bg-blue-50 transition-colors cursor-pointer relative group ${isToday ? 'bg-blue-50/30' : ''}`}
                        >
                            <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-slate-400'} block mb-2`}>{date.getDate()}</span>
                            <div className="space-y-1">
                                {acts.slice(0, 3).map(a => (
                                    <div key={a.id} className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate border border-slate-200">
                                        {a.shipper_name}
                                    </div>
                                ))}
                                {acts.length > 3 && (
                                    <div className="text-[9px] font-bold text-blue-500 text-center">+ {acts.length - 3} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Box className="w-8 h-8 text-blue-600" />
            Warehouse Activity Area
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Operational slot management for loading docks</p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setViewMode('day')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <LayoutList className="w-4 h-4" /> Day
                </button>
                <button onClick={() => setViewMode('month')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CalendarDays className="w-4 h-4" /> Month
                </button>
            </div>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Daily Capacity</p>
                <p className="text-sm font-black text-slate-800">{slotsRemaining} Slots Available</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-1 space-y-6 sticky top-24">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Operation Date</label>
            <div className="flex items-center gap-2">
                <button onClick={handlePrevDate} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"><ChevronLeft className="w-5 h-5" /></button>
                <div className="relative flex-1">
                    <div className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                        <span>{new Date(selectedDate).toLocaleDateString()}</span>
                        <Calendar className="w-5 h-5 text-slate-400" />
                    </div>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                <button onClick={handleNextDate} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <button 
            disabled={slotsRemaining <= 0}
            onClick={openAddModal}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white p-5 rounded-3xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase text-xs tracking-widest"
          >
            <Plus className="w-5 h-5" /> Book Slot
          </button>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {viewMode === 'month' ? renderMonthView() : (
              dailyActivities.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-32 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Box className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-400">No dock bookings for {selectedDate}</h3>
                </div>
              ) : (
                dailyActivities.map((activity, index) => {
                  const requester = users ? users.find(u => u.employee_id === activity.requester_id) : null;
                  return (
                  <div key={activity.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-blue-200 transition-all">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">UNIT {activity.id}</span>
                          {activity.status === JobStatus.PENDING_ADD && (
                             <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full uppercase border border-amber-100">Pending</span>
                          )}
                        </div>
                        <h4 className="font-bold text-xl text-slate-800">{activity.shipper_name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {activity.activity_name && (
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mr-2">
                                    <Activity className="w-4 h-4 text-slate-400" /> {activity.activity_name}
                                </div>
                            )}
                            {activity.team_leader && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                    <User className="w-3 h-3 text-slate-400" /> 
                                    <span className="uppercase tracking-tight">TL: {activity.team_leader}</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 text-xs text-slate-400 font-bold uppercase tracking-wide">
                           Requested by: {requester ? requester.name : activity.requester_id}
                        </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(activity)} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => onDeleteJob(activity.id)} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all"><X className="w-5 h-5" /></button>
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
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">{isEditing ? 'Edit Reservation' : 'Warehouse Reservation'}</h3>
                <p className="text-sm text-slate-400 font-medium">Booking for {selectedDate}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job No. *</label>
                <div className="relative">
                    <input required type="text" disabled={isEditing} className="w-full px-5 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newActivity.id} onChange={e => setNewActivity({...newActivity, id: e.target.value})} placeholder="WH-..." />
                    {!isEditing && <button type="button" onClick={generateUniqueId} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><RefreshCw className="w-4 h-4" /></button>}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipper Name *</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newActivity.shipper_name} onChange={e => setNewActivity({...newActivity, shipper_name: e.target.value})} placeholder="Shipper Name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Activity</label>
                <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newActivity.activity_name} onChange={e => setNewActivity({...newActivity, activity_name: e.target.value})} placeholder="Loading / Unloading" />
              </div>
              
              {/* Resources */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Resources (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Team Leader</label>
                          <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" value={newActivity.team_leader} onChange={e => setNewActivity({...newActivity, team_leader: e.target.value})}>
                              <option value="">Select Leader</option>
                              {teamLeaders.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Truck</label>
                          <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" value={newActivity.vehicles[0] || ''} onChange={e => setNewActivity({...newActivity, vehicles: e.target.value ? [e.target.value] : []})}>
                              <option value="">Select Vehicle</option>
                              {vehicles.map(v => <option key={v.id} value={v.name}>{v.name} ({v.plate})</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Crew</label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                          {availableCrew.map(c => (
                              <label key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${newActivity.writer_crew.includes(c.name) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                                  <input type="checkbox" className="h-3.5 w-3.5" checked={newActivity.writer_crew.includes(c.name)} onChange={() => toggleCrew(c.name)} />
                                  <span className="text-[10px] font-bold text-slate-700 truncate">{c.name}</span>
                              </label>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                <textarea rows={3} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none resize-none" value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} placeholder="Details..." />
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest">{isEditing ? 'Update Slot' : 'Confirm Slot'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
