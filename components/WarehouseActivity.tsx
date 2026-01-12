
import React, { useState } from 'react';
import { Job, JobStatus, UserProfile } from '../types';
import { Plus, X, Box, User, Clock, AlertCircle, Info, Calendar, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface WarehouseActivityProps {
  jobs: Job[];
  onAddJob: (job: Partial<Job>) => void;
  onDeleteJob: (jobId: string) => void;
  currentUser: UserProfile;
}

// Helper to get local date string YYYY-MM-DD to avoid timezone issues
const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const WarehouseActivity: React.FC<WarehouseActivityProps> = ({ jobs, onAddJob, onDeleteJob, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [newActivity, setNewActivity] = useState({
    id: 'WH-', // Job No.
    shipper_name: '',
    job_date: selectedDate
  });

  const dailyActivities = jobs.filter(j => j.is_warehouse_activity && j.job_date === selectedDate);
  const slotsRemaining = 5 - dailyActivities.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddJob({
      ...newActivity,
      title: newActivity.id,
      is_warehouse_activity: true,
      job_date: selectedDate,
      loading_type: 'Local Storage',
      priority: 'MEDIUM',
      special_requests: {
        handyman: false, manpower: false, overtime: false,
        documents: false, packingList: false, crateCertificate: false, walkThrough: false
      }
    });
    setShowModal(false);
    setNewActivity({ id: 'WH-', shipper_name: '', job_date: selectedDate });
  };

  const generateUniqueId = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const suffix = new Date().getFullYear().toString().slice(-2);
    setNewActivity(prev => ({ ...prev, id: `WH-${random}-${suffix}` }));
  };

  const handlePrevDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
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
        
        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facility Capacity</p>
            <p className="text-2xl font-black text-slate-800">{slotsRemaining} Slots Left</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <div className={`w-3 h-3 rounded-full ${slotsRemaining > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <label htmlFor="warehouse-date-picker" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Operation Date</label>
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
              onClick={() => setShowModal(true)}
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
          {dailyActivities.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-32 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Box className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-400">No dock bookings for this date</h3>
            </div>
          ) : (
            dailyActivities.map((activity, index) => (
              <div key={activity.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                <div className="flex items-center gap-8">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 font-bold text-xl border border-slate-100">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">UNIT {activity.id}</span>
                      {activity.status === JobStatus.PENDING_ADD && (
                         <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full uppercase border border-amber-100">Authorization Pending</span>
                      )}
                    </div>
                    <h4 className="font-bold text-2xl text-slate-800">{activity.shipper_name}</h4>
                    <div className="flex items-center gap-6 mt-3 text-xs text-slate-400 font-bold uppercase tracking-tighter">
                       <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Facility Reserved</span>
                       <span className="flex items-center gap-2"><User className="w-4 h-4" /> Request # {activity.requester_id}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onDeleteJob(activity.id)}
                  className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 border-b bg-white flex justify-between items-center rounded-t-3xl">
              <div>
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">Warehouse Reservation</h3>
                <p className="text-sm text-slate-400 font-medium">Booking for {selectedDate}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job No. *</label>
                <div className="relative">
                    <input required type="text" className="w-full px-5 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newActivity.id} onChange={e => setNewActivity({...newActivity, id: e.target.value})} placeholder="e.g. WH-AE-101" />
                    <button 
                        type="button" 
                        onClick={generateUniqueId}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Generate Unique ID"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipper Name *</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newActivity.shipper_name} onChange={e => setNewActivity({...newActivity, shipper_name: e.target.value})} placeholder="e.g. Global Trade LLC" />
              </div>

              <div className="flex items-center gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
                <p className="text-xs font-bold text-blue-700 leading-snug">Submission consumes 1 dock slot. Admin approval required.</p>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest">Confirm Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
