
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getUAEToday } from '../utils';
import { Job, JobStatus, SystemSettings, JobCostSheet, CustomsStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, Clock, AlertCircle, TrendingUp, BarChart3, ArrowUpRight, Download, Loader2, Activity, Calendar, X, Filter, CalendarRange, ListFilter, Camera, DollarSign, FileText, PieChart as PieIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
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
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
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
  // Filter out non-schedule activities from the capacity count as per user request
  const currentJobsCount = jobs.filter(j => 
    j.job_date === today && 
    j.status !== JobStatus.REJECTED && 
    !j.is_warehouse_activity &&
    !j.is_import_clearance &&
    !j.is_transporter
  ).length;

  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [chartData, setChartData] = useState<{name: string, v: number}[]>([]);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#94a3b8'];

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(JobStatus).forEach(status => counts[status] = 0);
    
    jobs.forEach(job => {
      if (!job.is_transporter) {
        counts[job.status] = (counts[job.status] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.replace(/_/g, ' '),
        value: count
      }));
  }, [jobs]);

  useEffect(() => {
    const calculateTrend = () => {
      const counts: Record<string, number> = {};
      const todayDate = new Date(today);
      
      if (timeframe === 'weekly' || timeframe === 'monthly') {
        const days = timeframe === 'weekly' ? 7 : 30;
        
        // Initialize range with 0
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          counts[dateStr] = 0;
        }

        // Fill counts
        jobs.forEach(job => {
          if (job.job_date && counts[job.job_date] !== undefined && !job.is_transporter) {
            counts[job.job_date]++;
          }
        });

        const data = Object.entries(counts)
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .map(([date, count]) => ({
            name: timeframe === 'weekly' 
              ? new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
              : new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            v: count
          }));
        
        setChartData(data);
      } else if (timeframe === 'yearly') {
        // Monthly breakdown for the last 12 months
        for (let i = 11; i >= 0; i--) {
          const d = new Date(todayDate);
          d.setMonth(d.getMonth() - i);
          const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
          counts[monthStr] = 0;
        }

        jobs.forEach(job => {
          if (job.job_date && !job.is_transporter) {
            const monthStr = job.job_date.slice(0, 7);
            if (counts[monthStr] !== undefined) {
              counts[monthStr]++;
            }
          }
        });

        const data = Object.entries(counts)
          .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
          .map(([month, count]) => ({
            name: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
            v: count
          }));
        
        setChartData(data);
      }
    };

    calculateTrend();
  }, [jobs, today, timeframe]);

  const stats = [
    { label: 'Job Executed', value: jobs.filter(j => j.status === JobStatus.ACTIVE && !j.is_transporter).length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50/50' },
    { label: 'Pending Pool', value: jobs.filter(j => j.status === JobStatus.PENDING_ADD && !j.is_transporter).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50/50' },
    { label: 'Import Clearance', value: jobs.filter(j => j.is_import_clearance && j.customs_status !== CustomsStatus.CLEARED).length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/50' },
    { label: 'Warehouse Activity', value: jobs.filter(j => j.is_warehouse_activity && j.job_date === today).length, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
  ];

  // Filtered Activities for Summary
  const filteredActivities = useMemo(() => {
    let filtered = jobs.filter(j => j.status !== JobStatus.REJECTED && !j.is_transporter);

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
  
  const handleGenerateExcel = () => {
    try {
      const scheduleJobs = jobs.filter(j => !j.is_warehouse_activity && !j.is_import_clearance && !j.is_transporter);
      const warehouseJobs = jobs.filter(j => j.is_warehouse_activity);
      const importJobs = jobs.filter(j => j.is_import_clearance);

      const wb = XLSX.utils.book_new();

      // Schedule Sheet
      const wsSchedule = XLSX.utils.json_to_sheet(scheduleJobs.map(j => ({
        'Job No.': j.id,
        'Shipper': j.shipper_name,
        'Date': j.job_date,
        'Time': j.job_time || 'N/A',
        'Location': j.location || 'N/A',
        'CBM': j.volume_cbm || 0,
        'Team Leader': j.team_leader || 'N/A',
        'Vehicles': j.vehicles?.join(', ') || 'N/A',
        'Status': j.status
      })));
      XLSX.utils.book_append_sheet(wb, wsSchedule, "Job Schedule");

      // Warehouse Sheet
      if (warehouseJobs.length > 0) {
        const wsWarehouse = XLSX.utils.json_to_sheet(warehouseJobs.map(j => ({
          'Job No.': j.id,
          'Shipper': j.shipper_name,
          'Date': j.job_date,
          'Requester ID': j.requester_id,
          'Status': j.status
        })));
        XLSX.utils.book_append_sheet(wb, wsWarehouse, "Warehouse Activity");
      }

      // Import Sheet
      if (importJobs.length > 0) {
        const wsImport = XLSX.utils.json_to_sheet(importJobs.map(j => ({
          'Job No.': j.id,
          'Shipper': j.shipper_name,
          'Agent': j.agent_name || 'N/A',
          'Date': j.job_date,
          'BOL No.': j.bol_number || 'N/A',
          'Container No.': j.container_number || 'N/A',
          'Customs Status': j.customs_status || 'N/A'
        })));
        XLSX.utils.book_append_sheet(wb, wsImport, "Import Clearance");
      }

      XLSX.writeFile(wb, `operations_report_${today}.xlsx`);
    } catch (error) {
      console.error("Failed to generate Excel:", error);
      alert("There was an error generating the Excel report.");
    }
  };

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
      const scheduleJobs = jobs.filter(j => !j.is_warehouse_activity && !j.is_import_clearance && !j.is_transporter);
      const warehouseJobs = jobs.filter(j => j.is_warehouse_activity);
      const importJobs = jobs.filter(j => j.is_import_clearance);
      const transporterJobs = jobs.filter(j => j.is_transporter);

      // Color coding helper
      const getBaseId = (id: string) => {
        const match = id.match(/^[A-Z]+-\d{4}-\d{2}/);
        if (match) return match[0];
        return id.replace(/[-.](D?\d+)$/i, '');
      };

      const getRowColors = (jobsArray: Job[]) => {
        const counts: Record<string, number> = {};
        jobsArray.forEach(j => {
          const baseId = getBaseId(j.id);
          counts[baseId] = (counts[baseId] || 0) + 1;
        });

        const colors = [[255, 242, 204], [217, 234, 211], [201, 218, 248], [244, 204, 204], [217, 210, 233], [252, 229, 205]];
        let cIdx = 0;
        const colorMap: Record<string, number[]> = {};

        return jobsArray.map(j => {
          const baseId = getBaseId(j.id);
          if (counts[baseId] > 1) {
            if (!colorMap[baseId]) {
              colorMap[baseId] = colors[cIdx % colors.length];
              cIdx++;
            }
            return colorMap[baseId];
          }
          return null;
        });
      };

      const scheduleColors = getRowColors(scheduleJobs);
      const warehouseColors = getRowColors(warehouseJobs);
      const importColors = getRowColors(importJobs);

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
        didParseCell: function(data: any) {
          if (data.section === 'head' && data.column.index === 0) {
            data.cell.text = ['Job Schedule'];
          }
          if (data.section === 'body' && scheduleColors[data.row.index]) {
            data.cell.styles.fillColor = scheduleColors[data.row.index];
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
          didParseCell: function(data: any) {
            if (data.section === 'head' && data.column.index === 0) {
              data.cell.text = ['Warehouse Activity'];
            }
            if (data.section === 'body' && warehouseColors[data.row.index]) {
              data.cell.styles.fillColor = warehouseColors[data.row.index];
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
          didParseCell: function(data: any) {
            if (data.section === 'head' && data.column.index === 0) {
              data.cell.text = ['Import Clearance'];
            }
            if (data.section === 'body' && importColors[data.row.index]) {
              data.cell.styles.fillColor = importColors[data.row.index];
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

    // Color coding helper
    const getBaseId = (id: string) => {
      const match = id.match(/^[A-Z]+-\d{4}-\d{2}/);
      if (match) return match[0];
      return id.replace(/[-.](D?\d+)$/i, '');
    };

    const getRowColors = (jobsArray: Job[]) => {
      const counts: Record<string, number> = {};
      jobsArray.forEach(j => {
        const baseId = getBaseId(j.id);
        counts[baseId] = (counts[baseId] || 0) + 1;
      });

      const colors = [[255, 242, 204], [217, 234, 211], [201, 218, 248], [244, 204, 204], [217, 210, 233], [252, 229, 205]];
      let cIdx = 0;
      const colorMap: Record<string, number[]> = {};

      return jobsArray.map(j => {
        const baseId = getBaseId(j.id);
        if (counts[baseId] > 1) {
          if (!colorMap[baseId]) {
            colorMap[baseId] = colors[cIdx % colors.length];
            cIdx++;
          }
          return colorMap[baseId];
        }
        return null;
      });
    };

    const scheduleColors = getRowColors(filteredActivities.schedule);
    const warehouseColors = getRowColors(filteredActivities.warehouse);

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
                if (data.section === 'body' && scheduleColors[data.row.index]) {
                    data.cell.styles.fillColor = scheduleColors[data.row.index];
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
                if (data.section === 'body' && warehouseColors[data.row.index]) {
                    data.cell.styles.fillColor = warehouseColors[data.row.index];
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

          <div className="relative">
            <button
              onClick={() => setShowDownloadOptions(!showDownloadOptions)}
              disabled={isGeneratingPdf}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all font-bold uppercase text-[10px] tracking-widest shadow-md disabled:opacity-60"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isGeneratingPdf ? 'Generating...' : 'Download Full Report'}
            </button>
            
            {showDownloadOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => { handleGeneratePdf(); setShowDownloadOptions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <FileText className="w-4 h-4" /> PDF Document
                </button>
                <button 
                  onClick={() => { handleGenerateExcel(); setShowDownloadOptions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" /> Excel Spreadsheet
                </button>
              </div>
            )}
          </div>
          
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group cursor-default">
            <div className="flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-8 text-center md:text-left">
              <div className={`${stat.bg} p-3 md:p-5 rounded-xl md:rounded-2xl transition-all group-hover:scale-110 border border-transparent group-hover:border-slate-100 shadow-sm`}>
                <stat.icon className={`w-5 h-5 md:w-8 md:h-8 ${stat.color}`} />
              </div>
              <div className="min-w-0 w-full overflow-hidden">
                <p className="text-[8px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1.5 truncate">{stat.label}</p>
                <p className="text-xl md:text-3xl font-black text-slate-900 tracking-tight truncate">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 gap-4">
            <div>
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Job Trend Analysis</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Scheduled jobs frequency</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
               <button 
                onClick={() => setTimeframe('weekly')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Weekly
               </button>
               <button 
                onClick={() => setTimeframe('monthly')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Monthly
               </button>
               <button 
                onClick={() => setTimeframe('yearly')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Yearly
               </button>
            </div>
          </div>
          <div className="w-full" style={{ height: '400px', minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: '800'}} />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    labelStyle={{fontWeight: '900', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px'}}
                    formatter={(value: number) => [`${value} Jobs`, 'Volume']}
                />
                <Bar dataKey="v" radius={[12, 12, 0, 0]} fill="#3b82f6" fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full"></div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-200 shadow-sm relative flex flex-col">
          <div className="mb-8">
            <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <PieIcon className="w-5 h-5 text-indigo-500" />
              Workload
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Status distribution</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    labelStyle={{fontWeight: '900'}}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800">{jobs.filter(j => !j.is_transporter).length}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {statusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight truncate">{entry.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activities Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div ref={summaryRef} className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 md:p-8 border-b bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 shrink-0 relative overflow-hidden">
              <div className="flex items-center gap-3 md:gap-4 z-10">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight uppercase">Activities Summary</h3>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">Operational View</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-auto z-10">
                <button 
                    onClick={handleDownloadSummaryPdf}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" /> <span className="hidden md:inline">PDF</span>
                </button>
                <button 
                    onClick={handleScreenshot}
                    disabled={isScreenshotting}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
                >
                    {isScreenshotting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5 text-blue-600" />}
                    <span className="hidden md:inline">Screenshot</span>
                </button>
                <button id="summary-close-btn" onClick={() => setShowSummary(false)} className="p-2 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all text-slate-400 ml-1">
                  <X className="w-4 h-4 md:w-6 md:h-6" />
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col items-stretch lg:flex-row gap-4 md:gap-6 lg:items-center bg-white shrink-0">
               <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
                  <button onClick={() => setSummaryFilterType('day')} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${summaryFilterType === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Calendar className="w-3.5 h-3.5" /> Day
                  </button>
                  <button onClick={() => setSummaryFilterType('range')} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${summaryFilterType === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CalendarRange className="w-3.5 h-3.5" /> Range
                  </button>
                  <button onClick={() => setSummaryFilterType('month')} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${summaryFilterType === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <ListFilter className="w-3.5 h-3.5" /> Month
                  </button>
               </div>

               <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {summaryFilterType === 'day' && (
                    <input type="date" value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {summaryFilterType === 'range' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                      <input type="date" value={summaryStartDate} onChange={(e) => setSummaryStartDate(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="hidden sm:inline text-slate-400 font-bold">-</span>
                      <input type="date" value={summaryEndDate} onChange={(e) => setSummaryEndDate(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                  {summaryFilterType === 'month' && (
                    <input type="month" value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)} className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
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