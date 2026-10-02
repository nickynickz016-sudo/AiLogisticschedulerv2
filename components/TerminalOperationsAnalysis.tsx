import React, { useState, useMemo, useEffect } from 'react';
import { Job, JobStatus, UserProfile, BranchCode, BRANCHES, CustomsStatus, AssignableSurveyor } from '../types';
import { getCleanJobNo, getUAEToday } from '../utils';
import { getBranchSurveyors, subscribeToBranchSurveyors } from '../utils/surveyors';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Calendar, 
  CalendarRange, 
  Filter, 
  User, 
  Users, 
  CheckCircle2, 
  Package, 
  Truck, 
  FileCheck, 
  Download, 
  Search, 
  RefreshCw, 
  X, 
  BarChart3, 
  Layers, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  FileSpreadsheet,
  CalendarDays,
  ShieldCheck,
  Check,
  PieChart as PieIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface UniqueOperationRecord {
  baseJobNo: string;
  category: 'schedule' | 'warehouse' | 'customs';
  categoryLabel: string;
  shipperName: string;
  requesterId: string;
  requesterName: string;
  isSD?: boolean;
  sdBranch?: string;
  dates: string[];
  earliestDate: string;
  latestDate: string;
  dayCount: number;
  isMultiDay: boolean;
  statuses: string[];
  primaryStatus: string;
  volumeCbm: number;
  teamLeader?: string;
  vehicles: string[];
  truckQty: number;
  activityName?: string;
  bolNumber?: string;
  containerNumber?: string;
  customsStatus?: string;
  agentName?: string;
  location?: string;
  rawJobIds: string[];
}

interface TerminalOperationsAnalysisProps {
  jobs: Job[];
  users?: UserProfile[];
  activeBranch?: BranchCode;
}

