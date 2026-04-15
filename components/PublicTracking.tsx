
import React, { useState, useEffect } from 'react';
import { Job, JobStatus } from '../types';
import { supabase } from '../supabaseClient';
import { Map, Truck, Globe, FileCheck, Home, CheckCircle2, Package, Loader2, Phone, MessageSquare, Check, X, ArrowLeft } from 'lucide-react';

interface PublicTrackingProps {
  jobId: string;
}

const STEPS = [
  { id: 1, label: 'Origin Country', subLabel: 'Carrier Service', icon: Truck },
  { id: 2, label: 'Customs Clearance', subLabel: '& Departure', icon: FileCheck },
  { id: 3, label: 'International Transit', subLabel: 'Plane or Ship', icon: Globe },
  { id: 4, label: 'Destination Customs', subLabel: 'Clearance', icon: FileCheck },
  { id: 5, label: 'Final Delivery', subLabel: 'Carrier', icon: Home },
];

export const PublicTracking: React.FC<PublicTrackingProps> = ({ jobId }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Job
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);

        // Fetch Logo from settings
        const { data: settingsData } = await supabase
          .from('system_settings')
          .select('company_logo')
          .eq('id', 1)
          .single();
        
        if (settingsData?.company_logo) {
          setLogo(settingsData.company_logo);
        }

      } catch (err: any) {
        console.error("Error fetching tracking data:", err);
        setError(err.message || "Shipment not found or access denied.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to changes for real-time updates
    const channel = supabase
      .channel(`public-tracking-${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` }, (payload) => {
        setJob(payload.new as Job);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching Shipment Details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <X className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tracking Error</h2>
        <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium">{error || "The requested shipment could not be found."}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>
    );
  }

  const currentStep = job.tracking_current_step || 1;
  const activeStepData = job.tracking_data?.[currentStep.toString()];
  const lastUpdated = activeStepData?.updated_at ? new Date(activeStepData.updated_at).toLocaleString() : 'Just now';
  const statusNotes = activeStepData?.notes || 'Processing...';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      {/* Client Header */}
      <header className="bg-white border-b border-slate-200 p-6 flex justify-center items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4 max-w-5xl w-full">
          {logo ? (
            <img src={logo} alt="Company Logo" className="h-10 w-auto object-contain rounded-lg" />
          ) : (
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg rotate-45">
              <span className="-rotate-45">W</span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-none">WRITER RELOCATIONS</h2>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Client Tracking Portal</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        
        {/* Job Header Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between gap-8 items-start animate-in slide-in-from-top-4 duration-500">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">ID: {job.id}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(job.job_date).toLocaleDateString()}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-2">{job.shipper_name}</h1>
            <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
              <Map className="w-4 h-4" /> {job.location || 'Origin Pending'} 
              <span className="mx-2">•</span> 
              <Package className="w-4 h-4" /> {job.volume_cbm} CBM
            </div>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
            <p className="text-2xl font-bold text-blue-600">{STEPS[currentStep - 1].label}</p>
            <p className="text-xs font-medium text-slate-400 mt-1">Last Update: {lastUpdated}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 mb-8 overflow-x-auto animate-in fade-in duration-700 delay-200">
          <div className="min-w-[600px] flex flex-col md:flex-row items-center justify-between relative gap-8 md:gap-0">
            {/* Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-2 bg-slate-100 -z-10 -translate-y-1/2 rounded-full"></div>
            <div 
              className="hidden md:block absolute top-1/2 left-0 h-2 bg-gradient-to-r from-blue-400 to-blue-600 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            ></div>

            {STEPS.map((step) => {
              const isCompleted = step.id <= currentStep;
              const isCurrent = step.id === currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center relative group">
                  <div 
                    className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all duration-300 z-10 bg-white ${
                      isCompleted ? 'border-blue-500 text-blue-600 shadow-lg shadow-blue-100' : 'border-slate-200 text-slate-300'
                    }`}
                  >
                    <step.icon className={`w-8 h-8 ${isCurrent ? 'animate-pulse' : ''}`} />
                    {isCompleted && step.id < currentStep && (
                      <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-1 border-2 border-white">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-slate-800' : 'text-slate-300'}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Updates Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Latest Updates
            </h3>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 min-h-[150px]">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                {statusNotes}
              </p>
            </div>
          </div>
          
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Need Assistance?</h3>
              <p className="text-slate-400 text-xs mb-6">Our support team is available 24/7 for urgent inquiries.</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold">+971 4 340 8814</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold">writerrelocations.com</span>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[50px] rounded-full"></div>
          </div>
        </div>

      </main>

      <footer className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        &copy; {new Date().getFullYear()} Writer Relocations. All rights reserved.
      </footer>
    </div>
  );
};
