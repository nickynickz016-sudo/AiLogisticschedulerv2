
import React, { useState } from 'react';
import { SystemSettings } from '../types';
import { SlidersHorizontal, Calendar, Palmtree, Sun, Moon, Zap, Box, Layers, CheckCircle2 } from 'lucide-react';

interface CapacityManagerProps {
  settings: SystemSettings;
  onSetLimit: (date: string, limit: number) => void;
  onSetWarehouseLimit: (date: string, limit: number) => void;
  onSetWarehouseDefaultCapacity?: (capacity: number) => void;
  onToggleHoliday: (date: string) => void;
  isAdmin: boolean;
}

export const CapacityManager: React.FC<CapacityManagerProps> = ({ 
  settings, 
  onSetLimit, 
  onSetWarehouseLimit,
  onSetWarehouseDefaultCapacity,
  onToggleHoliday, 
  isAdmin 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'warehouse'>('schedule');

  const dates = Array.from({ length: 31 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const applyWeekendPolicy = () => {
    if (!confirm("This will set all Saturdays and Sundays in the next 31 days as Holidays (0 jobs). Continue?")) return;
    dates.forEach(date => {
      if (isWeekend(date) && !settings.holidays.includes(date)) {
        onToggleHoliday(date);
      }
    });
  };

  if (!isAdmin) return null;

  const defaultWhCapacity = settings.warehouse_default_capacity ?? 10;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Header with Tab Switcher */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] text-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border border-slate-200 shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operational Constraints</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Capacity Control Center</h2>
          <p className="text-slate-500 mt-2 font-medium max-w-lg leading-relaxed text-sm">
            Manage daily throughput ceilings independently for standard Job Schedules and Warehouse Area Activities.
          </p>

          {/* Sub Tab Switcher */}
          <div className="flex items-center gap-2 mt-6 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 inline-flex">
            <button
              onClick={() => setActiveSubTab('schedule')}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                activeSubTab === 'schedule' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Job Schedule Capacity</span>
            </button>
            <button
              onClick={() => setActiveSubTab('warehouse')}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                activeSubTab === 'warehouse' 
                  ? 'bg-amber-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>Warehouse Area Capacity</span>
            </button>
          </div>
        </div>
        
        {activeSubTab === 'schedule' && (
          <div className="flex flex-col gap-3 items-stretch md:items-end w-full md:w-auto">
            <button 
              onClick={applyWeekendPolicy}
              className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              Apply Weekend Holiday Policy
            </button>
          </div>
        )}

        {activeSubTab === 'warehouse' && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex flex-col gap-2 max-w-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase">
              <Box className="w-4 h-4 text-amber-600" />
              <span>Warehouse Dock Limits</span>
            </div>
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              Capacity strictly capped between <strong className="text-amber-950">5 to 10 jobs/day</strong> per admin policy.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 1: JOB SCHEDULE CAPACITY */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
              <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
                Daily Job Schedule Capacity Controls (Next 31 Days)
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Default Ceiling: 10 Jobs / Day</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {dates.map((date) => {
              const limit = settings.daily_job_limits[date] ?? 10;
              const isHoliday = settings.holidays.includes(date);
              const isWeekEnd = isWeekend(date);
              const isToday = date === new Date().toISOString().split('T')[0];
              const dayName = new Date(date).toLocaleDateString(undefined, { weekday: 'short' });

              return (
                <div key={date} className={`bg-white p-6 rounded-3xl border transition-all flex flex-col group relative overflow-hidden ${
                  isToday ? 'border-blue-500 shadow-lg ring-1 ring-blue-500/20' : 
                  isHoliday ? 'border-rose-100 bg-rose-50/20' :
                  isWeekEnd ? 'border-amber-100 bg-amber-50/30' : 'border-slate-200 shadow-sm'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${
                        isToday ? 'text-blue-600' : isHoliday ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        {dayName} {isToday ? '• TODAY' : ''}
                      </p>
                      <h4 className="text-lg font-black text-slate-800">
                        {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </h4>
                    </div>
                    {isWeekEnd && !isHoliday && (
                      <span title="Weekend">
                        <Sun className="w-4 h-4 text-amber-400" />
                      </span>
                    )}
                  </div>

                  <div className="mt-auto space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Max Schedule Jobs</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="50" 
                        disabled={isHoliday}
                        value={isHoliday ? 0 : limit}
                        onChange={(e) => onSetLimit(date, parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-sm font-black focus:ring-1 focus:ring-blue-500 outline-none transition-all ${
                          isHoliday ? 'border-rose-100 text-rose-300 bg-rose-50/30 cursor-not-allowed' : 'border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <button 
                      onClick={() => onToggleHoliday(date)}
                      className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                        isHoliday 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                          : 'bg-white text-slate-400 border-slate-200 hover:border-rose-200 hover:text-rose-500'
                      }`}
                    >
                      <Palmtree className="w-3.5 h-3.5" />
                      {isHoliday ? 'HOLIDAY ACTIVE' : 'MARK AS HOLIDAY'}
                    </button>
                  </div>

                  {isHoliday && (
                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center rotate-12">
                       <Moon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: WAREHOUSE AREA CAPACITY */}
      {activeSubTab === 'warehouse' && (
        <div className="space-y-6">
          {/* Warehouse Policy Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 md:p-8 rounded-[2rem] shadow-md flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-800/40">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                <Box className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-amber-100">Warehouse Area Dock Limit Policy</h3>
                <p className="text-xs text-amber-200/80 font-medium mt-0.5">
                  Maximum allowed: <span className="font-bold text-white">10 jobs/day</span> • Lowest adjustable limit: <span className="font-bold text-white">5 jobs/day</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl border border-white/10">
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-200 whitespace-nowrap">
                Default Daily Warehouse Limit:
              </label>
              <select 
                value={defaultWhCapacity}
                onChange={(e) => onSetWarehouseDefaultCapacity?.(parseInt(e.target.value))}
                className="bg-slate-900 text-white font-black text-sm px-3.5 py-1.5 rounded-xl border border-amber-500/40 outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                <option value={5}>5 Jobs / Day (Lowest)</option>
                <option value={6}>6 Jobs / Day</option>
                <option value={7}>7 Jobs / Day</option>
                <option value={8}>8 Jobs / Day</option>
                <option value={9}>9 Jobs / Day</option>
                <option value={10}>10 Jobs / Day (Maximum)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {dates.map((date) => {
              const whLimit = settings.warehouse_daily_job_limits?.[date] ?? defaultWhCapacity;
              const isHoliday = settings.holidays.includes(date);
              const isWeekEnd = isWeekend(date);
              const isToday = date === new Date().toISOString().split('T')[0];
              const dayName = new Date(date).toLocaleDateString(undefined, { weekday: 'short' });

              return (
                <div key={date} className={`bg-white p-6 rounded-3xl border transition-all flex flex-col group relative overflow-hidden ${
                  isToday ? 'border-amber-500 shadow-lg ring-1 ring-amber-500/20' : 
                  isHoliday ? 'border-rose-100 bg-rose-50/20' :
                  isWeekEnd ? 'border-amber-100 bg-amber-50/30' : 'border-slate-200 shadow-sm'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${
                        isToday ? 'text-amber-600' : isHoliday ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        {dayName} {isToday ? '• TODAY' : ''}
                      </p>
                      <h4 className="text-lg font-black text-slate-800">
                        {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </h4>
                    </div>
                    {isWeekEnd && !isHoliday && (
                      <span title="Weekend">
                        <Sun className="w-4 h-4 text-amber-400" />
                      </span>
                    )}
                  </div>

                  <div className="mt-auto space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-bold text-amber-700 uppercase block">Warehouse Limit</label>
                        <span className="text-[8px] font-black text-slate-400 uppercase">(Min 5 - Max 10)</span>
                      </div>
                      <input 
                        type="number" 
                        min="5" 
                        max="10" 
                        disabled={isHoliday}
                        value={isHoliday ? 0 : whLimit}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            onSetWarehouseLimit(date, val);
                          }
                        }}
                        className={`w-full px-3 py-2 bg-amber-50/40 border rounded-xl text-sm font-black focus:ring-1 focus:ring-amber-500 outline-none transition-all ${
                          isHoliday ? 'border-rose-100 text-rose-300 bg-rose-50/30 cursor-not-allowed' : 'border-amber-200 text-amber-950'
                        }`}
                      />
                    </div>

                    {/* Quick Presets for Warehouse */}
                    {!isHoliday && (
                      <div className="flex gap-1.5 pt-1">
                        <button 
                          type="button"
                          onClick={() => onSetWarehouseLimit(date, 5)}
                          className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${
                            whLimit === 5 ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          5
                        </button>
                        <button 
                          type="button"
                          onClick={() => onSetWarehouseLimit(date, 8)}
                          className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${
                            whLimit === 8 ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          8
                        </button>
                        <button 
                          type="button"
                          onClick={() => onSetWarehouseLimit(date, 10)}
                          className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${
                            whLimit === 10 ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          10
                        </button>
                      </div>
                    )}

                    <div className="pt-1">
                      <span className={`w-full py-1.5 px-2 rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border ${
                        isHoliday ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {isHoliday ? (
                          <>
                            <Moon className="w-3 h-3 text-rose-600" />
                            <span>Holiday (0 Dock Capacity)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-amber-600" />
                            <span>Capacity: {whLimit} / Day</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {isHoliday && (
                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center rotate-12">
                       <Moon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