export const TerminalOperationsAnalysis: React.FC<TerminalOperationsAnalysisProps> = ({
  jobs,
  users = [],
  activeBranch = 'UAE'
}) => {
  const today = getUAEToday();

  // Default to current month start through today
  const defaultMonthStart = useMemo(() => {
    const d = new Date(today);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, [today]);

  const [startDate, setStartDate] = useState<string>(defaultMonthStart);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedRequestor, setSelectedRequestor] = useState<string>('ALL');
  const [selectedStream, setSelectedStream] = useState<'ALL' | 'schedule' | 'warehouse' | 'customs'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartMode, setChartMode] = useState<'timeline' | 'comparison'>('timeline');

  // Dynamic branch SD team
  const [branchSDs, setBranchSDs] = useState<AssignableSurveyor[]>(() =>
    getBranchSurveyors(activeBranch || 'UAE')
  );

  useEffect(() => {
    setBranchSDs(getBranchSurveyors(activeBranch || 'UAE'));
  }, [activeBranch]);

  useEffect(() => {
    const unsubscribe = subscribeToBranchSurveyors((branch, updatedList) => {
      if (branch === (activeBranch || 'UAE')) {
        setBranchSDs(updatedList);
      }
    });
    return unsubscribe;
  }, [activeBranch]);

  // Quick preset helper
  const handleApplyPreset = (preset: 'today' | 'week' | 'month' | 'last30' | 'all') => {
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'week') {
      const now = new Date(today);
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(sunday.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const now = new Date(today);
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last30') {
      const now = new Date(today);
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === 'all') {
      const dates = jobs.map(j => j.job_date).filter(Boolean);
      if (dates.length > 0) {
        dates.sort();
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      } else {
        setStartDate('2025-01-01');
        setEndDate(today);
      }
    }
  };

  // Build Requestor Options with formatted names, SD recognition, and counts
  const requestorOptions = useMemo(() => {
    const seenBaseJobsByReq: Record<string, Set<string>> = {};

    jobs.forEach(job => {
      if (job.status === JobStatus.REJECTED || job.is_transporter) return;
      const reqId = job.requester_id || 'Unknown';
      const baseId = getCleanJobNo(job.id) || job.title || job.id;
      if (!seenBaseJobsByReq[reqId]) {
        seenBaseJobsByReq[reqId] = new Set();
      }
      seenBaseJobsByReq[reqId].add(baseId);
    });

    const list = Object.keys(seenBaseJobsByReq).map(reqId => {
      const matched = users.find(u => 
        u.employee_id === reqId || 
        u.id === reqId || 
        u.username === reqId ||
        u.name?.toLowerCase() === reqId.toLowerCase()
      );
      const isSD = branchSDs.some(sd => 
        sd.id.toLowerCase() === reqId.toLowerCase() ||
        sd.name.toLowerCase() === reqId.toLowerCase() ||
        (matched && (
          matched.name?.toLowerCase() === sd.name.toLowerCase() || 
          matched.employee_id?.toLowerCase() === sd.id.toLowerCase()
        ))
      );

      return {
        id: reqId,
        name: isSD 
          ? `[SD] ${matched ? matched.name : reqId} (${reqId})` 
          : (matched ? `${matched.name} (${reqId})` : reqId),
        isSD,
        count: seenBaseJobsByReq[reqId].size
      };
    });

    list.sort((a, b) => b.count - a.count);
    return list;
  }, [jobs, users, branchSDs]);

  // Core Processing: 1 Job Number without suffix = 1 Count
  const analysisData = useMemo(() => {
    // 1. Filter jobs by date and requestor
    const filteredJobs = jobs.filter(job => {
      if (job.status === JobStatus.REJECTED || job.is_transporter) return false;

      // Date Range check
      if (startDate && job.job_date < startDate) return false;
      if (endDate && job.job_date > endDate) return false;

      // Requestor check
      if (selectedRequestor === 'ALL_SDS') {
        const reqId = job.requester_id || 'Unknown';
        const matched = users.find(u => 
          u.employee_id === reqId || 
          u.id === reqId || 
          u.username === reqId ||
          u.name?.toLowerCase() === reqId.toLowerCase()
        );
        const matchesAnySD = branchSDs.some(sd => 
          sd.id.toLowerCase() === reqId.toLowerCase() ||
          sd.name.toLowerCase() === reqId.toLowerCase() ||
          (matched && (
            matched.name?.toLowerCase() === sd.name.toLowerCase() || 
            matched.employee_id?.toLowerCase() === sd.id.toLowerCase()
          ))
        );
        if (!matchesAnySD) return false;
      } else if (selectedRequestor !== 'ALL') {
        const reqId = job.requester_id || 'Unknown';
        if (reqId !== selectedRequestor) return false;
      }

      return true;
    });

    // 2. Group by Category + Base Job No (Deduplication)
    // Multi-day jobs (Day 1, Day 2, #day2, -D2) collapse into 1 unique record
    const groupMap = new Map<string, {
      baseJobNo: string;
      category: 'schedule' | 'warehouse' | 'customs';
      categoryLabel: string;
      shipperName: string;
      requesterId: string;
      requesterName: string;
      isSD: boolean;
      datesSet: Set<string>;
      rawJobs: Job[];
    }>();

    filteredJobs.forEach(job => {
      let category: 'schedule' | 'warehouse' | 'customs' = 'schedule';
      let categoryLabel = 'Jobs Schedule';
      if (job.is_warehouse_activity) {
        category = 'warehouse';
        categoryLabel = 'Warehouse Activity';
      } else if (job.is_import_clearance) {
        category = 'customs';
        categoryLabel = 'Customs Clearance';
      }

      // Base Job number without suffix (e.g. AE-2026-001, WH-992, IMP-401)
      const baseJobNo = getCleanJobNo(job.id) || job.title || job.id;
      const groupKey = `${category}::${baseJobNo}`;

      const matchedUser = users.find(u => 
        u.employee_id === job.requester_id || 
        u.id === job.requester_id || 
        u.username === job.requester_id ||
        u.name?.toLowerCase() === (job.requester_id || '').toLowerCase()
      );
      const requesterName = matchedUser ? matchedUser.name : (job.requester_id || 'Unknown');

      const isSD = branchSDs.some(sd => 
        sd.id.toLowerCase() === (job.requester_id || '').toLowerCase() ||
        sd.name.toLowerCase() === (job.requester_id || '').toLowerCase() ||
        (matchedUser && (
          matchedUser.name?.toLowerCase() === sd.name.toLowerCase() || 
          matchedUser.employee_id?.toLowerCase() === sd.id.toLowerCase()
        ))
      );

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          baseJobNo,
          category,
          categoryLabel,
          shipperName: job.shipper_name || 'N/A',
          requesterId: job.requester_id || 'N/A',
          requesterName,
          isSD,
          datesSet: new Set([job.job_date]),
          rawJobs: [job]
        });
      } else {
        const existing = groupMap.get(groupKey)!;
        existing.datesSet.add(job.job_date);
        existing.rawJobs.push(job);
        if ((!existing.shipperName || existing.shipperName === 'N/A') && job.shipper_name) {
          existing.shipperName = job.shipper_name;
        }
      }
    });

    // 3. Assemble Unique Records
    const uniqueRecords: UniqueOperationRecord[] = Array.from(groupMap.values()).map(g => {
      const dates = Array.from(g.datesSet).sort();
      const rawJobIds = g.rawJobs.map(j => j.id);
      const primaryJob = g.rawJobs[0];

      // Multi-day is true if multiple distinct dates or duration > 1 or multiple raw jobs
      const isMultiDay = dates.length > 1 || (primaryJob.duration && primaryJob.duration > 1) || g.rawJobs.length > 1;
      const dayCount = Math.max(dates.length, primaryJob.duration || 1, g.rawJobs.length);

      const volumeCbm = g.rawJobs.reduce((sum, j) => Math.max(sum, j.volume_cbm || 0), 0);
      const vehicles = Array.from(new Set(g.rawJobs.flatMap(j => j.vehicles || (j.vehicle ? [j.vehicle] : []))));
      const truckQty = g.rawJobs.reduce((max, j) => Math.max(max, j.truck_qty || 1), 1);
      const statuses = Array.from(new Set(g.rawJobs.map(j => j.status)));

      return {
        baseJobNo: g.baseJobNo,
        category: g.category,
        categoryLabel: g.categoryLabel,
        shipperName: g.shipperName,
        requesterId: g.requesterId,
        requesterName: g.requesterName,
        isSD: g.isSD,
        sdBranch: activeBranch,
        dates,
        earliestDate: dates[0] || primaryJob.job_date,
        latestDate: dates[dates.length - 1] || primaryJob.job_date,
        dayCount,
        isMultiDay,
        statuses,
        primaryStatus: primaryJob.status,
        volumeCbm,
        teamLeader: primaryJob.team_leader,
        vehicles,
        truckQty,
        activityName: primaryJob.activity_name,
        bolNumber: primaryJob.bol_number,
        containerNumber: primaryJob.container_number,
        customsStatus: primaryJob.customs_status,
        agentName: primaryJob.agent_name,
        location: primaryJob.location,
        rawJobIds
      };
    });

    // Sort by latest activity date descending
    uniqueRecords.sort((a, b) => b.earliestDate.localeCompare(a.earliestDate));

    const scheduleList = uniqueRecords.filter(r => r.category === 'schedule');
    const warehouseList = uniqueRecords.filter(r => r.category === 'warehouse');
    const customsList = uniqueRecords.filter(r => r.category === 'customs');

    // Consolidated Base Job Count across streams
    const distinctGlobalBaseJobs = new Set(uniqueRecords.map(r => r.baseJobNo));

    return {
      allRecords: uniqueRecords,
      scheduleList,
      warehouseList,
      customsList,
      counts: {
        schedule: scheduleList.length,
        warehouse: warehouseList.length,
        customs: customsList.length,
        total: uniqueRecords.length,
        distinctGlobal: distinctGlobalBaseJobs.size,
        multiDayJobs: uniqueRecords.filter(r => r.isMultiDay).length,
        totalRawEntries: filteredJobs.length,
        totalVolumeCbm: scheduleList.reduce((sum, r) => sum + r.volumeCbm, 0)
      },
      filteredJobs
    };
  }, [jobs, startDate, endDate, selectedRequestor, users]);

  // Generate Daily Timeline Data (Count unique base jobs active per date in each category)
  const timelineChartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    // Build map for each day in range
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    
    // Safety check: max 60 days for daily display, otherwise group weekly
    const diffDays = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const dayMap: Record<string, { 
      date: string; 
      name: string; 
      scheduleSet: Set<string>; 
      warehouseSet: Set<string>; 
      customsSet: Set<string>; 
    }> = {};

    if (diffDays > 0 && diffDays <= 60) {
      const cur = new Date(startObj);
      while (cur <= endObj) {
        const dateStr = cur.toISOString().split('T')[0];
        dayMap[dateStr] = {
          date: dateStr,
          name: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          scheduleSet: new Set(),
          warehouseSet: new Set(),
          customsSet: new Set()
        };
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Populate unique jobs on each date
    analysisData.filteredJobs.forEach(job => {
      const d = job.job_date;
      if (!dayMap[d]) {
        dayMap[d] = {
          date: d,
          name: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          scheduleSet: new Set(),
          warehouseSet: new Set(),
          customsSet: new Set()
        };
      }
      const baseId = getCleanJobNo(job.id) || job.title || job.id;
      if (job.is_warehouse_activity) {
        dayMap[d].warehouseSet.add(baseId);
      } else if (job.is_import_clearance) {
        dayMap[d].customsSet.add(baseId);
      } else {
        dayMap[d].scheduleSet.add(baseId);
      }
    });

    return Object.values(dayMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(entry => ({
        name: entry.name,
        date: entry.date,
        'Jobs Schedule': entry.scheduleSet.size,
        'Warehouse Activity': entry.warehouseSet.size,
        'Customs Clearance': entry.customsSet.size,
        total: entry.scheduleSet.size + entry.warehouseSet.size + entry.customsSet.size
      }));
  }, [startDate, endDate, analysisData.filteredJobs]);

  // Comparison Chart Data (Category Totals)
  const comparisonChartData = useMemo(() => {
    return [
      { name: 'Jobs Schedule', value: analysisData.counts.schedule, fill: '#10b981' },
      { name: 'Warehouse Activity', value: analysisData.counts.warehouse, fill: '#3b82f6' },
      { name: 'Customs Clearance', value: analysisData.counts.customs, fill: '#6366f1' },
    ];
  }, [analysisData.counts]);

  // Workload Status Distribution for Filtered Unique Operations
  const workloadStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    analysisData.allRecords.forEach(rec => {
      const st = rec.primaryStatus || 'ACTIVE';
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value
      }));
  }, [analysisData.allRecords]);

  const STATUS_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ef4444', '#94a3b8'];

  // Filter Roster List by Stream and Search Query
  const displayedRecords = useMemo(() => {
    let list = analysisData.allRecords;
    if (selectedStream !== 'ALL') {
      list = list.filter(r => r.category === selectedStream);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        r.baseJobNo.toLowerCase().includes(q) ||
        r.shipperName.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q) ||
        r.requesterId.toLowerCase().includes(q) ||
        (r.teamLeader && r.teamLeader.toLowerCase().includes(q)) ||
        (r.activityName && r.activityName.toLowerCase().includes(q)) ||
        (r.bolNumber && r.bolNumber.toLowerCase().includes(q)) ||
        (r.containerNumber && r.containerNumber.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q))
      );
    }
    return list;
  }, [analysisData.allRecords, selectedStream, searchQuery]);

  // Export Deduplicated Unique Jobs to Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: All Unique Operations
      const wsAll = XLSX.utils.json_to_sheet(analysisData.allRecords.map(r => ({
        'Base Job No.': r.baseJobNo,
        'Operation Stream': r.categoryLabel,
        'Shipper / Client': r.shipperName,
        'Requestor': `${r.requesterName} (${r.requesterId})`,
        'Scheduled Dates': r.dates.join(', '),
        'Multi-Day': r.isMultiDay ? `Yes (${r.dayCount} Days)` : 'Single Day',
        'Status': r.primaryStatus,
        'CBM Volume': r.volumeCbm || '-',
        'Team Leader': r.teamLeader || '-',
        'Activity / Details': r.activityName || r.bolNumber || r.location || '-'
      })));
      XLSX.utils.book_append_sheet(wb, wsAll, 'All Unique Operations');

      // Sheet 2: Jobs Schedule
      if (analysisData.scheduleList.length > 0) {
        const wsSchedule = XLSX.utils.json_to_sheet(analysisData.scheduleList.map(r => ({
          'Base Job No.': r.baseJobNo,
          'Shipper': r.shipperName,
          'Requestor': `${r.requesterName} (${r.requesterId})`,
          'Dates': r.dates.join(', '),
          'Days Count': r.dayCount,
          'CBM': r.volumeCbm,
          'Team Leader': r.teamLeader || '-',
          'Vehicles': r.vehicles.join(', ') || '-',
          'Status': r.primaryStatus
        })));
        XLSX.utils.book_append_sheet(wb, wsSchedule, 'Jobs Schedule');
      }

      // Sheet 3: Warehouse Activity
      if (analysisData.warehouseList.length > 0) {
        const wsWarehouse = XLSX.utils.json_to_sheet(analysisData.warehouseList.map(r => ({
          'Base Job No.': r.baseJobNo,
          'Shipper': r.shipperName,
          'Activity Name': r.activityName || 'General Warehouse',
          'Requestor': `${r.requesterName} (${r.requesterId})`,
          'Dates': r.dates.join(', '),
          'Days Count': r.dayCount,
          'Status': r.primaryStatus
        })));
        XLSX.utils.book_append_sheet(wb, wsWarehouse, 'Warehouse Activity');
      }

      // Sheet 4: Customs Clearance
      if (analysisData.customsList.length > 0) {
        const wsCustoms = XLSX.utils.json_to_sheet(analysisData.customsList.map(r => ({
          'Base Job No.': r.baseJobNo,
          'Shipper': r.shipperName,
          'Agent': r.agentName || '-',
          'BOL No.': r.bolNumber || '-',
          'Container No.': r.containerNumber || '-',
          'Customs Status': r.customsStatus || '-',
          'Requestor': `${r.requesterName} (${r.requesterId})`,
          'Dates': r.dates.join(', '),
          'Status': r.primaryStatus
        })));
        XLSX.utils.book_append_sheet(wb, wsCustoms, 'Customs Clearance');
      }

      const fileName = `TerminalHub_Operations_Unique_Jobs_${activeBranch}_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error generating Excel:', err);
      alert('Failed to export Excel report.');
    }
  };

  const isFiltered = selectedRequestor !== 'ALL' || startDate !== defaultMonthStart || endDate !== today;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-200 shadow-sm relative overflow-hidden group space-y-8">
      {/* Top Header & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-black text-2xl text-slate-800 tracking-tight uppercase flex items-center gap-2.5">
              <span className="w-3 h-8 bg-blue-600 rounded-full inline-block"></span>
              Terminal Operations Analysis
            </h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <Check className="w-3.5 h-3.5" />
              1 Job No. = 1 Count (Day 1 / Day 2 Multi-Day Deduplicated)
            </span>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all shadow-sm shadow-emerald-200"
            title="Download Excel report with distinct job numbers"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Unique Jobs
          </button>
          {isFiltered && (
            <button
              onClick={() => {
                setStartDate(defaultMonthStart);
                setEndDate(today);
                setSelectedRequestor('ALL');
                setSelectedStream('ALL');
                setSearchQuery('');
              }}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-colors"
              title="Reset all filters to current month and all requestors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Bar (Date Picker From - To & Requestor) */}
      <div className="bg-slate-50/80 p-4 md:p-6 rounded-2xl border border-slate-200/80 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-wrap flex-1">
          {/* Date Picker: From Date to To Date */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
            <CalendarRange className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="text-[10px] font-black uppercase text-slate-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-slate-800 text-xs cursor-pointer focus:ring-0"
              />
              <span className="text-slate-300 font-bold">→</span>
              <span className="text-[10px] font-black uppercase text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-slate-800 text-xs cursor-pointer focus:ring-0"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl gap-1 shrink-0 overflow-x-auto">
            <button
              onClick={() => handleApplyPreset('today')}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white hover:text-blue-600 transition-all"
            >
              Today
            </button>
            <button
              onClick={() => handleApplyPreset('week')}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white hover:text-blue-600 transition-all"
            >
              This Week
            </button>
            <button
              onClick={() => handleApplyPreset('month')}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white hover:text-blue-600 transition-all"
            >
              This Month
            </button>
            <button
              onClick={() => handleApplyPreset('last30')}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white hover:text-blue-600 transition-all"
            >
              Last 30D
            </button>
            <button
              onClick={() => handleApplyPreset('all')}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white hover:text-blue-600 transition-all"
            >
              All Dates
            </button>
          </div>
        </div>

        {/* Requestor Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs w-full sm:w-72">
            <User className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 leading-tight">
                Requestor Filter
              </label>
              <select
                value={selectedRequestor}
                onChange={(e) => setSelectedRequestor(e.target.value)}
                className="w-full bg-transparent border-none outline-none font-bold text-xs text-slate-800 cursor-pointer p-0"
              >
                <option value="ALL">All Requestors (Entire Team)</option>
                {branchSDs.length > 0 && (
                  <option value="ALL_SDS">⭐ All SD Coordinators ({BRANCHES[activeBranch || 'UAE']?.name} SD Team)</option>
                )}
                {requestorOptions.map(req => (
                  <option key={req.id} value={req.id}>
                    {req.name} • {req.count} unique job{req.count !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedRequestor !== 'ALL' && (
              <button
                onClick={() => setSelectedRequestor('ALL')}
                className="text-slate-400 hover:text-slate-600"
                title="Clear requestor filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Operations KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* 1. Jobs Schedule */}
        <div 
          onClick={() => setSelectedStream(selectedStream === 'schedule' ? 'ALL' : 'schedule')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            selectedStream === 'schedule' 
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-md' 
              : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/20 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800">
              1:1 Count
            </span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jobs Schedule</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{analysisData.counts.schedule}</span>
            <span className="text-xs font-bold text-emerald-600">Unique Jobs</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-2 flex items-center gap-1.5 truncate">
            <span>{analysisData.counts.totalVolumeCbm} CBM</span>
            <span className="text-slate-300">•</span>
            <span>Relocations / Moves</span>
          </p>
        </div>

        {/* 2. Warehouse Activity */}
        <div 
          onClick={() => setSelectedStream(selectedStream === 'warehouse' ? 'ALL' : 'warehouse')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            selectedStream === 'warehouse' 
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-md' 
              : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/20 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800">
              1:1 Count
            </span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Warehouse Activity</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{analysisData.counts.warehouse}</span>
            <span className="text-xs font-bold text-blue-600">Unique Activities</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-2 truncate">
            Storage, stuffing & handlings
          </p>
        </div>

        {/* 3. Customs Clearance */}
        <div 
          onClick={() => setSelectedStream(selectedStream === 'customs' ? 'ALL' : 'customs')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            selectedStream === 'customs' 
              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-md' 
              : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-800">
              1:1 Count
            </span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customs Clearance</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{analysisData.counts.customs}</span>
            <span className="text-xs font-bold text-indigo-600">Unique Files</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-2 truncate">
            Import clearance & sea/air BOL
          </p>
        </div>

        {/* 4. Total Consolidated Unique Jobs */}
        <div 
          onClick={() => setSelectedStream('ALL')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            selectedStream === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-400 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
              selectedStream === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
              selectedStream === 'ALL' ? 'bg-emerald-500 text-slate-900' : 'bg-emerald-100 text-emerald-800'
            }`}>
              Deduplicated
            </span>
          </div>
          <p className={`text-[10px] font-black uppercase tracking-wider ${selectedStream === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>
            Total Unique Jobs
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-black ${selectedStream === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {analysisData.counts.total}
            </span>
            <span className={`text-xs font-bold ${selectedStream === 'ALL' ? 'text-emerald-400' : 'text-slate-600'}`}>
              ({analysisData.counts.totalRawEntries} shifts)
            </span>
          </div>
          <p className={`text-[11px] font-medium mt-2 truncate ${selectedStream === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
            {analysisData.counts.multiDayJobs} multi-day jobs collapsed
          </p>
        </div>
      </div>

      {/* Visual Chart View Mode, Operations Frequency & Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Main Operational Frequency & Volume Chart (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h4 className="font-black text-sm uppercase tracking-wider text-slate-800">
                Operations Frequency & Volume Breakdown
              </h4>
              <span className="text-xs text-slate-400 font-medium hidden md:inline">
                • {startDate} to {endDate}
              </span>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setChartMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  chartMode === 'timeline' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daily Timeline
              </button>
              <button
                onClick={() => setChartMode('comparison')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  chartMode === 'comparison' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Stream Comparison
              </button>
            </div>
          </div>

          {/* Chart Rendering */}
          <div className="w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-200" style={{ height: '330px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'timeline' ? (
                <BarChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 900, color: '#0f172a', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px' }}
                    formatter={(val: number, name: string) => [`${val} Unique Jobs`, name]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 800 }} 
                  />
                  <Bar dataKey="Jobs Schedule" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Warehouse Activity" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Customs Clearance" stackId="a" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={comparisonChartData} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 800 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 900, color: '#0f172a' }}
                    formatter={(val: number) => [`${val} Unique Jobs (1 Job No. = 1 Count)`, 'Volume']}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#3b82f6" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload Status Distribution (1 Col) */}
        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              Workload Status
            </h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Filtered Unique Operations
            </p>
          </div>

          <div className="h-[200px] w-full relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={workloadStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {workloadStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 800 }}
                  formatter={(val: number) => [`${val} Unique Jobs`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-black text-slate-800">{analysisData.counts.total}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 max-h-24 overflow-y-auto custom-scrollbar">
            {workloadStatusData.length === 0 ? (
              <p className="col-span-2 text-center text-xs text-slate-400">No active operations</p>
            ) : (
              workloadStatusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate">{entry.name}</span>
                  <span className="text-[10px] font-black text-slate-400 ml-auto">{entry.value}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Interactive Unique Jobs Roster Table */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Stream Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedStream('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                selectedStream === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Streams ({analysisData.counts.total})
            </button>
            <button
              onClick={() => setSelectedStream('schedule')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                selectedStream === 'schedule'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Jobs Schedule ({analysisData.counts.schedule})
            </button>
            <button
              onClick={() => setSelectedStream('warehouse')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                selectedStream === 'warehouse'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-200'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              Warehouse ({analysisData.counts.warehouse})
            </button>
            <button
              onClick={() => setSelectedStream('customs')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                selectedStream === 'customs'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              Customs Clearance ({analysisData.counts.customs})
            </button>
          </div>

          {/* Table Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Job No, Shipper, Requestor, TL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table of Distinct Jobs */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[460px] custom-scrollbar">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/80 uppercase text-[9px] font-black tracking-wider text-slate-500 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-4">Job No. (Base)</th>
                  <th className="py-3 px-4">Stream</th>
                  <th className="py-3 px-4">Shipper / Client</th>
                  <th className="py-3 px-4">Requestor</th>
                  <th className="py-3 px-4">Scheduled Date(s)</th>
                  <th className="py-3 px-4">Key Details</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No unique jobs found matching the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  displayedRecords.map((r, idx) => (
                    <tr key={`${r.category}-${r.baseJobNo}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* Job No. & Multi-day indicator */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900">{r.baseJobNo}</span>
                          {r.isMultiDay && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200"
                              title={`Multi-day Job (${r.dayCount} days scheduled): ${r.dates.join(', ')}`}
                            >
                              <CalendarDays className="w-2.5 h-2.5" />
                              {r.dayCount} Days
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stream Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.category === 'schedule' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                            <Truck className="w-3 h-3" /> Job Schedule
                          </span>
                        )}
                        {r.category === 'warehouse' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                            <Package className="w-3 h-3" /> Warehouse
                          </span>
                        )}
                        {r.category === 'customs' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                            <FileCheck className="w-3 h-3" /> Customs
                          </span>
                        )}
                      </td>

                      {/* Shipper */}
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="truncate max-w-[200px]" title={r.shipperName}>
                          {r.shipperName}
                        </div>
                        {r.location && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[200px]">
                            {r.location}
                          </div>
                        )}
                      </td>

                      {/* Requestor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-full ${r.isSD ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'} flex items-center justify-center text-[9px] font-black`}>
                            {r.requesterName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{r.requesterName}</span>
                              {r.isSD && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200" title={`Service Delivery Coordinator (${r.sdBranch || activeBranch})`}>
                                  SD
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{r.requesterId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Scheduled Dates */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-700">
                          {r.dates.length === 1 ? (
                            r.dates[0]
                          ) : (
                            <span title={r.dates.join(', ')}>
                              {r.earliestDate} → {r.latestDate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Key Details */}
                      <td className="py-3 px-4 text-[11px]">
                        {r.category === 'schedule' && (
                          <div className="flex items-center gap-2 text-slate-500">
                            {r.volumeCbm > 0 && <span className="font-bold text-slate-700">{r.volumeCbm} CBM</span>}
                            {r.teamLeader && <span>• TL: {r.teamLeader}</span>}
                            {r.vehicles.length > 0 && <span className="truncate max-w-[120px]">• {r.vehicles.join(', ')}</span>}
                          </div>
                        )}
                        {r.category === 'warehouse' && (
                          <div className="text-slate-500">
                            <span className="font-bold text-slate-700">{r.activityName || 'Warehouse Operation'}</span>
                          </div>
                        )}
                        {r.category === 'customs' && (
                          <div className="flex items-center gap-2 text-slate-500">
                            {r.bolNumber && <span>BOL: {r.bolNumber}</span>}
                            {r.containerNumber && <span>• Cont: {r.containerNumber}</span>}
                            {r.customsStatus && (
                              <span className="font-bold text-indigo-600">[{r.customsStatus}]</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          r.primaryStatus === 'ACTIVE' || r.primaryStatus === 'COMPLETED' || r.primaryStatus === 'CLEARED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.primaryStatus === 'PENDING_ADD'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.primaryStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <span>
              Showing <span className="font-bold text-slate-800">{displayedRecords.length}</span> unique job{displayedRecords.length !== 1 ? 's' : ''} (deduplicated).
            </span>
            <span className="text-[10px] text-slate-400">
              * Multiple dates or day suffixes (Day 1, Day 2, etc.) of the same job number are counted as 1.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
