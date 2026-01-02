
import React from 'react';
import { SystemSettings } from '../types';
import { SlidersHorizontal, ChevronRight, Calendar, Palmtree, Sun, Moon, Zap } from 'lucide-react';

interface CapacityManagerProps {
  settings: SystemSettings;
  onSetLimit: (date: string, limit: number) => void;
  onToggleHoliday: (date: string) => void;
  isAdmin: boolean;
}

export const CapacityManager: React.FC<CapacityManagerProps> = ({ settings, onSetLimit, onToggleHoliday, isAdmin }) => {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-10 rounded-[2.5rem] text-slate-800 flex flex-col md:flex-row items-center justify-between gap-10 border border-slate-200 shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-6">
             <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operational Constraints</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Terminal Capacity Control</h2>
          <p className="text-slate-500 mt-2 font-medium max-w-lg leading-relaxed">
            Modify the throughput ceiling. Use the Holiday toggle to block days entirely (defaults to 0 jobs).
          </p>
        </div>
        
        <div className="flex flex-col gap-4 items-center">
          <button 
            onClick={applyWeekendPolicy}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            Apply Weekend Holiday Policy
          </button>
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
             <Calendar className="w-8 h-8 text-slate-200" />
          </div>
        </div>
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
                {/* Fixed: Lucide icons do not support a 'title' prop; wrapping in a span with 'title' instead */}
                {isWeekEnd && !isHoliday && (
                  <span title="Weekend">
                    <Sun className="w-4 h-4 text-amber-400" />
                  </span>
                )}
              </div>

              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between gap-4">
                   <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Max Jobs</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="50" 
                        disabled={isHoliday}
                        value={isHoliday ? 0 : limit}
                        onChange={(e) => onSetLimit(date, parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all ${
                          isHoliday ? 'border-rose-100 text-rose-300 bg-rose-50/30 cursor-not-allowed' : 'border-slate-200 text-slate-700'
                        }`}
                      />
                   </div>
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
  );
};