
import React, { useState, useEffect } from 'react';
import { getUAEToday } from '../utils';
import { Job, JobStatus, UserProfile, CustomsStatus, UserRole, ImportClearanceCostSheet } from '../types';
import { 
  Plus, 
  X, 
  FileCheck, 
  User, 
  Clock, 
  AlertCircle, 
  Info, 
  ShieldCheck, 
  Edit3, 
  Calendar, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  History,
  Calculator,
  Download,
  FileText,
  Search,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { ImportCostSheetModal } from './ImportCostSheetModal';
import { generateImportCostSheetPdf } from '../utils/importCostSheetPdf';
import { supabase } from '../supabaseClient';

interface ImportClearanceProps {
  jobs: Job[];
  onAddJob: (job: Partial<Job>) => void;
  onDeleteJob: (jobId: string) => void;
  currentUser: UserProfile;
  onUpdateCustomsStatus: (jobId: string, status: CustomsStatus) => void;
  logo?: string;
}

// Helper to get UAE date string YYYY-MM-DD
const getLocalToday = () => getUAEToday();

export const ImportClearance: React.FC<ImportClearanceProps> = ({ 
  jobs, 
  onAddJob, 
  onDeleteJob, 
  currentUser, 
  onUpdateCustomsStatus,
  logo 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'tasks' | 'cost_sheets'>('tasks');
  
  // Cost Sheet State
  const [selectedCostSheetJob, setSelectedCostSheetJob] = useState<Job | null>(null);
  const [costSummaries, setCostSummaries] = useState<Record<string, { total_cost: number; net_cost: number; status: string }>>({});

  const [newActivity, setNewActivity] = useState({
    id: 'IMP-', // Job No.
    shipper_name: '',
    agent_name: '',
    bol_number: '',
    container_number: '',
    job_date: selectedDate
  });
  
  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistoryJob, setSelectedHistoryJob] = useState<Job | null>(null);
  
  // When the selectedDate changes, update the date for new activities
  useEffect(() => {
    setNewActivity(prev => ({ ...prev, job_date: selectedDate }));
  }, [selectedDate]);

  // Load cost sheet summaries from localStorage and Supabase
  const loadCostSummaries = async () => {
    const summaryMap: Record<string, { total_cost: number; net_cost: number; status: string }> = {};

    // 1. Read from localStorage cache
    jobs.filter(j => j.is_import_clearance).forEach(j => {
      try {
        const cachedSummary = localStorage.getItem(`import_cost_summary_${j.id}`);
        if (cachedSummary) {
          summaryMap[j.id] = JSON.parse(cachedSummary);
        } else {
          const cachedSheet = localStorage.getItem(`import_cost_sheet_${j.id}`);
          if (cachedSheet) {
            const parsed: ImportClearanceCostSheet = JSON.parse(cachedSheet);
            summaryMap[j.id] = {
              total_cost: parsed.total_cost || 0,
              net_cost: parsed.net_cost !== undefined ? parsed.net_cost : (parsed.total_cost - (parsed.transport_amount || 0)),
              status: parsed.status || 'Draft'
            };
          }
        }
      } catch (e) {
        console.warn('Error reading summary cache', e);
      }
    });

    // 2. Query Supabase
    try {
      const { data } = await supabase
        .from('import_clearance_cost_sheets' as any)
        .select('job_id, total_cost, net_cost, status');

      if (data && Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.job_id) {
            summaryMap[item.job_id] = {
              total_cost: item.total_cost || 0,
              net_cost: item.net_cost || 0,
              status: item.status || 'Saved'
            };
          }
        });
      }
    } catch (e) {
      console.warn('Notice loading DB cost summaries:', e);
    }

    setCostSummaries(summaryMap);
  };

  useEffect(() => {
    loadCostSummaries();
  }, [jobs]);

  // Show all clearance jobs, sorted by date
  const allClearanceJobs = jobs
    .filter(j => j.is_import_clearance)
    .filter(j => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        j.id.toLowerCase().includes(q) ||
        j.shipper_name?.toLowerCase().includes(q) ||
        j.agent_name?.toLowerCase().includes(q) ||
        j.bol_number?.toLowerCase().includes(q) ||
        j.container_number?.toLowerCase().includes(q)
      );
    })
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
    setNewActivity({ id: 'IMP-', shipper_name: '', agent_name: '', bol_number: '', container_number: '', job_date: selectedDate });
  };
  
  const generateUniqueId = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const suffix = new Date().getFullYear().toString().slice(-2);
    setNewActivity(prev => ({ ...prev, id: `IMP-${random}-${suffix}` }));
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

  const getStatusColor = (status: CustomsStatus | undefined) => {
    switch (status) {
      case CustomsStatus.CLEARED: return 'bg-emerald-100 text-emerald-800';
      case CustomsStatus.REJECTED_CUSTOMS: return 'bg-rose-100 text-rose-800';
      case CustomsStatus.SUBMITTED:
      case CustomsStatus.IN_REVIEW: return 'bg-blue-100 text-blue-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  // Check if user has permission to update status (Admin OR User with importClearance permission)
  const canUpdateStatus = currentUser.role === UserRole.ADMIN || currentUser.permissions.importClearance;

  // Direct 1-click Quick Download of PDF from card
  const handleQuickDownloadPdf = (activity: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      let sheetData: ImportClearanceCostSheet | null = null;
      const cached = localStorage.getItem(`import_cost_sheet_${activity.id}`);
      if (cached) {
        sheetData = JSON.parse(cached);
      }

      if (!sheetData) {
        // Fallback default sheet for this job
        sheetData = {
          id: `ICS-${activity.id}`,
          job_id: activity.id,
          job_no: activity.id.replace(/^IMP-/, ''),
          date: activity.job_date || new Date().toISOString().split('T')[0],
          consignee: activity.shipper_name || '',
          bl_no: activity.bol_number || '',
          awb: activity.bol_number || '',
          cont_no: activity.container_number || 'AIR',
          volume_weight: activity.volume_cbm ? `${activity.volume_cbm} CBM` : '89 KGS',
          items: [],
          transport_amount: 0,
          total_cost: 0,
          net_cost: 0,
          total_invoice: 0,
          signature_name: currentUser.name,
          status: 'Draft',
          created_at: Date.now(),
          updated_at: Date.now()
        };
      }

      const doc = generateImportCostSheetPdf({ sheet: sheetData, logo });
      doc.save(`Import_Cost_Sheet_${sheetData.job_no || activity.id}_${sheetData.date}.pdf`);
    } catch (err) {
      console.error('Quick download failed', err);
      // If error, open the modal instead
      setSelectedCostSheetJob(activity);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-indigo-600" />
            Import Clearance Hub
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Regulatory customs clearance, documentation & Writer import cost sheets
          </p>
        </div>

        {/* View Switcher & Capacity Stats */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setActiveView('tasks')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeView === 'tasks' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Clearance Tasks</span>
            </button>
            <button
              onClick={() => setActiveView('cost_sheets')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeView === 'cost_sheets' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Cost Sheets Registry</span>
            </button>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 p-4 px-6 rounded-2xl border border-slate-100">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Capacity for {new Date(selectedDate).toLocaleDateString()}
              </p>
              <p className="text-xl font-black text-slate-800">{slotsRemaining} Units Remaining</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              <div className={`w-3 h-3 rounded-full ${slotsRemaining > 0 ? 'bg-indigo-500 animate-pulse' : 'bg-rose-500'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Target Date Picker */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <label htmlFor="import-date-picker" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
              Target Date for New Tasks
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
                        id="import-date-picker"
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

          {/* Action Button */}
          <div className="space-y-3">
            <button 
              disabled={slotsRemaining <= 0}
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white p-5 rounded-3xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase text-xs tracking-widest"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              New Clearance Task
            </button>
          </div>

          {/* Quick Search */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Search Pipeline</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search manifest, client, AWB..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Compliance Card */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex gap-3 text-slate-600 mb-3">
              <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-600" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-700">Cost Sheet Compliance</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Every import clearance record supports standard 23-line item cost assessment, TR.PORT deduction, and downloadable PDF matching Writer Relocations specifications.
            </p>
          </div>
        </div>

        {/* Right Side: Task Cards or Cost Sheets Table */}
        <div className="lg:col-span-3 space-y-4">
          
          {activeView === 'tasks' ? (
            /* --- Clearance Task Cards --- */
            allClearanceJobs.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-24 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <FileCheck className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-400">No clearance tasks found</h3>
                <p className="text-xs text-slate-400 mt-1">Initiate a new import task to get started</p>
              </div>
            ) : (
              allClearanceJobs.map((activity) => {
                const summary = costSummaries[activity.id];
                const hasCostSheet = summary && summary.total_cost > 0;

                return (
                  <div 
                    key={activity.id} 
                    className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start justify-between gap-6 group hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          <Calendar className="w-3 h-3" />
                          {new Date(`${activity.job_date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                        </span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                          IMP {activity.id}
                        </span>
                        
                        {/* Cost Sheet Badge */}
                        {hasCostSheet ? (
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full uppercase border border-emerald-200 flex items-center gap-1 shadow-xs">
                            <DollarSign className="w-3 h-3 text-emerald-600" />
                            Cost: AED {summary.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-full uppercase border border-slate-200">
                            No Cost Sheet
                          </span>
                        )}

                        {activity.status === JobStatus.PENDING_ADD && (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full uppercase border border-amber-100">
                            Pending System Auth
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-xl text-slate-800 tracking-tight">{activity.shipper_name}</h4>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        SD Name: {activity.agent_name || 'N/A'}
                      </p>
                      
                      <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium">
                        <div className="px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="font-bold text-slate-400 text-[11px]">BOL / AWB:</span>{' '}
                          <span className="text-slate-800 font-bold font-mono">{activity.bol_number || 'TBA'}</span>
                        </div>
                        <div className="px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="font-bold text-slate-400 text-[11px]">Cont / Flight:</span>{' '}
                          <span className="text-slate-800 font-bold">{activity.container_number || 'TBA'}</span>
                        </div>
                        {activity.volume_cbm && (
                          <div className="px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="font-bold text-slate-400 text-[11px]">Vol:</span>{' '}
                            <span className="text-slate-800 font-bold">{activity.volume_cbm} CBM</span>
                          </div>
                        )}
                      </div>

                      {/* Cost Sheet Action Bar */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCostSheetJob(activity)}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all flex items-center gap-2 border border-indigo-200 cursor-pointer shadow-xs"
                        >
                          <Calculator className="w-4 h-4 text-indigo-600" />
                          <span>{hasCostSheet ? 'Edit Cost Sheet' : '+ Create Cost Sheet'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleQuickDownloadPdf(activity, e)}
                          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>PDF</span>
                        </button>
                      </div>

                      {activity.last_edited_by && (
                        <div className="mt-3 text-[10px] text-slate-400 font-medium tracking-wide">
                          Last edited by {activity.last_edited_by} on {new Date(activity.last_edited_at || 0).toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    {/* Status & Menu Controls */}
                    <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                      <div className="w-full sm:w-48">
                        <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                          Customs Status
                        </label>
                        <select
                          value={activity.customs_status || ''}
                          onChange={(e) => onUpdateCustomsStatus(activity.id, e.target.value as CustomsStatus)}
                          disabled={!canUpdateStatus}
                          className={`w-full p-2.5 rounded-xl text-xs font-bold border-2 transition-all ${getStatusColor(activity.customs_status)} ${canUpdateStatus ? 'cursor-pointer shadow-xs' : 'cursor-not-allowed appearance-none'}`}
                        >
                          {Object.values(CustomsStatus).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 self-end">
                        <button 
                          onClick={() => { setSelectedHistoryJob(activity); setHistoryModalOpen(true); }}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="View Status History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteJob(activity.id)}
                          className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Job"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* --- Cost Sheets Registry Table View --- */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-400" />
                    <span>Import Clearance Cost Sheets Registry</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Centralized cost statements, TR.PORT deductions, and PDF exports
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                      <th className="p-4">Job / Manifest</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Consignee</th>
                      <th className="p-4">AWB / BL</th>
                      <th className="p-4 text-right">Total Cost</th>
                      <th className="p-4 text-right">Net Cost (Excl. TR)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {allClearanceJobs.map((activity) => {
                      const summary = costSummaries[activity.id];
                      const totalCost = summary ? summary.total_cost : 0;
                      const netCost = summary ? summary.net_cost : 0;
                      const status = summary ? summary.status : 'Pending';

                      return (
                        <tr key={activity.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-black text-indigo-600">
                            {activity.id}
                          </td>
                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            {new Date(`${activity.job_date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                          </td>
                          <td className="p-4 font-bold text-slate-900 max-w-[200px] truncate" title={activity.shipper_name}>
                            {activity.shipper_name}
                          </td>
                          <td className="p-4 font-mono text-slate-600">
                            {activity.bol_number || '—'}
                          </td>
                          <td className="p-4 text-right font-black font-mono text-slate-900">
                            AED {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-right font-black font-mono text-amber-700 bg-amber-50/50">
                            AED {netCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border ${
                              status === 'Finalized'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : status === 'Saved'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedCostSheetJob(activity)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-all"
                              >
                                Edit Sheet
                              </button>
                              <button
                                onClick={(e) => handleQuickDownloadPdf(activity, e)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* New Activity Modal */}
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
                  <div className="relative">
                      <input required type="text" className="w-full px-5 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.id} onChange={e => setNewActivity({...newActivity, id: e.target.value})} placeholder="e.g. IMP-DXB-9922" />
                      <button 
                          type="button" 
                          onClick={generateUniqueId}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Generate Unique ID"
                      >
                          <RefreshCw className="w-4 h-4" />
                      </button>
                  </div>
                </div>
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">SD Name</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.agent_name} onChange={e => setNewActivity({...newActivity, agent_name: e.target.value})} placeholder="e.g. Swift Logistics" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipper / Consignee *</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.shipper_name} onChange={e => setNewActivity({...newActivity, shipper_name: e.target.value})} placeholder="e.g. Acme Import Group" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">BOL Or AWB</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={newActivity.bol_number} onChange={e => setNewActivity({...newActivity, bol_number: e.target.value})} />
                </div>
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Container No. Or Flight No.</label>
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

      {/* Cost Sheet Modal */}
      {selectedCostSheetJob && (
        <ImportCostSheetModal
          job={selectedCostSheetJob}
          currentUser={currentUser}
          logo={logo}
          onClose={() => setSelectedCostSheetJob(null)}
          onSaved={(sheet) => {
            setCostSummaries(prev => ({
              ...prev,
              [sheet.job_id]: {
                total_cost: sheet.total_cost,
                net_cost: sheet.net_cost,
                status: sheet.status || 'Saved'
              }
            }));
          }}
        />
      )}

      {/* History Modal */}
      {historyModalOpen && selectedHistoryJob && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">Status History</h3>
                   <p className="text-xs text-slate-500 font-medium">Job: {selectedHistoryJob.id}</p>
                 </div>
                 <button onClick={() => setHistoryModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                 {selectedHistoryJob.customs_history && selectedHistoryJob.customs_history.length > 0 ? (
                    <div className="space-y-6 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-slate-200"></div>
                        
                        {[...selectedHistoryJob.customs_history].reverse().map((entry, idx) => (
                            <div key={idx} className="relative pl-10">
                                <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center z-10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getStatusColor(entry.status as CustomsStatus)}`}>
                                            {entry.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(entry.updated_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-medium mt-2">
                                        Updated by: <span className="font-bold text-slate-800">{entry.updated_by}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <History className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No history available</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
