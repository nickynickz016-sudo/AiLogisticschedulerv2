
import React from 'react';
import { AlertCircle, Calendar, ArrowRight, CheckCircle2, ChevronRight, X } from 'lucide-react';

interface SundayJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'Skip' | 'Include') => void;
  jobDetails: {
    startDate: string;
    duration: number;
    title: string;
  };
}

export const SundayJobModal: React.FC<SundayJobModalProps> = ({ isOpen, onClose, onConfirm, jobDetails }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="relative p-8 md:p-10">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors group"
          >
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-rose-100/50">
              <Calendar className="w-10 h-10 text-rose-500" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                 <AlertCircle className="w-6 h-6 text-rose-600 bg-white rounded-full p-0.5 mt-6 ml-6 shadow-sm" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Sunday Overlap Detected</h3>
            <p className="text-sm font-medium text-slate-500 max-w-[320px]">
              This {jobDetails.duration}-day job starting on {jobDetails.startDate} includes one or more <span className="font-bold text-rose-600 underline">Sundays</span>.
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => onConfirm('Skip')}
              className="w-full group flex items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-3xl hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-300 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-colors">
                  <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Skip Sunday</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight line-clamp-1">Resume work on Monday. Jobs remain Active.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </button>

            <button 
              onClick={() => onConfirm('Include')}
              className="w-full group flex items-center justify-between p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-emerald-600 transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 group-hover:text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-800 uppercase tracking-widest">Proceed with Approval</h4>
                  <p className="text-[10px] font-bold text-emerald-600/70 uppercase mt-0.5 tracking-tight">Schedule on Sunday. Will go to Approval Queue.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
            Ref: {jobDetails.title} • Management Polices Apply
          </p>
        </div>
      </div>
    </div>
  );
};
