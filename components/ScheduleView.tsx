
import React, { useState, useEffect } from 'react';
import { Job, JobStatus, LoadingType, UserProfile, Personnel, Vehicle, UserRole, ShipmentDetailsType } from '../types';
import { Plus, Search, Package, Clock, User, X, Calendar as CalendarIcon, CheckCircle2, Truck, Settings2, Lock, Unlock, Trash2, Users, ChevronLeft, ChevronRight, Maximize, Minimize, Phone, Mail, Briefcase, FileText, AlertCircle, MapPin, RefreshCw, Edit2 } from 'lucide-react';
import { JobDetailModal } from './JobDetailModal';

interface ScheduleViewProps {
  jobs: Job[];
  onAddJob: (job: Partial<Job>) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: string) => void;
  onUpdateAllocation: (jobId: string, allocation: { team_leader: string, vehicles: string[], writer_crew: string[] }) => void;
  onToggleLock: (jobId: string) => void;
  currentUser: UserProfile;
  personnel: Personnel[];
  vehicles: Vehicle[];
  users: UserProfile[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
const SHIPMENT_TYPES: ShipmentDetailsType[] = ['Local Move', 'Sea FCL', 'AIR', 'AIR LCL', 'SEA LCL', 'Groupage', 'Road'];
const LOADING_TYPES: LoadingType[] = ['Warehouse Removal', 'Direct Loading', 'Storage', 'Local Storage', 'Delivery'];

// Updated country codes with validation rules
const countryCodes = [
  { name: 'UAE', code: '+971', digits: 9 },
  { name: 'USA', code: '+1', digits: 10 },
  { name: 'UK', code: '+44', digits: 10 },
  { name: 'India', code: '+91', digits: 10 },
  { name: 'KSA', code: '+966', digits: 9 },
  { name: 'Qatar', code: '+974', digits: 8 },
];

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  jobs, onAddJob, onEditJob, onDeleteJob, onUpdateAllocation, onToggleLock, currentUser, personnel, vehicles, users 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'month'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Edit Mode State
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Define permissions: Admin OR OPS-ADMIN-01 can manage schedule details (allocation/locks)
  const canManageSchedule = currentUser.role === UserRole.ADMIN || currentUser.employee_id === 'OPS-ADMIN-01';

  const selectedDate = getLocalDateString(currentDate);

  const [editAllocation, setEditAllocation] = useState<{ team_leader: string, vehicles: string[], writer_crew: string[] }>({
    team_leader: '',
    vehicles: [],
    writer_crew: []
  });

  const today = getLocalDateString();
  
  const initialNewJobState: Partial<Job> = {
    id: 'AE-', 
    shipper_name: '',
    shipper_phone: '+971 ',
    client_email: '',
    location: '',
    shipment_details: 'Local Move',
    description: '',
    priority: 'LOW',
    agent_name: '',
    loading_type: 'Warehouse Removal',
    main_category: 'Commercial',
    sub_category: 'Export',
    shuttle: 'No',
    long_carry: 'No',
    special_requests: { 
      handyman: false, manpower: false, overtime: false,
      documents: false, packingList: false, crateCertificate: false, walkThrough: false 
    },
    volume_cbm: 0,
    job_time: '08:00',
    job_date: today,
    duration: 1,
    assigned_to: 'Unassigned'
  };

  const [newJob, setNewJob] = useState<Partial<Job>>(initialNewJobState);

  // Sync newJob date with currently selected view date when modal opens (only for new jobs)
  useEffect(() => {
    if (showModal && !isEditingMode) {
        setNewJob(prev => ({ ...prev, job_date: selectedDate }));
    }
  }, [showModal, selectedDate, isEditingMode]);

  const handleCloseModal = () => {
    setShowModal(false);
    setIsModalExpanded(false);
    setNewJob(initialNewJobState);
    setIsEditingMode(false);
  };

  const generateUniqueId = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const suffix = new Date().getFullYear().toString().slice(-2);
    setNewJob(prev => ({ ...prev, id: `AE-${random}-${suffix}` }));
  };

  const getJobDayLabel = (job: Job) => {
    const match = job.id.match(/-D(\d+)$/);
    if (match) {
      return `Day ${match[1]}`;
    }
    if (job.duration && job.duration > 1) {
      return 'Day 1';
    }
    return null;
  };

  const filteredJobs = jobs.filter(j => 
    !j.is_warehouse_activity &&
    !j.is_import_clearance &&
    j.job_date === selectedDate &&
    (j.id.toLowerCase().includes(filter.toLowerCase()) || 
     j.shipper_name.toLowerCase().includes(filter.toLowerCase())) &&
    j.status !== JobStatus.REJECTED
  );

  const handleEditClick = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setNewJob(job);
    setIsEditingMode(true);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Detailed Validation Logic
    const missingFields: string[] = [];

    if (!newJob.id || newJob.id.trim() === 'AE-') missingFields.push("Job No.");
    if (!newJob.shipper_name || !newJob.shipper_name.trim()) missingFields.push("Shipper Name");
    if (!newJob.job_date) missingFields.push("Start Date");
    if (!newJob.location || !newJob.location.trim()) missingFields.push("Location Address");
    if (!newJob.duration || newJob.duration < 1) missingFields.push("Valid Duration (Min 1 day)");

    // Popup if mandatory fields are missing
    if (missingFields.length > 0) {
      alert(`Submission Failed. Please complete the following mandatory fields:\n\n• ${missingFields.join('\n• ')}`);
      return;
    }

    // Phone Validation
    if (newJob.shipper_phone) {
        const [code, ...numParts] = newJob.shipper_phone.split(' ');
        const number = numParts.join('');
        const country = countryCodes.find(c => c.code === code);
        
        if (country) {
            // Remove any non-digits to check actual length
            const cleanNumber = number.replace(/\D/g, '');
            if (cleanNumber.length !== country.digits) {
                alert(`Invalid phone number for ${country.name} (${country.code}). Number must be exactly ${country.digits} digits.`);
                return;
            }
        }
    }

    if (isEditingMode) {
        onEditJob(newJob as Job);
    } else {
        onAddJob({ ...newJob, title: newJob.id });
    }
    handleCloseModal();
  };

  const openAllocationEditor = (job: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManageSchedule) return;
    setShowAllocationModal(job);
    setEditAllocation({ 
      team_leader: job.team_leader || '', 
      vehicles: job.vehicles || [],
      writer_crew: job.writer_crew || []
    });
  };

  const handleToggleJobLock = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLock(jobId);
  };
  
  const handleDeleteJobClick = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteJob(jobId);
  };

  const handleUpdateAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (showAllocationModal) {
      onUpdateAllocation(showAllocationModal.id, editAllocation);
      setShowAllocationModal(null);
    }
  };

  const toggleCrewMember = (name: string) => {
    setEditAllocation(prev => {
      const exists = prev.writer_crew.includes(name);
      if (exists) {
        return { ...prev, writer_crew: prev.writer_crew.filter(n => n !== name) };
      } else {
        return { ...prev, writer_crew: [...prev.writer_crew, name] };
      }
    });
  };

  const toggleVehicle = (name: string) => {
    setEditAllocation(prev => {
      const exists = prev.vehicles.includes(name);
      if (exists) {
        return { ...prev, vehicles: prev.vehicles.filter(v => v !== name) };
      } else {
        return { ...prev, vehicles: [...prev.vehicles, name] };
      }
    });
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
        const [year, month, day] = dateValue.split('-').map(Number);
        setCurrentDate(new Date(year, month - 1, day));
    }
  };
  
  const handlePrev = () => {
    setCurrentDate(prev => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      }
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      }
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  // Month View Component
  const MonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayOfWeek = firstDayOfMonth.getDay();
    const numDaysInMonth = lastDayOfMonth.getDate();

    const calendarDays: { day: number, isCurrentMonth: boolean, date: Date | null }[] = [];

    // Days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek; i > 0; i--) {
        calendarDays.push({ day: prevMonthLastDay - i + 1, isCurrentMonth: false, date: null });
    }

    // Days from current month
    for (let i = 1; i <= numDaysInMonth; i++) {
        calendarDays.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }

    // Days from next month
    while (calendarDays.length % 7 !== 0) {
        calendarDays.push({ day: calendarDays.length - numDaysInMonth - firstDayOfWeek + 1, isCurrentMonth: false, date: null });
    }

    const jobsForMonth = jobs.filter(job => {
        if (job.is_warehouse_activity || job.is_import_clearance) return false;
        const jobDate = new Date(job.job_date);
        return jobDate.getFullYear() === year && jobDate.getMonth() === month;
    });

    const handleDayClick = (day: number) => {
        setCurrentDate(new Date(year, month, day));
        setViewMode('list');
    };

    const localTodayStr = getLocalDateString();

    return (
      <div className="flex flex-col">
        <div className="grid grid-cols-7 gap-px bg-slate-200 text-center text-xs font-bold text-slate-500">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 bg-slate-50">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-5 gap-px bg-slate-200 border-t-0">
          {calendarDays.map((day, index) => {
            const jobsForThisDay = day.isCurrentMonth ? jobsForMonth.filter(job => new Date(job.job_date).getDate() === day.day) : [];
            const dayDateStr = day.date ? getLocalDateString(day.date) : '';
            const isToday = day.isCurrentMonth && dayDateStr === localTodayStr;

            return (
              <div
                key={index}
                className={`p-2 h-20 md:h-36 flex flex-col relative group transition-all ${day.isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50'}`}
                onClick={() => day.isCurrentMonth && handleDayClick(day.day)}
              >
                <span className={`text-sm font-bold ${
                  isToday ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : 
                  day.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {day.day}
                </span>
                {day.isCurrentMonth && (
                  <div className="mt-1 space-y-1 overflow-y-auto custom-scrollbar flex-1 hidden md:block">
                    {jobsForThisDay.map(job => (
                      <div 
                        key={job.id} 
                        className="p-1.5 bg-blue-50 text-blue-800 rounded-md text-[10px] font-bold truncate cursor-pointer hover:bg-blue-100"
                        title={job.shipper_name}
                      >
                       {job.shipper_name}
                      </div>
                    ))}
                  </div>
                )}
                {day.isCurrentMonth && jobsForThisDay.length > 0 && (
                   <div className="md:hidden mt-1 flex justify-center">
                     <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{jobsForThisDay.length}</span>
                   </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex-1 w-full">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600" />
            Job Allocation Board
          </h2>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 mt-3">
             <div className="flex gap-2">
                 <button onClick={() => setCurrentDate(new Date())} className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                    Today
                  </button>
                 <div className="flex items-center gap-1">
                    <button onClick={handlePrev} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={handleNext} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"><ChevronRight className="w-4 h-4" /></button>
                 </div>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-4">
                 {viewMode === 'month' ? (
                    <h3 className="text-sm font-bold text-slate-700 w-full sm:w-40 text-left sm:text-center self-center">
                      {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                  ) : (
                    <div className="relative w-full sm:w-auto">
                        <div className="flex items-center gap-3 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-100 transition-colors w-full sm:w-auto">
                            <CalendarIcon className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-bold text-slate-700">
                                {currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <input 
                            id="schedule-date-picker"
                            type="date" 
                            value={selectedDate} 
                            onChange={handleDateInputChange}
                            className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                  )}
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>List</button>
                  <button onClick={() => setViewMode('calendar')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Day</button>
                  <button onClick={() => setViewMode('month')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Month</button>
                </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          {viewMode !== 'month' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search ID or Shipper..."
                className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none w-full"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          )}
          <button 
            onClick={() => { setIsEditingMode(false); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-xl hover:bg-slate-800 transition-all font-bold uppercase text-[11px] tracking-widest shadow-md whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Submit Request
          </button>
        </div>
      </div>

      {/* Main Content (Table/Calendar) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {viewMode === 'month' ? (
          <MonthView />
        ) : viewMode === 'calendar' ? (
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
             <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] border-b bg-slate-50 text-slate-400 sticky top-0 z-10">
                <div className="p-4 text-[10px] font-bold uppercase tracking-widest text-center">Timing</div>
                <div className="p-4 text-[10px] font-bold uppercase tracking-widest px-8">Dispatch Operations</div>
             </div>
             {HOURS.map((hour) => {
               const hourJobs = filteredJobs.filter(j => j.job_time === hour);
               return (
                 <div key={hour} className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] border-b last:border-0 group min-h-[160px]">
                    <div className="p-6 text-sm font-bold text-slate-300 text-center bg-slate-50/20 border-r border-slate-100">
                      {hour}
                    </div>
                    <div className="p-4 md:p-6 flex flex-wrap gap-6 items-start">
                       {hourJobs.length === 0 && (
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-slate-300 text-[10px] font-bold uppercase py-6">
                            Available Slot
                         </div>
                       )}
                       {hourJobs.map((job) => {
                         const requester = users.find(u => u.employee_id === job.requester_id);
                         const dayLabel = getJobDayLabel(job);
                         return (
                           <div key={job.id} onClick={() => setSelectedJob(job)} className={`w-full md:min-w-[340px] md:max-w-sm rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all bg-white relative group/job cursor-pointer ${job.is_locked ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'}`}>
                              <div className="flex justify-between items-start mb-4">
                                 <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">ID: {job.id}</p>
                                      {dayLabel && (
                                        <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded border border-violet-200">
                                            {dayLabel}
                                        </span>
                                      )}
                                      {job.is_locked && <Lock className="w-3 h-3 text-amber-500" />}
                                    </div>
                                    <h4 className="font-bold text-base text-slate-800 leading-tight truncate max-w-[150px] md:max-w-none">{job.shipper_name}</h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      <span className="text-[10px] text-slate-500 font-bold">{requester ? requester.name : job.requester_id}</span>
                                    </div>
                                 </div>
                                 <div className="flex gap-2">
                                    {/* Action Buttons */}
                                    {canManageSchedule && (
                                      <>
                                        <button 
                                          onClick={(e) => handleToggleJobLock(job.id, e)}
                                          className={`p-1.5 rounded-lg transition-all ${job.is_locked ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                        >
                                          {job.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </button>
                                        <button 
                                          onClick={(e) => openAllocationEditor(job, e)}
                                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                                        >
                                          <Settings2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                    {job.status === JobStatus.ACTIVE && (
                                      <button 
                                        onClick={(e) => handleEditClick(e, job)}
                                        className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                                        title="Edit Job Details"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => handleDeleteJobClick(job.id, e)} 
                                      className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-500 transition-all opacity-100 lg:opacity-0 lg:group-hover/job:opacity-100"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                              <div className="space-y-3 mb-4">
                                 {/* Job Details */}
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                      <Users className="w-3 h-3" /> Crew Allocation
                                    </span>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-bold text-slate-700">
                                        {job.team_leader ? `TL: ${job.team_leader}` : 'No TL assigned'}
                                      </span>
                                      {job.writer_crew && job.writer_crew.length > 0 && (
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          Crew: {job.writer_crew.join(', ')}
                                        </span>
                                      )}
                                    </div>
                                 </div>
                              </div>
                           </div>
                         )
                       })}
                    </div>
                 </div>
               );
             })}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            {/* List View Table */}
            <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-[1000px]">
               <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                     <th className="p-6">Job No.</th>
                     <th className="p-6">Shipper / Location</th>
                     <th className="p-6">Shipment / Time</th>
                     <th className="p-6">Allocation Details</th>
                     <th className="p-6">Status</th>
                     <th className="p-6 text-center">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredJobs.map(job => {
                    const requester = users.find(u => u.employee_id === job.requester_id);
                    const dayLabel = getJobDayLabel(job);
                    return (
                      <tr key={job.id} onClick={() => setSelectedJob(job)} className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${job.is_locked ? 'bg-amber-50/5' : ''}`}>
                         <td className="p-6 text-sm font-bold text-blue-600">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    {job.id}
                                    {job.is_locked && <Lock className="w-3 h-3 text-amber-500" />}
                                </div>
                                {dayLabel && (
                                    <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded border border-violet-200 w-fit">
                                        {dayLabel}
                                    </span>
                                )}
                            </div>
                         </td>
                         <td className="p-6">
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{job.shipper_name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 font-medium uppercase truncate max-w-[200px]">{job.location}</span>
                                {job.shuttle === 'Yes' && <span className="text-[8px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">Shuttle</span>}
                                {job.long_carry === 'Yes' && <span className="text-[8px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">Long Carry</span>}
                              </div>
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-[10px] text-slate-500 font-bold">{requester ? requester.name : job.requester_id}</span>
                              </div>
                           </div>
                         </td>
                         <td className="p-6">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-start gap-2">
                                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700">{job.shipment_details || 'N/A'}</span>
                                        <span className="text-[10px] text-slate-500 font-medium">{job.loading_type} / {job.volume_cbm || 0} CBM</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 border-t border-slate-50 pt-1 mt-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="text-[10px] text-slate-500 font-bold">{job.job_time}</span>
                                </div>
                            </div>
                         </td>
                         <td className="p-6">
                           <div className="flex flex-col gap-2">
                              <div className="flex items-start gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-700">
                                    {job.team_leader ? `Leader: ${job.team_leader}` : 'Unassigned'}
                                  </span>
                                  {job.writer_crew && job.writer_crew.length > 0 && (
                                    <span className="text-[10px] text-slate-500 font-medium leading-tight">
                                      Crew: {job.writer_crew.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 border-t border-slate-50 pt-1 mt-1">
                                <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-[10px] text-slate-500 font-bold">{job.vehicles?.join(', ') || 'No vehicle'}</span>
                              </div>
                           </div>
                         </td>
                         <td className="p-6">
                           <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                             job.status === JobStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                           }`}>
                             {job.status}
                           </span>
                         </td>
                         <td className="p-6">
                           <div className="flex items-center justify-center gap-2">
                             {canManageSchedule && (
                               <>
                                 <button 
                                   onClick={(e) => handleToggleJobLock(job.id, e)}
                                   className={`p-2 rounded-xl transition-all ${job.is_locked ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                                 >
                                   {job.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                 </button>
                                 <button 
                                   onClick={(e) => openAllocationEditor(job, e)}
                                   className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all shadow-sm"
                                 >
                                    <Settings2 className="w-4 h-4" />
                                 </button>
                               </>
                             )}
                             {job.status === JobStatus.ACTIVE && (
                                <button 
                                  onClick={(e) => handleEditClick(e, job)}
                                  className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm"
                                  title="Edit Job Details"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                             )}
                             <button 
                               onClick={(e) => handleDeleteJobClick(job.id, e)}
                               disabled={job.is_locked && !canManageSchedule}
                               className={`p-2 rounded-xl transition-all ${job.is_locked && !canManageSchedule ? 'opacity-20 cursor-not-allowed' : 'bg-rose-50 text-rose-300 hover:text-rose-600 hover:bg-rose-100'}`}
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </td>
                      </tr>
                    )
                  })}
               </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          users={users}
        />
      )}

      {/* Allocation Edit Modal */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-slate-900 flex justify-between items-center text-white shrink-0">
                 <div>
                   <h3 className="text-lg font-bold uppercase tracking-widest">Dispatch Allocation</h3>
                   <p className="text-[10px] font-medium opacity-70 uppercase tracking-tighter">Job No: {showAllocationModal.id}</p>
                 </div>
                 <button onClick={() => setShowAllocationModal(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleUpdateAllocation} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Leader Assignment</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={editAllocation.team_leader} onChange={e => setEditAllocation({...editAllocation, team_leader: e.target.value})}>
                       <option value="">Choose Leader...</option>
                       {personnel.filter(p => p.type === 'Team Leader').map(tl => <option key={tl.id} value={tl.name}>{tl.name}</option>)}
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Crew Members</label>
                    <div className="grid grid-cols-2 gap-2">
                      {personnel.filter(p => p.type === 'Writer Crew').map(crew => (
                        <button
                          key={crew.id}
                          type="button"
                          onClick={() => toggleCrewMember(crew.name)}
                          className={`px-4 py-3 rounded-xl border text-[11px] font-bold transition-all text-left flex justify-between items-center ${
                            editAllocation.writer_crew.includes(crew.name)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{crew.name}</span>
                            <span className={`text-[8px] uppercase tracking-tighter ${editAllocation.writer_crew.includes(crew.name) ? 'text-blue-100' : 'text-slate-400'}`}>ID: {crew.employee_id}</span>
                          </div>
                          {editAllocation.writer_crew.includes(crew.name) && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fleet Assignment</label>
                    <div className="grid grid-cols-2 gap-2">
                      {vehicles.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVehicle(v.name)}
                          className={`px-4 py-3 rounded-xl border text-[11px] font-bold transition-all text-left flex justify-between items-center ${
                            editAllocation.vehicles.includes(v.name)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col">
                             <span>{v.name}</span>
                             <span className={`text-[8px] uppercase tracking-tighter ${editAllocation.vehicles.includes(v.name) ? 'text-blue-100' : 'text-slate-400'}`}>{v.plate}</span>
                          </div>
                          {editAllocation.vehicles.includes(v.name) && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                 </div>
                 
                 <div className="pt-6 flex gap-4 shrink-0 mt-auto">
                   <button type="button" onClick={() => setShowAllocationModal(null)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 text-[11px] uppercase tracking-widest">Discard</button>
                   <button type="submit" className="flex-1 py-4 font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-[11px] uppercase tracking-widest">Finalize Allocation</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* New/Edit Job Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`bg-white rounded-[2rem] w-full shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] h-full md:h-auto border border-slate-200 overflow-hidden transition-all ease-in-out ${isModalExpanded ? 'max-w-6xl' : 'max-w-3xl'}`}>
            <div className="p-6 md:p-8 border-b flex justify-between items-center bg-white shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center rotate-45 transform">
                    <span className="text-white font-black text-lg -rotate-45">W</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight uppercase">
                    {isEditingMode ? 'Edit Job Details' : 'Submit Allocation Request'}
                  </h3>
               </div>
               <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsModalExpanded(!isModalExpanded)} className="hidden md:block p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400" title={isModalExpanded ? "Collapse" : "Expand"}>
                  {isModalExpanded ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                </button>
                <button type="button" onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
               </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-10">
              
              {/* Section 1: Operational Basics */}
              <section>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                        <Briefcase className="w-4 h-4" /> 
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Operational Basics</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job No. *</label>
                    <div className="relative">
                        <input 
                            required 
                            type="text" 
                            disabled={isEditingMode} // Disable ID editing in edit mode
                            className={`w-full px-5 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none ${isEditingMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                            value={newJob.id} 
                            onChange={e => setNewJob({...newJob, id: e.target.value})} 
                            placeholder="AE-XXXX" 
                        />
                        {!isEditingMode && (
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
                    <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newJob.shipper_name} onChange={e => setNewJob({...newJob, shipper_name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date *</label>
                    <input required type="date" min={today} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newJob.job_date} onChange={e => setNewJob({...newJob, job_date: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Duration (Days)</label>
                      <input 
                        required 
                        type="number" 
                        min="1" 
                        max="30"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                        value={newJob.duration || 1} 
                        onChange={e => setNewJob({...newJob, duration: parseInt(e.target.value) || 1})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Timing</label>
                        <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newJob.job_time} onChange={e => setNewJob({...newJob, job_time: e.target.value})}>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Contact & Location */}
              <section>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                        <MapPin className="w-4 h-4" /> 
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Contact & Location</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Phone className="w-3 h-3"/> Shipper Phone</label>
                    <div className="flex">
                      <select 
                        className="w-1/3 px-3 py-3.5 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                        value={newJob.shipper_phone?.split(' ')[0] || '+971'}
                        onChange={e => {
                          const numberPart = newJob.shipper_phone?.split(' ')[1] || '';
                          setNewJob({ ...newJob, shipper_phone: `${e.target.value} ${numberPart}` });
                        }}
                      >
                        {countryCodes.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                      </select>
                      <input 
                        type="tel"
                        className="w-2/3 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-r-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                        value={newJob.shipper_phone?.split(' ')[1] || ''}
                        onChange={e => {
                          const prefixPart = newJob.shipper_phone?.split(' ')[0] || '+971';
                          const val = e.target.value.replace(/\D/g, '');
                          setNewJob({ ...newJob, shipper_phone: `${prefixPart} ${val}` });
                        }}
                        placeholder={`Req: ${countryCodes.find(c => c.code === (newJob.shipper_phone?.split(' ')[0] || '+971'))?.digits} digits`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Mail className="w-3 h-3"/> Client Email</label>
                    <input type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newJob.client_email} onChange={e => setNewJob({...newJob, client_email: e.target.value})} placeholder="client@example.com" />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location Address *</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                      value={newJob.location} 
                      onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                      autoComplete="off"
                      placeholder="e.g. Villa 12, Springs 4, Dubai"
                    />
                  </div>
                </div>
              </section>

              {/* Section 3: Shipment Specs */}
              <section>
                 <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <Truck className="w-4 h-4" /> 
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Shipment Specifications</h4>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipment Details</label>
                        <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newJob.shipment_details} onChange={e => setNewJob({...newJob, shipment_details: e.target.value as ShipmentDetailsType})}>
                          {SHIPMENT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type of Loading</label>
                        <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newJob.loading_type} onChange={e => setNewJob({...newJob, loading_type: e.target.value as LoadingType})}>
                          {LOADING_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Volume (CBM)</label>
                        <input type="number" step="0.1" min="0" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newJob.volume_cbm} onChange={e => setNewJob({...newJob, volume_cbm: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shuttle Required?</label>
                      <div className="flex gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <button type="button" onClick={() => setNewJob({...newJob, shuttle: 'No'})} className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all ${newJob.shuttle === 'No' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>No</button>
                          <button type="button" onClick={() => setNewJob({...newJob, shuttle: 'Yes'})} className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all ${newJob.shuttle === 'Yes' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Yes</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Long Carry?</label>
                      <div className="flex gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <button type="button" onClick={() => setNewJob({...newJob, long_carry: 'No'})} className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all ${newJob.long_carry === 'No' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>No</button>
                          <button type="button" onClick={() => setNewJob({...newJob, long_carry: 'Yes'})} className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all ${newJob.long_carry === 'Yes' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Yes</button>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><FileText className="w-3 h-3"/> Description / Notes</label>
                       <textarea 
                         rows={2}
                         className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                         value={newJob.description}
                         onChange={e => setNewJob({...newJob, description: e.target.value})}
                         placeholder="Additional details..."
                       />
                    </div>
                 </div>
              </section>

              {/* Section 4: Special Requests */}
              <section>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                        <AlertCircle className="w-4 h-4" /> 
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Special Requests</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Resource Requests</h5>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { label: 'Handyman Service', key: 'handyman' },
                          { label: 'Extra Manpower', key: 'manpower' },
                          { label: 'Overtime Policy', key: 'overtime' },
                        ].map(({ label: reqLabel, key }) => (
                          <label key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-white border border-transparent hover:border-slate-200 transition-all">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={(newJob.special_requests as any)?.[key]} onChange={e => setNewJob({...newJob, special_requests: { ...newJob.special_requests!, [key]: e.target.checked }})} />
                            <span className="text-[11px] font-bold text-slate-700">{reqLabel}</span>
                          </label>
                        ))}
                      </div>
                  </div>
                  <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Documents Required</h5>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { label: 'Main Documentation', key: 'documents' },
                          { label: 'Inventory / Packing List', key: 'packingList' },
                          { label: 'Export Crate Certificate', key: 'crateCertificate' },
                          { label: 'Walk-through Review', key: 'walkThrough' },
                        ].map(({ label: reqLabel, key }) => (
                          <label key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-white border border-transparent hover:border-slate-200 transition-all">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={(newJob.special_requests as any)?.[key]} onChange={e => setNewJob({...newJob, special_requests: { ...newJob.special_requests!, [key]: e.target.checked }})} />
                            <span className="text-[11px] font-bold text-slate-700">{reqLabel}</span>
                          </label>
                        ))}
                      </div>
                  </div>
                </div>
              </section>

              <div className="pt-6 flex gap-4 shrink-0">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all uppercase text-[10px] tracking-widest">Discard</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-[10px] tracking-widest">
                    {isEditingMode ? 'Save Changes' : 'Authorize Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
