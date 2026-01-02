import React, { useState, useEffect } from 'react';
import { Job, JobStatus, UserProfile, CustomsStatus, UserRole } from '../types';
import { Plus, X, FileCheck, User, Clock, AlertCircle, Info, ShieldCheck, Edit3, Calendar, Download } from 'lucide-react';

interface ImportClearanceProps {
  jobs: Job[];
  onAddJob: (job: Partial<Job>) => void;
  onDeleteJob: (jobId: string) => void;
  currentUser: UserProfile;
  onUpdateCustomsStatus: (jobId: string, status: CustomsStatus) => void;
}

// Helper functions for CSV export
const convertToCSV = (data: any[], headers: string[]) => {
  const headerRow = headers.join(',');
  const rows = data.map(obj => {
      return headers.map(header => {
          let value = obj[header as keyof typeof obj] ?? '';
          if (typeof value === 'string' && value.includes(',')) {
              value = `"${value}"`;
          }
          return value;
      }).join(',');
  });
  return [headerRow, ...rows].join('\n');
};

const downloadCSV = (csvString: string, filename: string) => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


export const ImportClearance: React.FC<ImportClearanceProps> = ({ jobs, onAddJob, onDeleteJob, currentUser, onUpdateCustomsStatus }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newActivity, setNewActivity] = useState({
    id: '', // Job No.
    shipper_name: '',
    agent_name: '',
    bol_number: '',
    container_number: '',
    job_date: selectedDate
  });
  
  // When the selectedDate changes, update the date for new activities
  useEffect(() => {
    setNewActivity(prev => ({ ...prev, job_date: selectedDate }));
  }, [selectedDate]);

  // Show all clearance jobs, sorted by date
  const allClearanceJobs = jobs
    .filter(j => j.is_import_clearance)
    .sort((a, b) => new Date(b.job_date).getTime() - new Date(a.job_date).getTime() || b.created_at - a.created_at);

  // Calculate slots remaining only for the selected date
  const clearanceJobsForSelectedDate = jobs.filter(j => j.is_import_clearance && j.job_date === selectedDate);
  const slotsRemaining = 5 - clearanceJobsForSelectedDate.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slotsRemaining <= 0) {
      alert(`Maximum of 5 import clearance jobs reached for ${selectedDate}.`);
      return;
    }
    onAddJob({
      ...newActivity,
      title: newActivity.id,
      is_import_clearance: true,
      job_date: selectedDate, // Ensure new job uses the selected date
      loading_type: 'Direct Loading',
      priority: 'HIGH',
      customs_status: CustomsStatus.PENDING_DOCUMENTATION,
      special_requests: {
        handyman: false, manpower: false, overtime: false,
        documents: true, packingList: true, crateCertificate: false, walkThrough: false
      }
    });
    setShowModal(false);
    setNewActivity({ id: '', shipper_name: '', agent_name: '', bol_number: '', container_number: '', job_date: selectedDate });
  };
  
  const getStatusColor = (status: CustomsStatus | undefined) => {
    switch (status) {
      case CustomsStatus.CLEARED: return 'bg-emerald-100 text-emerald-800';
      case CustomsStatus.REJECTED_CUSTOMS: return 'bg-rose-100 text-rose-800';
      case CustomsStatus.SUBMITTED:
      case CustomsStatus.IN_REVIEW: return 'bg-blue-100 text-blue-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  const handleExport = () => {
    if (allClearanceJobs.length === 0) {
      alert("No clearance data to export.");
      return;
    }
    const headers = ['job_id', 'shipper_name', 'agent_name', 'bol_number', 'container_number', 'job_date', 'customs_status'];
    const dataToExport = allClearanceJobs.map(job => ({
      job_id: job.id,
      shipper_name: job.shipper_name,
      agent_name: job.agent_name || 'N/A',
      bol_number: job.bol_number || 'N/A',
      container_number: job.container_number || 'N/A',
      job_date: job.job_date,
      customs_status: job.customs_status || 'N/A'
    }));
    const csv = convertToCSV(dataToExport, headers);
    downloadCSV(csv, 'import-clearance-report.csv');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-indigo-600" />
            Import Clearance Hub
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Regulatory clearance and documentation pipeline</p>
        </div>
        
        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capacity for {new Date(selectedDate).toLocaleDateString()}</p>
            <p className="text-2xl font-black text-slate-800">{slotsRemaining} Units Remaining</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <div className={`w-3 h-3 rounded-full ${slotsRemaining > 0 ? 'bg-indigo-500 animate-pulse' : 'bg-rose-500'}`}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <label htmlFor="import-date-picker" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Target Date for New Tasks</label>
            <div className="relative">
                <div className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                    <span>
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                    id="import-date-picker"
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
          </div>

          <div className="space-y-3">
            <button 
              disabled={slotsRemaining <= 0}
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white p-5 rounded-3xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase text-xs tracking-widest"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              New Clearance Task
            </button>
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-600 border border-slate-200 p-4 rounded-3xl font-bold hover:bg-slate-50 transition-all uppercase text-xs tracking-widest"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex gap-3 text-slate-600 mb-3">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-widest">Compliance Rule</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Daily import clearance is capped at 5 specialized units to maintain meticulous documentation standards.
            </p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {allClearanceJobs.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-32 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <FileCheck className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-400">No clearance tasks found</h3>
            </div>
          ) : (
            allClearanceJobs.map((activity) => (
              <div key={activity.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start justify-between gap-8 group hover:border-indigo-200 transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="flex items-center gap-2 text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                      <Calendar className="w-3 h-3" />
                      {new Date(activity.job_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">IMP {activity.id}</span>
                    {activity.status === JobStatus.PENDING_ADD && (
                       <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full uppercase border border-amber-100">Pending System Auth</span>
                    )}
                  </div>
                  <h4 className="font-bold text-xl text-slate-800">{activity.shipper_name}</h4>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Agent: {activity.agent_name || 'N/A'}</p>
                  
                  <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium">
                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="font-bold text-slate-400">BOL:</span> <span className="text-slate-700 font-bold">{activity.bol_number || 'TBA'}</span>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="font-bold text-slate-400">Container:</span> <span className="text-slate-700 font-bold">{activity.container_number || 'TBA'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-400 font-bold">Customs Status</label>
                    <select
                      value={activity.customs_status || ''}
                      onChange={(e) => onUpdateCustomsStatus(activity.id, e.target.value as CustomsStatus)}
                      disabled={currentUser.role !== UserRole.ADMIN}
                      className={`w-full p-2 rounded-lg text-xs font-bold border-2 transition-all ${getStatusColor(activity.customs_status)} ${currentUser.role === UserRole.ADMIN ? 'cursor-pointer' : 'cursor-not-allowed appearance-none'}`}
                    >
                      {Object.values(CustomsStatus).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => onDeleteJob(activity.id)}
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 border-b bg-white flex justify-between items-center rounded-t-3xl">
              <div>
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest text-indigo-600">Import Documentation</h3>
                <p className="text-sm text-slate-400 font-medium">Filing for {selectedDate}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Manifest / Job No. *</label>
                  <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.id} onChange={e => setNewActivity({...newActivity, id: e.target.value})} placeholder="e.g. IMP-DXB-9922" />
                </div>
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Agent Name</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.agent_name} onChange={e => setNewActivity({...newActivity, agent_name: e.target.value})} placeholder="e.g. Swift Logistics" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipper / Consignee *</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.shipper_name} onChange={e => setNewActivity({...newActivity, shipper_name: e.target.value})} placeholder="e.g. Acme Import Group" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bill of Lading (BOL) No.</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.bol_number} onChange={e => setNewActivity({...newActivity, bol_number: e.target.value})} />
                </div>
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Container No.</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.container_number} onChange={e => setNewActivity({...newActivity, container_number: e.target.value})} />
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                <AlertCircle className="w-6 h-6 text-indigo-500 shrink-0" />
                <p className="text-xs font-bold text-indigo-700 leading-snug">Registration will be queued for system authorization. Maximum daily slots are restricted.</p>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest">Discard</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest">Initiate Clearance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};