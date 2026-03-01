
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getUAEToday } from '../utils';
import { Job, JobStatus, SystemSettings, JobCostSheet } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, Clock, AlertCircle, TrendingUp, BarChart3, ArrowUpRight, Download, Loader2, Activity, Calendar, X, Filter, CalendarRange, ListFilter, Camera, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { supabase } from '../supabaseClient';

// Extend jsPDF with the autoTable plugin
type jsPDFWithAutoTable = jsPDF & {
  autoTable: (options: any) => jsPDF;
};

interface DashboardProps {
  jobs: Job[];
  settings: SystemSettings;
  onSetLimit: (date: string, limit: number) => void;
  isAdmin: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ jobs, settings, isAdmin }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  
  // Summary Modal State
  const [showSummary, setShowSummary] = useState(false);
  const [summaryFilterType, setSummaryFilterType] = useState<'day' | 'range' | 'month'>('day');
  const [summaryDate, setSummaryDate] = useState(getUAEToday());
  const [summaryStartDate, setSummaryStartDate] = useState(getUAEToday());
  const [summaryEndDate, setSummaryEndDate] = useState(getUAEToday());
  const [summaryMonth, setSummaryMonth] = useState(getUAEToday().slice(0, 7));
  
  // Ref for the summary content to screenshot
  const summaryRef = useRef<HTMLDivElement>(null);

  const today = getUAEToday();
  const currentLimit = settings.daily_job_limits[today] || 10;
  // Filter out warehouse activities from the capacity count as per user request
  const currentJobsCount = jobs.filter(j => 
    j.job_date === today && 
    j.status !== JobStatus.REJECTED && 
    !j.is_warehouse_activity
  ).length;

  const [dailyCosts, setDailyCosts] = useState<{name: string, v: number}[]>([]);

  useEffect(() => {
    const fetchCosts = async () => {
      const { data, error } = await supabase.from('job_cost_sheets').select('job_id, total_cost');
      if (error) {
        console.error('Error fetching costs:', error);
        return;
      }
      
      // Group by date
      const costsByDate: Record<string, number> = {};
      
      // Initialize last 7 days with 0
      const todayDate = new Date(today);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        costsByDate[dateStr] = 0;
      }

      data?.forEach((sheet: any) => {
        const job = jobs.find(j => j.id === sheet.job_id);
        if (job && job.job_date) {
           // Only aggregate if the date is initialized in our range (last 7 days)
           if (costsByDate[job.job_date] !== undefined) {
             costsByDate[job.job_date] += sheet.total_cost || 0;
           }
        }
      });

      const chartData = Object.entries(costsByDate)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, cost]) => ({
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), // Mon, Tue
          v: cost
        }));
      
      setDailyCosts(chartData);
    };

    if (jobs.length > 0) {
        fetchCosts();
    }
  }, [jobs, today]);

  const stats = [
    { label: 'Units Authorized', value: jobs.filter(j => j.status === JobStatus.ACTIVE).length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50/50' },
    { label: 'Pending Pool', value: jobs.filter(j => j.status === JobStatus.PENDING_ADD).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50/50' },
    { label: 'Operations Final', value: jobs.filter(j => j.status === JobStatus.COMPLETED).length, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
    { label: 'Warehouse Activity', value: jobs.filter(j => j.is_warehouse_activity && j.job_date === today).length, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
  ];

  // Filtered Activities for Summary
  const filteredActivities = useMemo(() => {
    let filtered = jobs.filter(j => j.status !== JobStatus.REJECTED);

    if (summaryFilterType === 'day') {
      filtered = filtered.filter(j => j.job_date === summaryDate);
    } else if (summaryFilterType === 'range') {
      filtered = filtered.filter(j => j.job_date >= summaryStartDate && j.job_date <= summaryEndDate);
    } else if (summaryFilterType === 'month') {
      filtered = filtered.filter(j => j.job_date.startsWith(summaryMonth));
    }

    const schedule = filtered.filter(j => !j.is_warehouse_activity && !j.is_import_clearance);
    const warehouse = filtered.filter(j => j.is_warehouse_activity);

    return { schedule, warehouse };
  }, [jobs, summaryFilterType, summaryDate, summaryStartDate, summaryEndDate, summaryMonth]);
  
  const handleGeneratePdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF() as jsPDFWithAutoTable;
      const generationDate = new Date().toLocaleDateString();

      // Define header and footer for each page
      const pageContent = (data: any) => {
        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text('WRITER Relocations - Operations Report', data.settings.margin.left, 22);
        
        // Footer
        const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : (doc.internal.pages.length - 1);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text(`Generated on: ${generationDate}`, doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
      };

      // Filter jobs into categories
      const scheduleJobs = jobs.filter(j => !j.is_warehouse_activity && !j.is_import_clearance);
      const warehouseJobs = jobs.filter(j => j.is_warehouse_activity);
      const importJobs = jobs.filter(j => j.is_import_clearance);

      // 1. Job Schedule Table
      doc.autoTable({
        startY: 30,
        head: [['Job No.', 'Shipper', 'Date', 'Time', 'Location', 'CBM', 'Team Leader', 'Vehicles', 'Status']],
        body: scheduleJobs.map(j => [j.id, j.shipper_name, j.job_date, j.job_time || 'N/A', j.location || 'N/A', j.volume_cbm || 0, j.team_leader || 'N/A', j.vehicles?.join(', ') || 'N/A', j.status]),
        didDrawPage: pageContent,
        headStyles: { fillColor: [22, 163, 74] },
        margin: { top: 30 },
        tableWidth: 'auto',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 4: { cellWidth: 40 } },
        didParseCell: function(data) {
          if (data.section === 'head' && data.column.index === 0) {
            data.cell.text = ['Job Schedule'];
          }
        },
      });

      // 2. Warehouse Activity Table
      if (warehouseJobs.length > 0) {
        doc.autoTable({
          head: [['Job No.', 'Shipper', 'Date', 'Requester ID', 'Status']],
          body: warehouseJobs.map(j => [j.id, j.shipper_name, j.job_date, j.requester_id, j.status]),
          didDrawPage: pageContent,
          headStyles: { fillColor: [37, 99, 235] },
          margin: { top: 30 },
          styles: { fontSize: 8, cellPadding: 2 },
          didParseCell: function(data) {
            if (data.section === 'head' && data.column.index === 0) {
              data.cell.text = ['Warehouse Activity'];
            }
          },
        });
      }

      // 3. Import Clearance Table
      if (importJobs.length > 0) {
        doc.autoTable({
          head: [['Job No.', 'Shipper', 'Agent', 'Date', 'BOL No.', 'Container No.', 'Customs Status']],
          body: importJobs.map(j => [j.id, j.shipper_name, j.agent_name || 'N/A', j.job_date, j.bol_number || 'N/A', j.container_number || 'N/A', j.customs_status || 'N/A']),
          didDrawPage: pageContent,
          headStyles: { fillColor: [79, 70, 229] },
          margin: { top: 30 },
          styles: { fontSize: 8, cellPadding: 2 },
          didParseCell: function(data) {
            if (data.section === 'head' && data.column.index === 0) {
              data.cell.text = ['Import Clearance'];
            }
          },
        });
      }

      doc.save(`operations_report_${today}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("There was an error generating the PDF report.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadSummaryPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const generationDate = new Date().toLocaleDateString();

    // Define header and footer
    const pageContent = (data: any) => {
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text('Activities Summary Report', data.settings.margin.left, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Filter: ${summaryFilterType.toUpperCase()} - ${summaryFilterType === 'day' ? summaryDate : summaryFilterType === 'range' ? `${summaryStartDate} to ${summaryEndDate}` : summaryMonth}`, data.settings.margin.left, 28);

        const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : (doc.internal.pages.length - 1);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text(`Generated on: ${generationDate}`, doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
    };

    let finalY = 35;

    // 1. Job Schedule Table
    if (filteredActivities.schedule.length > 0) {
        doc.autoTable({
            startY: finalY,
            head: [['Job No.', 'Shipper', 'Date', 'Time', 'Location', 'CBM', 'Team Leader', 'Vehicles', 'Status']],
            body: filteredActivities.schedule.map(j => [j.id, j.shipper_name, j.job_date, j.job_time || 'N/A', j.location || 'N/A', j.volume_cbm || 0, j.team_leader || 'N/A', j.vehicles?.join(', ') || 'N/A', j.status]),
            didDrawPage: pageContent,
            headStyles: { fillColor: [22, 163, 74] }, // Emerald
            margin: { top: 35 },
            styles: { fontSize: 8 },
            didParseCell: function(data: any) {
                if (data.section === 'head' && data.column.index === 0) {
                    data.cell.text = ['Job Schedule'];
                }
            },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    // 2. Warehouse Activity Table
    if (filteredActivities.warehouse.length > 0) {
        doc.autoTable({
            startY: finalY,
            head: [['Job No.', 'Shipper', 'Date', 'Activity', 'Requester', 'Status']],
            body: filteredActivities.warehouse.map(j => [j.id, j.shipper_name, j.job_date, j.activity_name || '-', j.requester_id, j.status]),
            didDrawPage: pageContent,
            headStyles: { fillColor: [37, 99, 235] }, // Blue
            margin: { top: 35 },
            styles: { fontSize: 8 },
            didParseCell: function(data: any) {
                if (data.section === 'head' && data.column.index === 0) {
                    data.cell.text = ['Warehouse Activity'];
                }
            },
        });
    }
    
    if (filteredActivities.schedule.length === 0 && filteredActivities.warehouse.length === 0) {
         doc.text("No records found for the selected period.", 14, 40);
    }

    doc.save(`activities_summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleScreenshot = async () => {
    if (!summaryRef.current) return;
    setIsScreenshotting(true);
    try {
        const canvas = await html2canvas(summaryRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            ignoreElements: (element) => element.id === 'summary-close-btn'
        });
        
        const link = document.createElement('a');
        link.download = `activities_summary_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.error("Screenshot failed:", e);
        alert("Failed to capture screenshot.");
    } finally {
        setIsScreenshotting(false);
    }
  };


  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Terminal Hub</h2>
          <p className="text-slate-500 font-medium text-lg mt-2 flex flex-wrap items-center gap-2">
            Real-time throughput index
            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <ArrowUpRight className="w-3 h-3" />
              +12% vs LY
            </span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button 
            onClick={() => setShowSummary(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase text-[10px] tracking-widest shadow-md shadow-blue-200"
          >
            <Activity className="w-4 h-4" /> Activities Summary
          </button>

          <button
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all font-bold uppercase text-[10px] tracking-widest shadow-md disabled:opacity-60"
          >
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isGeneratingPdf ? 'Generating...' : 'Download Full Report'}
          </button>
          
          <div className="flex items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 w-full sm:w-auto">
             <div className="text-right flex-1 sm:flex-none">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Facility Load Factor</p>
               <div className="flex items-center gap-3 justify-end">
                  <span className="text-3xl font-black text-slate-900">{currentJobsCount} <span className="text-slate-300 font-medium">/</span> {currentLimit}</span>
                  <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (currentJobsCount / currentLimit) * 100)}%` }}
                    ></div>
                  </div>
               </div>
             </div>
             <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
                <BarChart3 className="w-7 h-7 text-slate-300" />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group cursor-default">
            <div className="flex items-center gap-6 md:gap-8">
              <div className={`${stat.bg} p-4 md:p-5 rounded-2xl transition-all group-hover:scale-110 border border-transparent group-hover:border-slate-100 shadow-sm`}>
                <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{stat.label}</p>
                <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 gap-4">
            <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Daily Cost Incurred</h3>
            <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-blue-50 transition-colors self-start sm:self-auto">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest group-hover:text-blue-600">Last 7 Days Cost</span>
            </div>
          </div>
          <div className="w-full" style={{ height: '320px', minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={dailyCosts}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: '700'}} />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`AED ${value.toFixed(2)}`, 'Cost']}
                />
                <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="#3b82f6" fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full"></div>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
           <h3 className="font-black text-xl text-slate-800 mb-8 md:mb-10 flex items-center gap-4 uppercase tracking-tight">
             <Clock className="w-6 h-6 text-blue-500" />
             Pipeline Units
           </h3>
           <div className="space-y-6 md:space-y-8 flex-1">
             {jobs.slice(0, 6).map((job) => (
               <div key={job.id} className="flex gap-4 md:gap-6 relative group cursor-pointer hover:bg-slate-50 p-3 -mx-3 rounded-2xl transition-all duration-300">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-xs md:text-sm text-slate-400 group-hover:bg-white group-hover:shadow-md transition-all shrink-0">
                    {job.job_time}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{job.id}</p>
                    <h4 className="font-black text-slate-800 leading-none mb-2 truncate group-hover:text-blue-600 transition-colors">{job.shipper_name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">{job.location}</p>
                  </div>
               </div>
             ))}
             {jobs.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-center py-12">
                 <Package className="w-12 h-12 text-slate-200 mb-4" />
                 <p className="text-slate-400 font-bold uppercase text-xs tracking-widest italic">Zero pipeline activity</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Activities Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div ref={summaryRef} className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Activities Summary</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Consolidated Operational View</p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end md:self-auto">
                <button 
                    onClick={handleDownloadSummaryPdf}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                    <Download className="w-4 h-4" />
                    PDF
                </button>
                <button 
                    onClick={handleScreenshot}
                    disabled={isScreenshotting}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                    {isScreenshotting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    Screenshot
                </button>
                <button id="summary-close-btn" onClick={() => setShowSummary(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
              </div>
            </div>

            {/* Controls */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-6 items-center bg-white shrink-0">
               <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setSummaryFilterType('day')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${summaryFilterType === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Calendar className="w-3.5 h-3.5" /> Day
                  </button>
                  <button onClick={() => setSummaryFilterType('range')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${summaryFilterType === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CalendarRange className="w-3.5 h-3.5" /> Range
                  </button>
                  <button onClick={() => setSummaryFilterType('month')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${summaryFilterType === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <ListFilter className="w-3.5 h-3.5" /> Month
                  </button>
               </div>

               <div className="flex-1 flex items-center gap-4">
                  {summaryFilterType === 'day' && (
                    <input type="date" value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {summaryFilterType === 'range' && (
                    <div className="flex items-center gap-2">
                      <input type="date" value={summaryStartDate} onChange={(e) => setSummaryStartDate(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-slate-400 font-bold">-</span>
                      <input type="date" value={summaryEndDate} onChange={(e) => setSummaryEndDate(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  {summaryFilterType === 'month' && (
                    <input type="month" value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
               </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-slate-50/50">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Job Schedule List */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 h-full">
                     <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                           <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                           Job Schedule
                        </h4>
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{filteredActivities.schedule.length} Jobs</span>
                     </div>
                     <div className="space-y-4">
                        {filteredActivities.schedule.length === 0 ? (
                           <div className="text-center py-10 text-slate-400 font-medium text-sm italic">No scheduled jobs found for selection.</div>
                        ) : (
                           filteredActivities.schedule.map(job => (
                              <div key={job.id} className="p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all bg-white group">
                                 <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{job.job_date} • {job.job_time}</span>
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${job.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{job.status}</span>
                                 </div>
                                 <h5 className="font-bold text-slate-800 text-sm mb-1">{job.shipper_name}</h5>
                                 <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                    <span className="truncate max-w-[150px]">{job.location}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>{job.volume_cbm} CBM</span>
                                 </div>
                                 <div className="pt-2 border-t border-slate-50 flex gap-2 text-[10px] font-bold text-slate-400">
                                    <span className="uppercase">TL: {job.team_leader || 'N/A'}</span>
                                    {job.vehicles && job.vehicles.length > 0 && <span className="uppercase">• {job.vehicles[0]}</span>}
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

                  {/* Warehouse Activities List */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 h-full">
                     <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                           <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                           Warehouse Area
                        </h4>
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{filteredActivities.warehouse.length} Slots</span>
                     </div>
                     <div className="space-y-4">
                        {filteredActivities.warehouse.length === 0 ? (
                           <div className="text-center py-10 text-slate-400 font-medium text-sm italic">No warehouse activity found for selection.</div>
                        ) : (
                           filteredActivities.warehouse.map(job => (
                              <div key={job.id} className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all bg-white group">
                                 <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{job.job_date}</span>
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">WAREHOUSE</span>
                                 </div>
                                 <h5 className="font-bold text-slate-800 text-sm mb-1">{job.shipper_name}</h5>
                                 <p className="text-xs text-slate-500 font-medium mb-2">{job.activity_name || 'General Activity'}</p>
                                 <div className="pt-2 border-t border-slate-50 text-[10px] font-bold text-slate-400">
                                    <span className="uppercase">Req By: {job.requester_id}</span>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};