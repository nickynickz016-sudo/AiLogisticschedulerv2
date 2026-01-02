
import React from 'react';
import { Job, JobStatus, SystemSettings } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, Clock, AlertCircle, TrendingUp, BarChart3, ArrowUpRight } from 'lucide-react';

interface DashboardProps {
  jobs: Job[];
  settings: SystemSettings;
  onSetLimit: (date: string, limit: number) => void;
  isAdmin: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ jobs, settings, isAdmin }) => {
  const today = new Date().toISOString().split('T')[0];
  const currentLimit = settings.daily_job_limits[today] || 10;
  const currentJobsCount = jobs.filter(j => j.job_date === today && j.status !== JobStatus.REJECTED).length;

  const stats = [
    { label: 'Units Authorized', value: jobs.filter(j => j.status === JobStatus.ACTIVE).length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50/50' },
    { label: 'Pending Pool', value: jobs.filter(j => j.status === JobStatus.PENDING_ADD).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50/50' },
    { label: 'Operations Final', value: jobs.filter(j => j.status === JobStatus.COMPLETED).length, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
    { label: 'Critical Alerts', value: jobs.filter(j => j.priority === 'HIGH' && j.status === JobStatus.ACTIVE).length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/50' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Terminal Hub</h2>
          <p className="text-slate-500 font-medium text-lg mt-2 flex items-center gap-2">
            Real-time throughput index
            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <ArrowUpRight className="w-3 h-3" />
              +12% vs LY
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
           <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Facility Load Factor</p>
             <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-slate-900">{currentJobsCount} <span className="text-slate-300 font-medium">/</span> {currentLimit}</span>
                <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (currentJobsCount / currentLimit) * 100)}%` }}
                  ></div>
                </div>
             </div>
           </div>
           <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
              <BarChart3 className="w-7 h-7 text-slate-300" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group cursor-default">
            <div className="flex items-center gap-8">
              <div className={`${stat.bg} p-5 rounded-2xl transition-all group-hover:scale-110 border border-transparent group-hover:border-slate-100 shadow-sm`}>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-12">
            <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Throughput Velocity Index</h3>
            <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-blue-50 transition-colors">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest group-hover:text-blue-600">Daily Efficiency Index</span>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Sun', v: 35 }, { name: 'Mon', v: 65 }, { name: 'Tue', v: 50 }, 
                { name: 'Wed', v: 80 }, { name: 'Thu', v: 55 }, { name: 'Fri', v: 25 }, { name: 'Sat', v: 40 }
              ]}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: '700'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="#3b82f6" fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full"></div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
           <h3 className="font-black text-xl text-slate-800 mb-10 flex items-center gap-4 uppercase tracking-tight">
             <Clock className="w-6 h-6 text-blue-500" />
             Pipeline Units
           </h3>
           <div className="space-y-8 flex-1">
             {jobs.slice(0, 6).map((job) => (
               <div key={job.id} className="flex gap-6 relative group cursor-pointer hover:bg-slate-50 p-3 -mx-3 rounded-2xl transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-sm text-slate-400 group-hover:bg-white group-hover:shadow-md transition-all shrink-0">
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
    </div>
  );
};