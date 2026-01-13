import React, { useState } from 'react';
import { Job, JobStatus, UserProfile, UserRole } from '../types';
import { Plus, Search, Filter, Trash2, MapPin, MoreVertical, Clock, User, Mail, FileText, Phone, Briefcase, AlertCircle, Truck, RefreshCw, Minimize, Maximize, X } from 'lucide-react';
import { JobDetailModal } from './JobDetailModal';

interface JobBoardProps {
  jobs: Job[];
  onAddJob: (job: Partial<Job>) => void;
  onDeleteJob: (jobId: string) => void;
  currentUser: UserProfile;
  users: UserProfile[];
}

// Helper to get local date string YYYY-MM-DD
const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const JobBoard: React.FC<JobBoardProps> = ({ jobs, onAddJob, onDeleteJob, currentUser, users }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState('');
  const [newJob, setNewJob] = useState({ 
    id: '', 
    shipper_name: '', 
    shipper_phone: '',
    client_email: '',
    description: '', 
    priority: 'LOW' as any, 
    location: '',
    job_date: getLocalToday(),
    duration: 1
  });

  const filteredJobs = jobs.filter(j => 
    (j.title.toLowerCase().includes(filter.toLowerCase()) || 
     (j.location && j.location.toLowerCase().includes(filter.toLowerCase())) ||
     j.shipper_name.toLowerCase().includes(filter.toLowerCase())) &&
    j.status !== JobStatus.REJECTED
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.id || !newJob.shipper_name) {
      alert("Job No. and Shipper Name are required.");
      return;
    }
    onAddJob({
      ...newJob,
      title: newJob.id,
      loading_type: 'Warehouse Removal',
      job_date: newJob.job_date,
      job_time: '09:00', // Default time
      duration: newJob.duration
    });
    setShowModal(false);
    setNewJob({ id: '', shipper_name: '', shipper_phone: '', client_email: '', description: '', priority: 'LOW', location: '', job_date: getLocalToday(), duration: 1 });
  };
  
  const handleDelete = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation(); // Prevent the modal from opening
    onDeleteJob(jobId);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Simple Job Board</h2>
          <p className="text-slate-500">A quick-view of current day operations.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Request Job</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search jobs, shippers, locations..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-50 rounded-xl transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map((job) => {
          const requester = users.find(u => u.employee_id === job.requester_id);
          
          return (
            <div 
              key={job.id} 
              onClick={() => setSelectedJob(job)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden cursor-pointer"
            >
              {job.status === JobStatus.PENDING_ADD && (
                <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">
                  Awaiting Approval
                </div>
              )}
              {job.status === JobStatus.PENDING_DELETE && (
                <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">
                  Removal Requested
                </div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                  job.priority === 'HIGH' ? 'bg-red-50 text-red-600' : 
                  job.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-600'
                }`}>
                  {job.priority} Priority
                </div>
                <button 
                  onClick={(e) => handleDelete(e, job.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  disabled={job.status === JobStatus.PENDING_DELETE}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h4 className="font-bold text-slate-800 mb-1">{job.shipper_name}</h4>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Job No: {job.title}</p>
              <p className="text-sm text-slate-500 mb-6 line-clamp-2">{job.description}</p>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{job.location || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   {requester ? (
                    <img src={requester.avatar} className="w-7 h-7 rounded-full border-2 border-slate-100" alt={requester.name} />
                   ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                      {job.requester_id.substring(0, 2)}
                    </div>
                   )}
                  <span className="text-xs font-semibold text-slate-700">Req by: {requester ? requester.name : `#${job.requester_id}`}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          users={users}
        />
      )}

      {/* New Job Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b shrink-0 bg-white">
              <h3 className="text-xl font-bold text-blue-600 uppercase tracking-widest">Request New Job</h3>
              <p className="text-sm text-slate-500 font-medium">Admin approval is required for all new jobs.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <section>
                <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Core Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job No. *</label>
                    <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="e.g., AE-1234" value={newJob.id} onChange={e => setNewJob({...newJob, id: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipper Name *</label>
                    <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="e.g., John Doe" value={newJob.shipper_name} onChange={e => setNewJob({...newJob, shipper_name: e.target.value})} />
                  </div>
                   <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date *</label>
                    <input required type="date" min={new Date().toISOString().split('T')[0]} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400" value={newJob.job_date} onChange={e => setNewJob({...newJob, job_date: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Duration (Days)</label>
                    <input 
                        required 
                        type="number" 
                        min="1" 
                        max="30"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400" 
                        value={newJob.duration} 
                        onChange={e => setNewJob({...newJob, duration: parseInt(e.target.value) || 1})} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400" value={newJob.priority} onChange={e => setNewJob({...newJob, priority: e.target.value})}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
              </section>
              
              <section>
                <h4 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Additional Information</h4>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Mobile</label>
                            <input type="tel" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="+971..." value={newJob.shipper_phone} onChange={e => setNewJob({...newJob, shipper_phone: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Email</label>
                            <input type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="client@example.com" value={newJob.client_email} onChange={e => setNewJob({...newJob, client_email: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                      <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="Bay 4" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                      <textarea rows={3} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none resize-none placeholder:text-slate-400" placeholder="Additional details..." value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})}></textarea>
                    </div>
                </div>
              </section>

              <div className="flex gap-4 pt-4 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors uppercase text-[10px] tracking-widest">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};