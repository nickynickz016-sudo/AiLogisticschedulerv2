
import React, { useState, useMemo } from 'react';
import { Survey, SurveyStatus, SurveyType, SurveyMode, UserProfile } from '../types';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  Hash, 
  Truck, 
  Filter, 
  BarChart3, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  ChevronDown,
  LayoutGrid,
  List,
  Download,
  LogOut
} from 'lucide-react';

interface SurveyTrackerProps {
  surveys: Survey[];
  onAddSurvey: (survey: Omit<Survey, 'id' | 'created_at'>) => void;
  onUpdateSurvey: (survey: Survey) => void;
  onDeleteSurvey: (id: string) => void;
  currentUser: UserProfile;
  googleTokens: any;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
}

export const SurveyTracker: React.FC<SurveyTrackerProps> = ({ 
  surveys, 
  onAddSurvey, 
  onUpdateSurvey, 
  onDeleteSurvey, 
  currentUser,
  googleTokens,
  onConnectGoogle,
  onDisconnectGoogle
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; survey: Survey | null; input: string }>({
    isOpen: false,
    survey: null,
    input: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedSurveyor, setSelectedSurveyor] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const h = hour.toString().padStart(2, '0');
        const m = min.toString().padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  }, []);

  const [newSurvey, setNewSurvey] = useState<Omit<Survey, 'id' | 'created_at'>>({
    surveyor_name: currentUser.name,
    survey_type: 'Physical',
    enquiry_number: '',
    shipper_name: '',
    location: '',
    mode: 'Export',
    status: SurveyStatus.SCHEDULED,
    survey_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    client_emails: []
  });

  const surveyors = useMemo(() => {
    const names = Array.from(new Set(surveys.map(s => s.surveyor_name)));
    return ['All', ...names];
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
      const matchesSearch = 
        s.shipper_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.enquiry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSurveyor = selectedSurveyor === 'All' || s.surveyor_name === selectedSurveyor;
      
      const surveyDate = new Date(s.survey_date);
      const matchesDate = (!dateRange.start || surveyDate >= new Date(dateRange.start)) &&
                          (!dateRange.end || surveyDate <= new Date(dateRange.end));
      
      return matchesSearch && matchesSurveyor && matchesDate;
    }).sort((a, b) => new Date(b.survey_date).getTime() - new Date(a.survey_date).getTime());
  }, [surveys, searchTerm, selectedSurveyor, dateRange]);

  const stats = useMemo(() => {
    const counts = {
      [SurveyStatus.BOOKED]: 0,
      [SurveyStatus.NEGOTIATION]: 0,
      [SurveyStatus.SCHEDULED]: 0,
      [SurveyStatus.LOST]: 0
    };
    filteredSurveys.forEach(s => {
      counts[s.status]++;
    });
    return counts;
  }, [filteredSurveys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSurvey.status === SurveyStatus.BOOKED && !newSurvey.job_number) {
      setFormError("Job Number is required when status is Booked");
      return;
    }
    setFormError(null);
    
    if (modalMode === 'add') {
      onAddSurvey(newSurvey);
    } else if (editingSurveyId) {
      onUpdateSurvey({ 
        ...newSurvey, 
        id: editingSurveyId, 
        created_at: surveys.find(s => s.id === editingSurveyId)?.created_at || Date.now(),
        google_event_id: surveys.find(s => s.id === editingSurveyId)?.google_event_id
      });
    }

    setIsModalOpen(false);
    setModalMode('add');
    setEditingSurveyId(null);
    setNewSurvey({
      surveyor_name: currentUser.name,
      survey_type: 'Physical',
      enquiry_number: '',
      shipper_name: '',
      location: '',
      mode: 'Export',
      status: SurveyStatus.SCHEDULED,
      survey_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '10:00',
      client_emails: []
    });
    setEmailInput('');
  };

  const handleEdit = (survey: Survey) => {
    setModalMode('edit');
    setEditingSurveyId(survey.id);
    setFormError(null);
    setNewSurvey({
      surveyor_name: survey.surveyor_name,
      survey_type: survey.survey_type,
      enquiry_number: survey.enquiry_number,
      job_number: survey.job_number,
      shipper_name: survey.shipper_name,
      location: survey.location,
      mode: survey.mode,
      status: survey.status,
      survey_date: survey.survey_date,
      start_time: survey.start_time || '09:00',
      end_time: survey.end_time || '10:00',
      google_event_id: survey.google_event_id,
      client_emails: survey.client_emails || []
    });
    setEmailInput('');
    setIsModalOpen(true);
  };

  const addEmail = () => {
    if (emailInput && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      if (!newSurvey.client_emails?.includes(emailInput)) {
        setNewSurvey({
          ...newSurvey,
          client_emails: [...(newSurvey.client_emails || []), emailInput]
        });
      }
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setNewSurvey({
      ...newSurvey,
      client_emails: (newSurvey.client_emails || []).filter(e => e !== email)
    });
  };

  const handleDelete = (survey: Survey) => {
    setDeleteConfirmation({
      isOpen: true,
      survey,
      input: ''
    });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.survey && deleteConfirmation.input === 'delete') {
      onDeleteSurvey(deleteConfirmation.survey.id);
      setDeleteConfirmation({ isOpen: false, survey: null, input: '' });
    }
  };

  const handleSyncToCalendar = async (survey: Survey) => {
    if (!googleTokens) {
      onConnectGoogle();
      return;
    }

    setIsSyncing(survey.id);
    try {
      const response = await fetch('/api/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey, tokens: googleTokens })
      });

      if (!response.ok) {
        throw new Error('Failed to sync with Google Calendar');
      }

      const result = await response.json();
      if (result.eventId) {
        onUpdateSurvey({ ...survey, google_event_id: result.eventId });
      }

      alert('Survey synced to Google Calendar successfully!');
    } catch (error: any) {
      console.error('Sync error:', error);
      alert(error.message || 'Failed to sync with Google Calendar');
    } finally {
      setIsSyncing(null);
    }
  };

  const getStatusColor = (status: SurveyStatus) => {
    switch (status) {
      case SurveyStatus.SCHEDULED: return 'bg-slate-100 text-slate-600 border-slate-200';
      case SurveyStatus.BOOKED: return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case SurveyStatus.NEGOTIATION: return 'bg-orange-50 text-orange-600 border-orange-200';
      case SurveyStatus.LOST: return 'bg-rose-50 text-rose-600 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: SurveyStatus) => {
    switch (status) {
      case SurveyStatus.SCHEDULED: return <Clock className="w-3 h-3" />;
      case SurveyStatus.BOOKED: return <CheckCircle2 className="w-3 h-3" />;
      case SurveyStatus.NEGOTIATION: return <AlertCircle className="w-3 h-3" />;
      case SurveyStatus.LOST: return <XCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Survey Tracker</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Manage and track all customer surveys</p>
        </div>
        <div className="flex items-center gap-3">
          {!googleTokens ? (
            <button 
              onClick={onConnectGoogle}
              className="flex items-center gap-2 bg-white text-slate-600 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 shadow-sm active:scale-95"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              Connect Calendar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Calendar Connected</span>
              </div>
              <button 
                onClick={onDisconnectGoogle}
                className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                title="Disconnect Google Calendar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          <button 
            onClick={() => {
              setModalMode('add');
              setNewSurvey({
                surveyor_name: currentUser.name,
                survey_type: 'Physical',
                enquiry_number: '',
                shipper_name: '',
                location: '',
                mode: 'Export',
                status: SurveyStatus.SCHEDULED,
                survey_date: new Date().toISOString().split('T')[0],
                start_time: '09:00',
                end_time: '10:00',
                client_emails: []
              });
              setEmailInput('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Survey
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booked</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats[SurveyStatus.BOOKED]}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 rounded-xl">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Negotiation</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats[SurveyStatus.NEGOTIATION]}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-50 rounded-xl">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scheduled</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats[SurveyStatus.SCHEDULED]}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 rounded-xl">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lost</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats[SurveyStatus.LOST]}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by shipper, enquiry, or location..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                className="bg-transparent border-none outline-none text-xs font-bold text-slate-600"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
              <span className="text-slate-300">to</span>
              <input 
                type="date" 
                className="bg-transparent border-none outline-none text-xs font-bold text-slate-600"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2">
              <User className="w-4 h-4 text-slate-400" />
              <select 
                className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 cursor-pointer"
                value={selectedSurveyor}
                onChange={(e) => setSelectedSurveyor(e.target.value)}
              >
                {surveyors.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Surveyor / Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipper / Location</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enquiry / Job</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Mode</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSurveys.map((survey) => (
                <tr key={survey.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-800">{survey.surveyor_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-bold text-slate-400">{new Date(survey.survey_date).toLocaleDateString()}</p>
                      {survey.start_time && (
                        <p className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                          {survey.start_time} - {survey.end_time}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-800">{survey.shipper_name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400">{survey.location}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-800">{survey.enquiry_number}</p>
                    {survey.job_number && (
                      <p className="text-[10px] font-bold text-blue-600 mt-1 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                        Job: {survey.job_number}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-800">{survey.survey_type}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{survey.mode}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(survey.status)}`}>
                      {getStatusIcon(survey.status)}
                      {survey.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {survey.surveyor_name === currentUser.name && (
                        <>
                          <button 
                            onClick={() => handleEdit(survey)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors"
                            title="Edit Survey"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleSyncToCalendar(survey)}
                            disabled={isSyncing === survey.id}
                            className={`p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-colors ${isSyncing === survey.id ? 'animate-pulse opacity-50' : ''}`}
                            title="Sync to Google Calendar"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(survey)}
                            className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors"
                            title="Delete Survey"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSurveys.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardCheck className="w-12 h-12 text-slate-200" />
                      <p className="text-slate-400 font-bold text-sm">No surveys found matching your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Survey Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-800">
                  {modalMode === 'add' ? 'New Survey Entry' : 'Edit Survey Entry'}
                </h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Surveyor: {newSurvey.surveyor_name}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 transition-all border border-transparent hover:border-slate-100">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <p className="text-rose-600 text-xs font-bold uppercase tracking-widest">{formError}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipper Name *</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Enter shipper name"
                    value={newSurvey.shipper_name}
                    onChange={(e) => setNewSurvey({...newSurvey, shipper_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location *</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Enter location"
                    value={newSurvey.location}
                    onChange={(e) => setNewSurvey({...newSurvey, location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Enquiry Number *</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="e.g. ENQ-001"
                    value={newSurvey.enquiry_number}
                    onChange={(e) => setNewSurvey({...newSurvey, enquiry_number: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Survey Date *</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={newSurvey.survey_date}
                    onChange={(e) => setNewSurvey({...newSurvey, survey_date: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Time *</label>
                    <select 
                      required
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                      value={newSurvey.start_time}
                      onChange={(e) => setNewSurvey({...newSurvey, start_time: e.target.value})}
                    >
                      {timeOptions.map(time => (
                        <option key={`start-${time}`} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Time *</label>
                    <select 
                      required
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                      value={newSurvey.end_time}
                      onChange={(e) => setNewSurvey({...newSurvey, end_time: e.target.value})}
                    >
                      {timeOptions.map(time => (
                        <option key={`end-${time}`} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Survey Type *</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                    value={newSurvey.survey_type}
                    onChange={(e) => setNewSurvey({...newSurvey, survey_type: e.target.value as SurveyType})}
                  >
                    <option value="Physical">Physical</option>
                    <option value="Whatsapp">Whatsapp</option>
                    <option value="Video Call">Video Call</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mode of Shipment *</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                    value={newSurvey.mode}
                    onChange={(e) => setNewSurvey({...newSurvey, mode: e.target.value as SurveyMode})}
                  >
                    <option value="Export">Export</option>
                    <option value="Import">Import</option>
                    <option value="Domestic">Domestic</option>
                    <option value="Storage">Storage</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status *</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                    value={newSurvey.status}
                    onChange={(e) => setNewSurvey({...newSurvey, status: e.target.value as SurveyStatus})}
                  >
                    <option value={SurveyStatus.SCHEDULED}>Survey Scheduled</option>
                    <option value={SurveyStatus.NEGOTIATION}>Negotiation</option>
                    <option value={SurveyStatus.BOOKED}>Booked</option>
                    <option value={SurveyStatus.LOST}>Lost</option>
                  </select>
                </div>
                {newSurvey.status === SurveyStatus.BOOKED && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Number *</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-5 py-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="Enter Job Number"
                      value={newSurvey.job_number || ''}
                      onChange={(e) => setNewSurvey({...newSurvey, job_number: e.target.value})}
                    />
                  </div>
                )}
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Emails (Guests)</label>
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="Enter client email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addEmail();
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={addEmail}
                      className="px-6 bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                  
                  {newSurvey.client_emails && newSurvey.client_emails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {newSurvey.client_emails.map(email => (
                        <div key={email} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 animate-in zoom-in-95">
                          <span className="text-xs font-bold text-slate-600">{email}</span>
                          <button 
                            type="button"
                            onClick={() => removeEmail(email)}
                            className="text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError(null);
                  }}
                  className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                  {modalMode === 'add' ? 'Save Survey Entry' : 'Update Survey Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Confirm Deletion</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">
                Are you sure you want to delete the survey for <span className="font-bold text-slate-800">{deleteConfirmation.survey?.shipper_name}</span>? 
                This action cannot be undone.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type "delete" to confirm</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-center"
                    placeholder="Type delete here"
                    value={deleteConfirmation.input}
                    onChange={(e) => setDeleteConfirmation({...deleteConfirmation, input: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmation({ isOpen: false, survey: null, input: '' })}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    disabled={deleteConfirmation.input !== 'delete'}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
