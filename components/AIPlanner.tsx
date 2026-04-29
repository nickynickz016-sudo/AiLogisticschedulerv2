
import React, { useState } from 'react';
import { Job } from '../types';
import { GoogleGenAI } from '@google/genai';
import { BrainCircuit, Sparkles, Loader2, Play, Ruler, Truck } from 'lucide-react';

interface AIPlannerProps {
  jobs: Job[];
}

export const AIPlanner: React.FC<AIPlannerProps> = ({ jobs }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const optimizeSchedule = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as a UAE-based logistics fleet manager. Analyze this daily job allocation list for Dubai/Abu Dhabi regions. 
      Factors to consider: 
      - CBM Volume for truck sizing.
      - Loading Type (e.g., Warehouse Removal vs Storage).
      - Special Requests (Handyman needed, Extra manpower).
      - Time slots for route grouping.

      Jobs: ${JSON.stringify(jobs.map(j => ({ id: j.id, loc: j.location, cbm: j.volume_cbm, time: j.job_time, type: j.loading_type, spec: j.special_requests })))}
      
      Provide:
      1. A prioritized route sequence.
      2. Vehicle recommendation (3-ton, 5-ton, or 10-ton) based on CBM.
      3. Manpower efficiency suggestions.
      Keep it professional and focused on UAE logistics optimization.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setReport(response.text || 'Optimization report unavailable.');
    } catch (err) {
      console.error(err);
      setReport('Optimization failed. System load high.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 md:gap-14">
          <div className="w-full lg:max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6 backdrop-blur-md">
              <BrainCircuit className="w-4 h-4 text-blue-400" />
              <span className="font-black text-[9px] uppercase tracking-[0.2em] text-blue-300">Logistic AI Engine</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-[1.1] tracking-tight uppercase">Sync your fleet<br/><span className="text-blue-400">with UAE logic.</span></h2>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-8 max-w-lg font-bold">
              Analyze CBM volumes, regions, and crew requirements instantly to reduce empty-mile transit.
            </p>
            <button 
              onClick={optimizeSchedule}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center md:justify-start gap-4 bg-blue-600 text-white px-8 md:px-12 py-4 md:py-5 rounded-2xl font-black text-sm md:text-lg hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-2xl shadow-blue-900/40 uppercase tracking-widest"
            >
              {loading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
              {loading ? 'CALCULATING...' : 'OPTIMIZE FLEET'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full md:max-w-xs shrink-0">
            <div className="p-5 md:p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm shadow-inner group transition-all hover:bg-white/10">
              <Ruler className="w-6 h-6 md:w-8 md:h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-xl md:text-3xl font-black mb-1">{jobs.reduce((acc, j) => acc + j.volume_cbm, 0).toFixed(1)}</p>
              <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">Total CBM</p>
            </div>
            <div className="p-5 md:p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm shadow-inner group transition-all hover:bg-white/10">
              <Truck className="w-6 h-6 md:w-8 md:h-8 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-xl md:text-3xl font-black mb-1">{jobs.length}</p>
              <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Jobs</p>
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/5 blur-[120px]"></div>
      </div>

      {report && (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 animate-in slide-in-from-top-6 duration-500 relative">
          <div className="absolute top-10 right-10">
             <Sparkles className="w-8 h-8 text-blue-100" />
          </div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-black text-2xl text-slate-800 tracking-tight">Fleet Strategy</h3>
              <p className="text-sm text-slate-400 font-medium">Real-time allocation intelligence</p>
            </div>
          </div>
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-slate-600 leading-relaxed font-bold text-sm bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
              {report}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};