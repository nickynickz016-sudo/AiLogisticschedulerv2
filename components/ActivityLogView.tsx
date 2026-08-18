import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Trash2, 
  PlusCircle, 
  Edit3, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle, 
  GitCommit, 
  Clock, 
  Download, 
  RotateCcw, 
  ArrowRight, 
  AlertTriangle, 
  ChevronRight, 
  X, 
  Eye, 
  ShieldAlert, 
  Layers,
  Tag
} from 'lucide-react';
import { ActivityLog, ActionType, EntityType, UserProfile, UserRole } from '../types';

interface ActivityLogViewProps {
  logs: ActivityLog[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onRestoreItem?: (log: ActivityLog) => void;
  onRefreshLogs?: () => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  logs,
  allUsers,
  currentUser,
  onRestoreItem,
  onRefreshLogs
}) => {
  // Filters State
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Date Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH'>('ALL');

  // Selected Activity for Connected Thread Modal
  const [selectedLogForThread, setSelectedLogForThread] = useState<ActivityLog | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Quick Preset Handler
  const handleSetPreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'TODAY') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === 'WEEK') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setFromDate(w.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'MONTH') {
      const m = new Date();
      m.setDate(m.getDate() - 30);
      setFromDate(m.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  };

  const isAdmin = currentUser.role === UserRole.ADMIN || String(currentUser.role).toUpperCase() === 'ADMIN';

  // Base logs: All users can view centralized logs across all system users
  const baseLogs = useMemo(() => {
    return logs;
  }, [logs]);

  // Filtered Logs from base logs
  const filteredLogs = useMemo(() => {
    return baseLogs.filter(log => {
      // User filter (applicable for all users)
      if (selectedUserId !== 'ALL' && log.user_id !== selectedUserId && log.user_name !== selectedUserId) {
        return false;
      }

      // Action type filter
      if (selectedActionType !== 'ALL') {
        if (selectedActionType === 'LOCK_UNLOCK') {
          if (log.action_type !== 'LOCK' && log.action_type !== 'UNLOCK') return false;
        } else if (selectedActionType === 'APPROVE_REJECT') {
          if (log.action_type !== 'APPROVE' && log.action_type !== 'REJECT') return false;
        } else if (log.action_type !== selectedActionType) {
          return false;
        }
      }

      // Entity module filter
      if (selectedEntityType !== 'ALL' && log.entity_type !== selectedEntityType) {
        return false;
      }

      // Date Range filter
      if (fromDate || toDate) {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        if (fromDate && logDate < fromDate) return false;
        if (toDate && logDate > toDate) return false;
      }

      // Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = log.entity_id?.toLowerCase().includes(q);
        const matchTitle = log.entity_title?.toLowerCase().includes(q);
        const matchUser = log.user_name?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchLogId = log.id?.toLowerCase().includes(q);
        if (!matchId && !matchTitle && !matchUser && !matchDetails && !matchLogId) {
          return false;
        }
      }

      return true;
    });
  }, [baseLogs, isAdmin, selectedUserId, selectedActionType, selectedEntityType, fromDate, toDate, searchQuery]);

  // Group connected activities by Entity ID to find connected threads
  const entityActivityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    baseLogs.forEach(l => {
      if (l.entity_id) {
        counts[l.entity_id] = (counts[l.entity_id] || 0) + 1;
      }
    });
    return counts;
  }, [baseLogs]);

  // Get all connected logs for thread modal
  const connectedThreadLogs = useMemo(() => {
    if (!selectedLogForThread || !selectedLogForThread.entity_id) return [];
    const targetEntityId = selectedLogForThread.entity_id;
    return baseLogs
      .filter(l => l.entity_id === targetEntityId)
      .sort((a, b) => a.timestamp - b.timestamp); // Chronological order
  }, [baseLogs, selectedLogForThread]);

  // Statistics
  const totalDeletions = useMemo(() => baseLogs.filter(l => l.action_type === 'DELETE').length, [baseLogs]);
  const totalModifications = useMemo(() => baseLogs.filter(l => l.action_type === 'UPDATE' || l.action_type === 'ALLOCATE').length, [baseLogs]);
  const uniqueActiveUsers = useMemo(() => new Set(baseLogs.map(l => l.user_name)).size, [baseLogs]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = "\uFEFF"; // BOM
    csv += "Log ID,Timestamp,Date & Time,User Name,User ID,User Role,Action,Module,Entity ID,Entity Title,Details\n";
    filteredLogs.forEach(l => {
      const dt = new Date(l.timestamp).toLocaleString();
      csv += `"${l.id}",${l.timestamp},"${dt}","${l.user_name}","${l.user_id}","${l.user_role || 'N/A'}","${l.action_type}","${l.entity_type}","${l.entity_id}","${(l.entity_title || '').replace(/"/g, '""')}","${(l.details || '').replace(/"/g, '""').replace(/\n/g, ' ')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `activity_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper badge color
  const getActionBadge = (action: ActionType) => {
    switch (action) {
      case 'CREATE':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg"><PlusCircle className="w-3 h-3" /> Created</span>;
      case 'UPDATE':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg"><Edit3 className="w-3 h-3" /> Updated</span>;
      case 'DELETE':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg"><Trash2 className="w-3 h-3" /> Deleted</span>;
      case 'ALLOCATE':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg"><User className="w-3 h-3" /> Allocation</span>;
      case 'LOCK':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg"><Lock className="w-3 h-3" /> Locked</span>;
      case 'UNLOCK':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg"><Unlock className="w-3 h-3" /> Unlocked</span>;
      case 'APPROVE':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'REJECT':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'RESTORE':
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg"><RotateCcw className="w-3 h-3" /> Restored</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg"><Tag className="w-3 h-3" /> {action}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600/30 rounded-2xl border border-blue-400/30 flex items-center justify-center">
              <History className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Activity Audit Log & History</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-[11px] font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" /> Centralized System Audit (All Users)
                </span>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                Centralized Audit Trail • Tracking All System Users & Operations
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-900/30 active:translate-y-0.5"
          >
            <Download className="w-4 h-4" /> Export CSV Log
          </button>
          {onRefreshLogs && (
            <button
              onClick={onRefreshLogs}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700"
              title="Refresh Activity Logs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Decorative ambient background */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Diagnostic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total System Events</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{logs.length}</h3>
            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Real-time audit history</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <Layers className="w-6 h-6 text-slate-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Deletions Recorded</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{totalDeletions}</h3>
            <p className="text-[10px] font-bold text-rose-500 mt-0.5">Recoverable from thread</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Job & Data Edits</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{totalModifications}</h3>
            <p className="text-[10px] font-bold text-amber-600 mt-0.5">Includes crew allocations</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <Edit3 className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active System Users</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{uniqueActiveUsers}</h3>
            <p className="text-[10px] font-bold text-blue-500 mt-0.5">Tracked by employee ID</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Internal Diagnostics Explanation Box */}
      {totalDeletions > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 md:p-5 flex items-start gap-4 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-950 uppercase tracking-tight">Deletion Safety & Diagnostics Insight</h4>
            <p className="text-amber-800 leading-relaxed">
              If items or job schedules appeared missing, check the <strong>Delete</strong> logs below. The system automatically preserves the full snapshot payload before any removal. You can click any activity entry to view connected history or restore deleted jobs instantly.
            </p>
          </div>
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Job ID, Shipper Name, User, or Activity details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            {(['ALL', 'TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handleSetPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  datePreset === p 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === 'ALL' ? 'All Time' : p === 'TODAY' ? 'Today' : p === 'YESTERDAY' ? 'Yesterday' : p === 'WEEK' ? 'Last 7 Days' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters & Custom Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Filter by User */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> Filter by User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Users ({allUsers.length}) - Centralized System View</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.employee_id || u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Action */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" /> Action Type
            </label>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Creation (New Records)</option>
              <option value="UPDATE">Edits & Updates</option>
              <option value="ALLOCATE">Crew & Fleet Allocation</option>
              <option value="DELETE">Deletions</option>
              <option value="LOCK_UNLOCK">Schedule Locking / Unlocking</option>
              <option value="APPROVE_REJECT">Approvals & Rejections</option>
              <option value="RESTORE">Restorations</option>
            </select>
          </div>

          {/* Filter by Entity / Module */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> Target Module
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Application Modules</option>
              <option value="Job Schedule">Job Schedule</option>
              <option value="Groupage Tracker">Groupage Tracker</option>
              <option value="Survey">Survey Tracker</option>
              <option value="Fleet & Crew">Fleet & Crew</option>
              <option value="Warehouse">Warehouse Area</option>
              <option value="Import Clearance">Import Clearance</option>
              <option value="Inventory">Inventory</option>
              <option value="User Management">User Management</option>
            </select>
          </div>

          {/* Custom Date Range Picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Date Window (From - To)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset('ALL');
                }}
                className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-400 font-bold text-xs">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset('ALL');
                }}
                className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Audit Trail Events</span>
            <span className="text-xs font-extrabold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              Showing {filteredLogs.length} of {logs.length}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
            Click any row to open connected activity thread
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-20 p-6 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <History className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No activity events match your filter criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting the date range, selecting a different user, or clearing search filters.
            </p>
            <button
              onClick={() => {
                setSelectedUserId('ALL');
                setSelectedActionType('ALL');
                setSelectedEntityType('ALL');
                setSearchQuery('');
                handleSetPreset('ALL');
              }}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all mt-2"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const connectedCount = log.entity_id ? entityActivityCounts[log.entity_id] || 1 : 1;
              const dt = new Date(log.timestamp);
              const formattedDate = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              const formattedTime = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLogForThread(log)}
                  className="p-4 md:p-5 hover:bg-slate-50 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="pt-0.5 shrink-0">
                      {getActionBadge(log.action_type)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-black text-slate-900 text-xs md:text-sm">
                          {log.user_name}
                        </span>
                        {log.user_role && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {log.user_role}
                          </span>
                        )}
                        <span className="text-slate-300 font-light">•</span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                            #{log.entity_id}
                          </span>
                        )}
                        {log.entity_title && (
                          <span className="text-xs font-extrabold text-slate-800 truncate">
                            {log.entity_title}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                    {/* Timestamp */}
                    <div className="flex flex-col text-right">
                      <span className="text-[11px] font-black text-slate-700 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {formattedTime}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Connected Activity Badge */}
                    <div className="flex items-center gap-2">
                      {connectedCount > 1 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          <GitCommit className="w-3 h-3" /> {connectedCount} Connected Events
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONNECTED ACTIVITY THREAD MODAL */}
      {selectedLogForThread && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/30 rounded-2xl border border-blue-400/30 flex items-center justify-center">
                  <GitCommit className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg md:text-xl font-black">Connected Activity Thread</h3>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-blue-500 text-white rounded-full">
                      {connectedThreadLogs.length} Events Linked
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold mt-1">
                    Entity Target: <span className="text-white font-mono">#{selectedLogForThread.entity_id}</span>
                    {selectedLogForThread.entity_title && ` • ${selectedLogForThread.entity_title}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLogForThread(null)}
                className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subheader Bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Module: <strong className="text-slate-900">{selectedLogForThread.entity_type}</strong></span>
              </div>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold"
              >
                <Eye className="w-3.5 h-3.5" /> {showRawJson ? 'Hide Audit Payload' : 'View Raw Payload Data'}
              </button>
            </div>

            {/* Connected Thread Timeline */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-8">
                {connectedThreadLogs.map((logItem, idx) => {
                  const logDt = new Date(logItem.timestamp);
                  const isCurrentSelected = logItem.id === selectedLogForThread.id;
                  const isDeletion = logItem.action_type === 'DELETE';

                  return (
                    <div key={logItem.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                        isDeletion ? 'border-rose-600 bg-rose-50' : isCurrentSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                      }`}>
                        {isCurrentSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>

                      {/* Content Card */}
                      <div className={`p-5 rounded-2xl border transition-all ${
                        isCurrentSelected 
                          ? 'bg-blue-50/40 border-blue-300 shadow-sm' 
                          : isDeletion
                          ? 'bg-rose-50/30 border-rose-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center flex-wrap gap-2">
                            {getActionBadge(logItem.action_type)}
                            <span className="font-black text-slate-900 text-sm">{logItem.user_name}</span>
                            {logItem.user_role && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {logItem.user_role}
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] font-extrabold text-slate-500 font-mono">
                            {logDt.toLocaleDateString()} at {logDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-slate-700 leading-relaxed">
                          {logItem.details}
                        </p>

                        {/* If deletion occurred and payload exists, offer recovery button */}
                        {isDeletion && logItem.previous_data && onRestoreItem && (
                          <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Original Snapshot Saved
                            </span>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to restore "${logItem.entity_title || logItem.entity_id}"?`)) {
                                  onRestoreItem(logItem);
                                  setSelectedLogForThread(null);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Restore This Deleted Record
                            </button>
                          </div>
                        )}

                        {/* Raw JSON inspection */}
                        {showRawJson && (logItem.previous_data || logItem.new_data) && (
                          <div className="mt-4 p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono space-y-2 overflow-x-auto">
                            {logItem.previous_data && (
                              <div>
                                <span className="text-amber-400 font-bold block">Previous Snapshot Data:</span>
                                <pre>{JSON.stringify(logItem.previous_data, null, 2)}</pre>
                              </div>
                            )}
                            {logItem.new_data && (
                              <div>
                                <span className="text-emerald-400 font-bold block">New Payload Data:</span>
                                <pre>{JSON.stringify(logItem.new_data, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Showing connected event trail for #{selectedLogForThread.entity_id}
              </p>
              <button
                onClick={() => setSelectedLogForThread(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Close Thread
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
