
import React, { useState, useEffect } from 'react';
import { Job, JobStatus, TrackingStepDetails } from '../types';
import { Search, Map, Truck, Globe, FileCheck, Home, CheckCircle2, Share2, Package, Save, Loader2, Phone, User, Building2, FileText, Check, MessageSquare, Copy, ExternalLink, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface TrackingViewProps {
  jobs: Job[];
  onUpdateJob?: (job: Job) => void;
  logo?: string;
}

const STEPS = [
  { id: 1, label: 'Origin Country', subLabel: 'Carrier Service', icon: Truck },
  { id: 2, label: 'Customs Clearance', subLabel: '& Departure', icon: FileCheck },
  { id: 3, label: 'International Transit', subLabel: 'Plane or Ship', icon: Globe },
  { id: 4, label: 'Destination Customs', subLabel: 'Clearance', icon: FileCheck },
  { id: 5, label: 'Final Delivery', subLabel: 'Carrier', icon: Home },
];

export const TrackingView: React.FC<TrackingViewProps> = ({ jobs, onUpdateJob, logo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Share / Preview States
  const [showShareModal, setShowShareModal] = useState(false);
  const [isClientPreview, setIsClientPreview] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // Form State for specific step details
  const [stepNotes, setStepNotes] = useState('');

  const filteredJobs = jobs.filter(j => 
    (j.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
     j.shipper_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
    j.status !== JobStatus.REJECTED
  );

  // Sync form data when selecting a step
  useEffect(() => {
    if (selectedJob && editingStepId) {
      const stepData = selectedJob.tracking_data?.[editingStepId.toString()] || {};
      // Concatenate old fields if they exist and notes is empty, for backward compatibility
      let initialNotes = stepData.notes || '';
      
      // Migration logic for display: If we have old structured data but no notes, combine them
      if (!initialNotes && (stepData.partner_name || stepData.contact_person || stepData.phone)) {
          const parts = [];
          if (stepData.partner_name) parts.push(`Partner: ${stepData.partner_name}`);
          if (stepData.contact_person) parts.push(`Contact: ${stepData.contact_person}`);
          if (stepData.phone) parts.push(`Phone: ${stepData.phone}`);
          initialNotes = parts.join('\n');
      }

      setStepNotes(initialNotes);
    }
  }, [editingStepId, selectedJob]);

  // If selected job updates in parent, update local reference
  useEffect(() => {
    if (selectedJob) {
        const updated = jobs.find(j => j.id === selectedJob.id);
        if (updated) setSelectedJob(updated);
    }
  }, [jobs]);

  const currentStep = selectedJob?.tracking_current_step || 1;

  const handleStepClick = (stepId: number) => {
    setEditingStepId(stepId);
  };

  const handleSaveStepDetails = async () => {
    if (!selectedJob || !editingStepId) return;
    setIsSaving(true);

    try {
        // We only save 'notes' now
        const updatedData = {
            ...selectedJob.tracking_data,
            [editingStepId]: {
                notes: stepNotes,
                updated_at: new Date().toISOString()
            }
        };

        const { error } = await supabase
            .from('jobs')
            .update({ 
                tracking_data: updatedData,
            })
            .eq('id', selectedJob.id);

        if (error) throw error;

        // Optimistic update
        const updatedJob = { ...selectedJob, tracking_data: updatedData };
        setSelectedJob(updatedJob);
        if (onUpdateJob) onUpdateJob(updatedJob);
        
    } catch (err: any) {
        console.error("Error saving tracking details:", err);
        alert("Failed to save details: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleSetCurrentStage = async () => {
      if (!selectedJob || !editingStepId) return;
      setIsSaving(true);
      try {
          const { error } = await supabase.from('jobs').update({ tracking_current_step: editingStepId }).eq('id', selectedJob.id);
          if (error) throw error;
          
          const updatedJob = { ...selectedJob, tracking_current_step: editingStepId };
          setSelectedJob(updatedJob);
          if (onUpdateJob) onUpdateJob(updatedJob);
      } catch (err: any) {
          alert("Error updating stage: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleShare = () => {
    if (!selectedJob) return;
    // Simulate a secure link generation
    const mockToken = btoa(selectedJob.id + Date.now()).substring(0, 12);
    setGeneratedLink(`https://portal.logisync.com/track/${selectedJob.id}?token=${mockToken}`);
    setShowShareModal(true);
  };

  // --- RENDER CLIENT PREVIEW MODE ---
  if (isClientPreview && selectedJob) {
      const activeStepData = selectedJob.tracking_data?.[currentStep.toString()];
      const lastUpdated = activeStepData?.updated_at ? new Date(activeStepData.updated_at).toLocaleString() : 'Just now';
      const statusNotes = activeStepData?.notes || 'Processing...';

      return (
          <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative rounded-[2rem] border border-slate-200 shadow-sm animate-in zoom-in-95 duration-300">
              {/* Client Header */}
              <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center sticky top-0 z-20">
                  <div className="flex items-center gap-4">
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
                  <button 
                    onClick={() => setIsClientPreview(false)}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  >
                      <X className="w-4 h-4" /> Close Preview
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 max-w-5xl mx-auto w-full">
                  
                  {/* Job Header Card */}
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between gap-8 items-start">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">ID: {selectedJob.id}</span>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedJob.job_date).toLocaleDateString()}</span>
                          </div>
                          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-2">{selectedJob.shipper_name}</h1>
                          <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                              <Map className="w-4 h-4" /> {selectedJob.location || 'Origin Pending'} 
                              <span className="mx-2">•</span> 
                              <Package className="w-4 h-4" /> {selectedJob.volume_cbm} CBM
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                          <p className="text-2xl font-bold text-blue-600">{STEPS[currentStep - 1].label}</p>
                          <p className="text-xs font-medium text-slate-400 mt-1">Last Update: {lastUpdated}</p>
                      </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 mb-8 overflow-x-auto">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-3 mb-6">
                              <MessageSquare className="w-5 h-5 text-blue-600" />
                              Latest Updates
                          </h3>
                          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
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

              </div>
          </div>
      );
  }

  // --- RENDER ADMIN EDITOR MODE ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-4">
            {logo && (
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm hidden md:block">
                    <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
                </div>
            )}
            <div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Shipment Tracking</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Real-time status updates and client visibility</p>
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0">
        {/* Sidebar List */}
        <div className="lg:w-1/3 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search Shipment ID..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {filteredJobs.map(job => (
                    <div 
                        key={job.id}
                        onClick={() => { setSelectedJob(job); setEditingStepId(null); }}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                            selectedJob?.id === job.id 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedJob?.id === job.id ? 'text-blue-600' : 'text-slate-400'}`}>{job.id}</span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{job.job_date}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mb-1">{job.shipper_name}</h4>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Map className="w-3 h-3" />
                            <span className="truncate">{job.location || 'Location Pending'}</span>
                        </div>
                    </div>
                ))}
                {filteredJobs.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm font-medium">No shipments found.</div>
                )}
            </div>
        </div>

        {/* Visual Tracker Area */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
            {selectedJob ? (
                <>
                    <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-black text-slate-800">{selectedJob.shipper_name}</h3>
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">{selectedJob.id}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                <Package className="w-4 h-4" /> 
                                {selectedJob.shipment_details || 'Shipment'} • {selectedJob.volume_cbm || 0} CBM
                            </p>
                        </div>
                        <button 
                            onClick={handleShare}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                        >
                            <Share2 className="w-4 h-4" />
                            Share Tracking
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-8 md:p-12 pb-0 flex flex-col items-center">
                            <div className="text-center mb-12">
                                <h4 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Where is your package?</h4>
                                <p className="text-slate-500 font-medium mt-2 max-w-md mx-auto">
                                    Current Status: <span className="text-blue-600 font-bold">{STEPS[currentStep - 1].label}</span>
                                </p>
                            </div>

                            {/* Visual Process Flow */}
                            <div className="w-full max-w-5xl mb-12">
                                <div className="flex flex-col md:flex-row items-center justify-between relative gap-8 md:gap-0">
                                    {/* Connecting Line (Desktop) */}
                                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-2 bg-slate-100 -z-10 -translate-y-1/2 rounded-full"></div>
                                    <div 
                                        className="hidden md:block absolute top-1/2 left-0 h-2 bg-gradient-to-r from-blue-400 to-blue-600 -z-10 -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                                    ></div>

                                    {STEPS.map((step, index) => {
                                        const isCompleted = step.id <= currentStep;
                                        const isCurrent = step.id === currentStep;
                                        const isEditing = editingStepId === step.id;
                                        
                                        return (
                                            <div 
                                                key={step.id} 
                                                className="flex flex-col items-center relative group cursor-pointer"
                                                onClick={() => handleStepClick(step.id)}
                                            >
                                                <div 
                                                    className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300 z-10 bg-white ${
                                                        isEditing ? 'ring-4 ring-blue-200 border-blue-600' :
                                                        isCompleted ? 'border-blue-500 text-blue-600 shadow-lg shadow-blue-200' : 'border-slate-200 text-slate-300 hover:border-blue-300'
                                                    }`}
                                                >
                                                    <step.icon className={`w-8 h-8 md:w-10 md:h-10 ${isCurrent && !isEditing ? 'animate-pulse' : ''}`} />
                                                    
                                                    {/* Checkmark for completed steps */}
                                                    {isCompleted && step.id < currentStep && (
                                                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-1 border-2 border-white">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="mt-4 text-center">
                                                    <p className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${isCompleted ? 'text-slate-800' : 'text-slate-300'}`}>
                                                        {step.label}
                                                    </p>
                                                    <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wide mt-1 ${isCompleted ? 'text-blue-500' : 'text-slate-300'}`}>
                                                        {step.subLabel}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Step Details Editor */}
                        {editingStepId && (
                            <div className="bg-slate-50 border-t border-slate-200 p-8 animate-in slide-in-from-bottom-4">
                                <div className="max-w-4xl mx-auto">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                {React.createElement(STEPS.find(s => s.id === editingStepId)?.icon || Truck, { className: "w-5 h-5 text-blue-600" })}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-lg">{STEPS.find(s => s.id === editingStepId)?.label} Details</h4>
                                                <p className="text-xs text-slate-500 font-medium">Update client visibility and tracking notes</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {currentStep !== editingStepId && (
                                                <button 
                                                    onClick={handleSetCurrentStage}
                                                    disabled={isSaving}
                                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm"
                                                >
                                                    Mark as Current Stage
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleSaveStepDetails}
                                                disabled={isSaving}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Save Details
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <MessageSquare className="w-3 h-3" /> Client Update / Status Details
                                            </label>
                                            <textarea 
                                                rows={6}
                                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                                                placeholder="Enter full status details here (e.g., Partner Name, Contact Person, Phone, Flight Details, Location)..."
                                                value={stepNotes}
                                                onChange={(e) => setStepNotes(e.target.value)}
                                            />
                                            <p className="text-[10px] text-slate-400 text-right">
                                                Tip: Paste full partner details, flight numbers, or tracking URLs here.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {selectedJob.tracking_data?.[editingStepId.toString()]?.updated_at && (
                                        <p className="text-right text-[10px] text-slate-400 font-medium mt-2">
                                            Last updated: {new Date(selectedJob.tracking_data[editingStepId.toString()].updated_at!).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Map className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Select a Shipment</h3>
                    <p className="text-slate-400 font-medium mt-2 max-w-xs mx-auto">
                        Choose a job from the list to view its journey and update tracking status.
                    </p>
                </div>
            )}
        </div>

        {/* Share Link Modal */}
        {showShareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800">Tracking Link Generated</h3>
                        <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-4 font-medium">Share this read-only link with your client:</p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-center gap-3">
                        <div className="flex-1 truncate text-xs font-mono text-slate-600 bg-white p-2 rounded border border-slate-100">
                            {generatedLink}
                        </div>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(generatedLink);
                                alert("Link copied!");
                            }}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Copy Link"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => {
                                setShowShareModal(false);
                                setIsClientPreview(true);
                            }}
                            className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                        >
                            <ExternalLink className="w-4 h-4" /> Preview Client View
                        </button>
                        <button 
                            onClick={() => setShowShareModal(false)}
                            className="py-3 text-slate-400 font-bold uppercase text-xs tracking-widest hover:text-slate-600"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
