import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Plus, Search, Calendar, MapPin, User, 
  Clock, Mail, Hash, Briefcase, Filter, ChevronRight, 
  Edit3, Trash2, X, CheckCircle2, ChevronDown, Info, XCircle, AlertCircle,
  MoreVertical, ArrowUpRight, Check, History, List, LayoutGrid
} from 'lucide-react';
import { Survey, SurveyStatus, SurveyType, SurveyMode, UserProfile } from '../types';

interface SurveyTrackerProps {
  surveys: Survey[];
  onAddSurvey: (survey: Omit<Survey, 'id' | 'created_at' | 'created_by_id'>) => void;
  onUpdateSurvey: (survey: Survey) => void;
  onDeleteSurvey: (id: string) => void;
  currentUser: UserProfile;
}

const ASSIGNABLE_SURVEYORS = [
  { id: 'OPS-101', name: 'Roxanne' },
  { id: 'OPS-102', name: 'Poonam' },
  { id: 'OPS-103', name: 'Divya' },
  { id: 'OPS-204', name: 'Allen' },
  { id: 'OPS-205', name: 'Daryl' }
];

export const SurveyTracker: React.FC<SurveyTrackerProps> = ({ 
  surveys, 
  onAddSurvey, 
  onUpdateSurvey, 
  onDeleteSurvey, 
  currentUser 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'All'>('All');
  const [modeFilter, setModeFilter] = useState<'All' | SurveyMode>('All');
  const [surveyorFilter, setSurveyorFilter] = useState<string>('All');
  const [viewType, setViewType] = useState<'list' | 'grid'>('list');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const uniqueSurveyorNames = Array.from(
    new Map(
      [
        ...surveys.map(s => s.surveyor_name),
        ...surveys.map(s => s.last_edited_by),
        ...ASSIGNABLE_SURVEYORS.map(s => s.name),
        currentUser.name
      ]
        .filter(Boolean)
        .map(name => [name!.trim().toLowerCase(), name!.trim()])
    ).values()
  ).sort((a, b) => a.localeCompare(b));

  const [bannerStartDate, setBannerStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [bannerEndDate, setBannerEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [bannerModeFilter, setBannerModeFilter] = useState<'All' | SurveyMode>('All');

  const isAssigner = currentUser.role === 'ADMIN' || 
    currentUser.employee_id === 'OPS-104' || 
    currentUser.employee_id === 'MAR-001' || 
    currentUser.name === 'Param' || 
    currentUser.name === 'Maria';

  const getSurveyorStats = (name: string) => {
    const filtered = surveys.filter(s => {
      const surveyorMatch = s.surveyor_name.toLowerCase() === name.toLowerCase();
      if (!surveyorMatch) return false;
      
      const sDate = s.survey_date;
      const matchesStart = bannerStartDate ? sDate >= bannerStartDate : true;
      const matchesEnd = bannerEndDate ? sDate <= bannerEndDate : true;
      const matchesMode = bannerModeFilter === 'All' || s.mode === bannerModeFilter;
      
      return matchesStart && matchesEnd && matchesMode;
    });

    const bookedCount = filtered.filter(s => s.status === SurveyStatus.BOOKED).length;
    const pendingCount = filtered.filter(s => s.status === SurveyStatus.PENDING).length;
    const lostCount = filtered.filter(s => s.status === SurveyStatus.LOST).length;
    const totalCount = filtered.length;

    return {
      booked: bookedCount,
      pending: pendingCount,
      lost: lostCount,
      total: totalCount
    };
  };

  const [formData, setFormData] = useState({
    surveyor_name: currentUser.name,
    survey_type: 'Physical' as SurveyType,
    enquiry_number: '',
    job_number: '',
    shipper_name: '',
    location: '',
    mode: 'Export' as SurveyMode,
    status: SurveyStatus.PENDING,
    survey_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    client_emails: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync surveyor name to current user if not editing or if specific rules apply
  useEffect(() => {
    if (!editingSurvey && !isSubmitting) {
      setFormData(prev => ({ ...prev, surveyor_name: currentUser.name }));
    }
  }, [currentUser.name, editingSurvey, isSubmitting]);

  const resetForm = () => {
    setFormData({
      surveyor_name: currentUser.name,
      survey_type: 'Physical',
      enquiry_number: '',
      job_number: '',
      shipper_name: '',
      location: '',
      mode: 'Export',
      status: SurveyStatus.PENDING,
      survey_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '10:00',
      client_emails: ''
    });
    setEditingSurvey(null);
    setIsSubmitting(false);
  };

  const handleEdit = (survey: Survey) => {
    setEditingSurvey(survey);
    setFormData({
      surveyor_name: survey.surveyor_name,
      survey_type: survey.survey_type,
      enquiry_number: survey.enquiry_number,
      job_number: survey.job_number || '',
      shipper_name: survey.shipper_name,
      location: survey.location,
      mode: survey.mode,
      status: survey.status,
      survey_date: survey.survey_date,
      start_time: survey.start_time || '09:00',
      end_time: survey.end_time || '10:00',
      client_emails: survey.client_emails?.join(', ') || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    
    setDeletingId(id);
    try {
      console.log('Force deleting survey with ID:', id);
      await onDeleteSurvey(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error('CRITICAL: Delete failed:', err);
      alert(`Delete Failed: ${err.message || 'Verification Error'}. The system could not remove this entry. Please try refreshing.`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const emails = formData.client_emails.split(',').map(e => e.trim()).filter(e => e);
    
    try {
      if (editingSurvey) {
        await onUpdateSurvey({
          ...editingSurvey,
          ...formData,
          client_emails: emails,
          last_edited_by: currentUser.name,
          last_edited_at: Date.now()
        });
      } else {
        await onAddSurvey({
          ...formData,
          client_emails: emails,
          last_edited_by: currentUser.name,
          last_edited_at: Date.now()
        });
      }
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error submitting survey:', err);
      alert('Failed to save survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSurveys = surveys.filter(s => {
    const matchesSearch = 
      s.shipper_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.enquiry_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesMode = modeFilter === 'All' || s.mode === modeFilter;
    const matchesSurveyor = surveyorFilter === 'All' || 
      s.surveyor_name.toLowerCase() === surveyorFilter.toLowerCase() ||
      (s.last_edited_by && s.last_edited_by.toLowerCase() === surveyorFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesMode && matchesSurveyor;
  });

  const handleStatusChange = async (survey: Survey, newStatus: SurveyStatus) => {
    try {
      await onUpdateSurvey({
        ...survey,
        status: newStatus,
        last_edited_by: currentUser.name,
        last_edited_at: Date.now()
      });
    } catch (err) {
      console.error('Status update error:', err);
      alert('Failed to update status.');
    }
  };

  const handleAssigneeChange = async (survey: Survey, newSurveyorName: string) => {
    try {
      await onUpdateSurvey({
        ...survey,
        surveyor_name: newSurveyorName,
        last_edited_by: currentUser.name,
        last_edited_at: Date.now()
      });
    } catch (err) {
      console.error('Assignee update error:', err);
      alert('Failed to update surveyor.');
    }
  };

  const getStatusDisplay = (status: SurveyStatus) => {
    switch (status) {
      case SurveyStatus.BOOKED: return { label: 'Booked', icon: CheckCircle2, colors: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100/50' };
      case SurveyStatus.PENDING: return { label: 'Pending', icon: Clock, colors: 'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-100/50' };
      case SurveyStatus.LOST: return { label: 'Lost', icon: XCircle, colors: 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100/50' };
      default: return { label: String(status || 'Unknown'), icon: AlertCircle, colors: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-8 h-8 text-indigo-600" />
            Survey Tracker
          </h1>
          <p className="text-slate-500 mt-1">Manage and track survey bookings</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          Book Survey
        </button>
      </div>

      {/* Allocation Summary Banner */}
      <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100/60 rounded-[2rem] p-6 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600 animate-pulse" />
              Surveyor Allocation Summary
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Assigned Booked Moves per surveyor within selected date range
            </p>
          </div>

          {/* Filters (Mode Filter & Date Picker Range) */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Mode Filter for Banner Numbers */}
            <div className="flex items-center gap-1 bg-white/80 p-1 rounded-2xl border border-indigo-100/40 shadow-inner">
              {(['All', 'Export', 'Domestic', 'Import', 'Storage'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBannerModeFilter(mode)}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-[800] tracking-tight transition-all uppercase ${
                    bannerModeFilter === mode
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-55'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Date Picker Range */}
            <div className="flex flex-wrap items-center gap-3 bg-white/80 p-2 rounded-2xl border border-indigo-100/40 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pl-1">From</span>
                <input
                  type="date"
                  className="bg-transparent hover:bg-slate-50 border-0 text-xs font-black text-slate-700 px-2 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer"
                  value={bannerStartDate}
                  onChange={(e) => setBannerStartDate(e.target.value)}
                />
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">To</span>
                <input
                  type="date"
                  className="bg-transparent hover:bg-slate-50 border-0 text-xs font-black text-slate-700 px-2 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer"
                  value={bannerEndDate}
                  onChange={(e) => setBannerEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Surveyor Count Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-5">
          {ASSIGNABLE_SURVEYORS.map((surveyor, idx) => {
            const stats = getSurveyorStats(surveyor.name);
            const gradients = [
              'from-purple-50 to-purple-100/40 border-purple-100 text-purple-700',
              'from-rose-50 to-rose-100/40 border-rose-100 text-rose-700',
              'from-emerald-50 to-emerald-100/40 border-emerald-100 text-emerald-700',
              'from-blue-50 to-blue-100/40 border-blue-100 text-blue-700',
              'from-amber-50 to-amber-100/40 border-amber-100 text-amber-700'
            ];
            const badgeColors = [
              'bg-purple-600 text-white shadow-purple-100',
              'bg-rose-600 text-white shadow-rose-100',
              'bg-emerald-600 text-white shadow-emerald-100',
              'bg-blue-600 text-white shadow-blue-100',
              'bg-amber-600 text-white shadow-amber-100'
            ];
            const borderColors = [
              'group-hover:border-purple-300',
              'group-hover:border-rose-300',
              'group-hover:border-emerald-300',
              'group-hover:border-blue-300',
              'group-hover:border-amber-300'
            ];
            const grad = gradients[idx % gradients.length];
            const badge = badgeColors[idx % badgeColors.length];
            const borderCol = borderColors[idx % borderColors.length];
            
            return (
              <div 
                key={surveyor.id}
                className={`group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br ${grad} border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-50 ${borderCol}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${badge} shadow-md`}>
                    {surveyor.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800 tracking-tight group-hover:text-indigo-950 transition-colors">
                      {surveyor.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      ID: {surveyor.id}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-[900] tracking-tight text-slate-900 group-hover:scale-105 transition-transform flex items-center justify-end gap-1">
                    <span>{stats.booked}</span>
                    <span className="text-[10px] font-extrabold text-slate-400">assigned</span>
                  </div>
                  {stats.pending > 0 && (
                    <div className="text-[9px] font-bold text-slate-400">
                      {stats.pending} pending
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search bookings..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-medium text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Surveyor Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 px-2">Surveyor</span>
            <select
              value={surveyorFilter}
              onChange={(e) => setSurveyorFilter(e.target.value)}
              className="bg-transparent hover:bg-white text-xs font-bold text-slate-700 px-2 py-1 rounded-xl outline-none border-0 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer whitespace-nowrap"
            >
              <option value="All">All Surveyors</option>
              {uniqueSurveyorNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 px-2">Mode</span>
            {(['All', 'Export', 'Domestic', 'Import', 'Storage'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setModeFilter(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  modeFilter === mode
                    ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 px-2">Status</span>
            {['All', ...Object.values(SurveyStatus)].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === status 
                  ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => setViewType('list')}
              title="List View"
              className={`p-1.5 rounded-xl transition-all ${
                viewType === 'list'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewType('grid')}
              title="Grid View"
              className={`p-1.5 rounded-xl transition-all ${
                viewType === 'grid'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Survey List or Cards Container */}
      {viewType === 'list' ? (
        <div className="space-y-4">
          {filteredSurveys.map((survey) => {
            const statusConfig = getStatusDisplay(survey.status);
            const canManage = currentUser.role === 'ADMIN' || survey.created_by_id === currentUser.id;

            return (
              <div 
                key={survey.id} 
                className="group relative bg-white border border-slate-100 rounded-[1.5rem] p-5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left Section: Status, Enquiry Number, Job Number & Shipper details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="flex flex-col gap-1.5 min-w-[150px] shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-black text-indigo-700 bg-indigo-50/70 border border-indigo-100/50 px-2 py-0.5 rounded-md tracking-tighter uppercase">
                        {survey.enquiry_number}
                      </span>
                      {survey.job_number && (
                        <span className="font-mono text-[10px] font-black text-emerald-700 bg-emerald-50/70 border border-emerald-100/50 px-2 py-0.5 rounded-md tracking-tighter">
                          {survey.job_number}
                        </span>
                      )}
                    </div>
                    <div className="relative group/status self-start">
                      <select
                        value={survey.status}
                        onChange={(e) => handleStatusChange(survey, e.target.value as SurveyStatus)}
                        className={`appearance-none inline-flex items-center gap-1 px-3 py-1 pr-7 rounded-full text-[10px] font-black border shadow-sm transition-all cursor-pointer ${statusConfig.colors}`}
                        style={{ 
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', 
                          backgroundRepeat: 'no-repeat', 
                          backgroundPosition: 'right 0.65rem center', 
                          backgroundSize: '0.7rem' 
                        }}
                      >
                        {Object.values(SurveyStatus).map((s) => (
                          <option key={s} value={s} className="bg-white text-slate-900 font-sans">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {survey.shipper_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-slate-500 font-bold text-[11px]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{survey.location}</span>
                      </span>
                      <span className="text-slate-200">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="whitespace-nowrap">{new Date(survey.survey_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </span>
                      <span className="text-slate-200">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="whitespace-nowrap">{survey.start_time} - {survey.end_time}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right/Middle Section: Assignee Selector / Badge & Metadata */}
                <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between lg:justify-end">
                  <div className="flex items-center gap-3 min-w-[200px] shrink-0">
                    {isAssigner && survey.status === SurveyStatus.BOOKED ? (
                      <div className="w-full relative group/alloc">
                        <select
                          className="w-full pl-8 pr-7 py-2 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer appearance-none shadow-sm"
                          value={survey.surveyor_name}
                          onChange={(e) => handleAssigneeChange(survey, e.target.value)}
                        >
                          <option value={currentUser.name}>My Responsibility</option>
                          {ASSIGNABLE_SURVEYORS.map(s => (
                            <option key={s.id} value={s.name}>{s.name} ({s.id})</option>
                          ))}
                        </select>
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-xs font-black border border-indigo-150">
                          {survey.surveyor_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 leading-none">{survey.surveyor_name}</span>
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5">Assigned Surveyor</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mode & Type Badges */}
                  <div className="flex flex-col items-start lg:items-end gap-1 text-[10px] font-bold text-slate-400 shrink-0 min-w-[80px]">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-md font-black uppercase text-[9px] tracking-wider leading-none">
                      {survey.survey_type}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-500 rounded-md font-black uppercase text-[9px] tracking-wider leading-none">
                      {survey.mode}
                    </span>
                  </div>

                  {/* Actions Section */}
                  <div className="flex items-center gap-1 pl-4 border-l border-slate-100 h-8">
                    {canManage && (
                      <>
                        <button 
                          onClick={() => handleEdit(survey)}
                          className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Edit Entry"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        {confirmDeleteId === survey.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-3 duration-250">
                            <button
                              onClick={() => handleDelete(survey.id)}
                              disabled={deletingId === survey.id}
                              className="px-2.5 py-1.5 bg-rose-500 text-white text-[9px] font-black rounded-lg hover:bg-rose-600 transition-all shadow-md active:scale-95 whitespace-nowrap"
                            >
                              {deletingId === survey.id ? '...' : 'YES'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(survey.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredSurveys.length === 0 && (
            <div className="py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-slate-200" />
              </div>
              <p className="font-bold text-slate-900">No records found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredSurveys.map((survey) => {
            const statusConfig = getStatusDisplay(survey.status);
            const canManage = currentUser.role === 'ADMIN' || survey.created_by_id === currentUser.id;

            return (
              <div 
                key={survey.id} 
                className="group relative bg-white border border-slate-100 rounded-[2rem] p-7 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/30 transition-all duration-500 flex flex-col h-full"
              >
                {/* Header Status & Actions */}
                <div className="flex items-start justify-between mb-6 shrink-0">
                  <div className="flex flex-wrap gap-2.5">
                    <div className="relative flex-shrink-0 group/status">
                      <select
                        value={survey.status}
                        onChange={(e) => handleStatusChange(survey, e.target.value as SurveyStatus)}
                        className={`appearance-none inline-flex items-center gap-1.5 px-4 py-1.5 pr-9 rounded-full text-[11px] font-extrabold border shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 ${statusConfig.colors}`}
                        style={{ 
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', 
                          backgroundRepeat: 'no-repeat', 
                          backgroundPosition: 'right 0.85rem center', 
                          backgroundSize: '0.8rem' 
                        }}
                      >
                        {Object.values(SurveyStatus).map((s) => (
                          <option key={s} value={s} className="bg-white text-slate-900 font-sans">{s}</option>
                        ))}
                      </select>
                    </div>
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-black bg-white text-slate-400 border border-slate-100 uppercase tracking-[0.15em] shadow-sm">
                      {survey.mode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canManage && (
                      <>
                        <button 
                          onClick={() => handleEdit(survey)}
                          className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all duration-300"
                          title="Edit Entry"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        
                        {confirmDeleteId === survey.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <button
                              onClick={() => handleDelete(survey.id)}
                              disabled={deletingId === survey.id}
                              className="px-3.5 py-2 bg-rose-500 text-white text-[10px] font-black rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 active:scale-90"
                            >
                              {deletingId === survey.id ? 'Deleting...' : 'YES'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(survey.id)}
                            className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all duration-300 group-hover:text-slate-400"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Main Info */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                      <Hash className="w-3 h-3 text-indigo-400" />
                      <span className="font-mono text-[11px] font-black text-indigo-700 tracking-tighter uppercase">
                        {survey.enquiry_number}
                      </span>
                    </div>
                    {survey.job_number && (
                      <div className="flex items-center gap-1.5 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100/50">
                        <Briefcase className="w-3 h-3 text-emerald-400" />
                        <span className="font-mono text-[11px] font-black text-emerald-700 tracking-tighter">
                          {survey.job_number}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-[900] text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 tracking-tight leading-[1.1]">
                    {survey.shipper_name}
                  </h3>
                </div>

                {/* Detail Grid */}
                <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50/50 group-hover:bg-indigo-50/30 rounded-[2rem] border border-slate-100 group-hover:border-indigo-100/50 mb-6 transition-all duration-500">
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-50">
                        <Calendar className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Date</span>
                        <span className="text-xs font-black text-slate-700 whitespace-nowrap">
                          {new Date(survey.survey_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-50">
                        <Clock className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Time</span>
                        <span className="text-xs font-black text-slate-700 whitespace-nowrap">{survey.start_time} - {survey.end_time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3.5 border-l border-slate-200/40 pl-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-50">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Lead</span>
                        <span className="text-xs font-black text-slate-700 truncate" title={survey.surveyor_name}>
                          {survey.surveyor_name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-50">
                        <MapPin className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Area</span>
                        <span className="text-xs font-black text-slate-700 truncate" title={survey.location}>
                          {survey.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignment Logic for Assigner (Param / Maria / Admin) */}
                {isAssigner && survey.status === SurveyStatus.BOOKED && (
                  <div className="mb-6 animate-in fade-in slide-in-from-top-3 duration-500 bg-indigo-600/[0.03] p-4 rounded-[1.75rem] border border-indigo-600/10 shadow-inner">
                    <div className="flex items-center gap-2 mb-3 ml-1">
                      <History className="w-3 h-3 text-indigo-400" />
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] leading-none">
                        Re-Allocation
                      </label>
                    </div>
                    <div className="relative group/alloc">
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer shadow-sm appearance-none pr-10"
                        value={survey.surveyor_name}
                        onChange={(e) => handleAssigneeChange(survey, e.target.value)}
                      >
                        <option value={currentUser.name}>My Responsibility</option>
                        {ASSIGNABLE_SURVEYORS.map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300 group-hover/alloc:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                )}

                {/* Footer Details */}
                <div className="flex items-center justify-between text-[11px] border-t border-slate-50 pt-5 mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100/70 rounded-lg border border-slate-100">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      <span className="font-extrabold text-slate-600 tracking-tight">{survey.survey_type}</span>
                    </div>
                  </div>
                  {survey.last_edited_by ? (
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <History className="w-3.5 h-3.5 opacity-50" />
                      <span>by {survey.last_edited_by}</span>
                    </div>
                  ) : (
                    <div className="text-slate-300 font-bold uppercase tracking-widest text-[9px]">
                      Created {new Date(survey.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredSurveys.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <ClipboardCheck className="w-8 h-8 text-slate-200" />
              </div>
              <p className="font-bold text-slate-900">No records found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {editingSurvey ? 'Edit Survey Booking' : 'New Survey Booking'}
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4" /> Surveyor Name
                  </label>
                  {isAssigner ? (
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                      value={formData.surveyor_name}
                      onChange={(e) => setFormData({ ...formData, surveyor_name: e.target.value })}
                    >
                      <option value={currentUser.name}>{currentUser.name} (Me)</option>
                      {ASSIGNABLE_SURVEYORS.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      disabled
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 cursor-not-allowed"
                      value={formData.surveyor_name}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" /> Survey Type
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    value={formData.survey_type}
                    onChange={(e) => setFormData({ ...formData, survey_type: e.target.value as any })}
                  >
                    <option value="Physical">Physical</option>
                    <option value="Whatsapp">Whatsapp</option>
                    <option value="Video Call">Video Call</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Hash className="w-4 h-4" /> Enquiry Number
                  </label>
                  <input
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="e.g. ENQ-12345"
                    value={formData.enquiry_number}
                    onChange={(e) => setFormData({ ...formData, enquiry_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Job Number (Optional)
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="e.g. JOB-98765"
                    value={formData.job_number}
                    onChange={(e) => setFormData({ ...formData, job_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4" /> Shipper Name
                  </label>
                  <input
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Enter full name of the shipper"
                    value={formData.shipper_name}
                    onChange={(e) => setFormData({ ...formData, shipper_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Location
                  </label>
                  <input
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Enter full address"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Shipment Mode
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}
                  >
                    <option value="Export">Export</option>
                    <option value="Import">Import</option>
                    <option value="Domestic">Domestic</option>
                    <option value="Storage">Storage</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Status
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    {Object.values(SurveyStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Survey Date
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    value={formData.survey_date}
                    onChange={(e) => setFormData({ ...formData, survey_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Start Time</label>
                    <input
                      required
                      type="time"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">End Time</label>
                    <input
                      required
                      type="time"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Client Emails (comma separated)
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="email1@example.com, email2@example.com"
                    value={formData.client_emails}
                    onChange={(e) => setFormData({ ...formData, client_emails: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="pt-6 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingSurvey ? 'Update Schedule' : 'Confirm Booking'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
