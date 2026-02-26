import React, { useState, useEffect } from 'react';
import { Job, JobStatus, UserProfile, Personnel, Vehicle } from '../types';
import { Plus, X, Bus, User, MapPin, Navigation, Trash2, Edit2, CheckCircle2, AlertCircle, ArrowRight, Users, Settings } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { getUAEToday } from '../utils';

interface TransporterProps {
  jobs: Job[];
  onAddJob: (job: Partial<Job>) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: string) => void;
  currentUser: UserProfile;
  personnel?: Personnel[];
  vehicles?: Vehicle[];
}

export const Transporter: React.FC<TransporterProps> = ({
  jobs,
  onAddJob,
  onEditJob,
  onDeleteJob,
  currentUser,
  personnel = [],
  vehicles = []
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getUAEToday());
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [newService, setNewService] = useState({
    id: 'TR-',
    job_date: selectedDate,
    vehicle: '',
    driver: '',
    crew: [] as string[],
    drop_off_locations: [] as string[],
    status: 'Scheduled' as 'Scheduled' | 'In Transit' | 'Completed'
  });

  const [newLocation, setNewLocation] = useState('');

  // Filter for Transporter jobs
  const transporterJobs = jobs.filter(j => (j.is_transporter || j.id.startsWith('TR-')) && j.job_date === selectedDate);

  const drivers = personnel.filter(p => p.type === 'Driver' || p.type === 'Team Leader');
  const availableCrew = personnel.filter(p => p.type !== 'Driver'); // Everyone else can be crew

  useEffect(() => {
    if (!isEditing && !showModal) {
      setNewService(prev => ({ ...prev, job_date: selectedDate }));
    }
  }, [selectedDate, isEditing, showModal]);

  const generateUniqueId = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    setNewService(prev => ({ ...prev, id: `TR-${random}` }));
  };

  const handleAddLocation = () => {
    if (newLocation.trim()) {
      setNewService(prev => ({
        ...prev,
        drop_off_locations: [...prev.drop_off_locations, newLocation.trim()]
      }));
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (index: number) => {
    setNewService(prev => ({
      ...prev,
      drop_off_locations: prev.drop_off_locations.filter((_, i) => i !== index)
    }));
  };

  const handleOptimizeRoute = async () => {
    if (newService.drop_off_locations.length < 2) return;
    
    setIsOptimizing(true);
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = genAI.models.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        I have a list of drop-off locations for a van service. Please reorder them in the most logical and efficient driving route sequence, assuming the first location is the starting point (or if not specified, start with the most logical one).
        
        Locations:
        ${newService.drop_off_locations.map((loc, i) => `${i + 1}. ${loc}`).join('\n')}
        
        Return ONLY the reordered list of locations as a JSON array of strings. Do not include any other text or markdown formatting.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up the response to ensure it's valid JSON
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const optimizedLocations = JSON.parse(jsonStr);

      if (Array.isArray(optimizedLocations)) {
        setNewService(prev => ({
          ...prev,
          drop_off_locations: optimizedLocations
        }));
      }
    } catch (error) {
      console.error("Failed to optimize route:", error);
      alert("Could not optimize route. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      shipper_name: `Transport: ${newService.vehicle}`, // Use as title
      job_date: newService.job_date,
      vehicles: [newService.vehicle],
      team_leader: newService.driver, // Using team_leader field for driver
      writer_crew: newService.crew,
      drop_off_locations: newService.drop_off_locations,
      transporter_status: newService.status,
      is_transporter: true,
      loading_type: 'Local Storage', // Default
      priority: 'MEDIUM',
      status: JobStatus.ACTIVE
    };

    if (isEditing) {
      const originalJob = jobs.find(j => j.id === newService.id);
      if (originalJob) {
        onEditJob({
          ...originalJob,
          ...payload
        });
      }
    } else {
      onAddJob({
        ...payload,
        id: newService.id,
        title: newService.id,
      });
    }
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNewService({
      id: 'TR-',
      job_date: selectedDate,
      vehicle: '',
      driver: '',
      crew: [],
      drop_off_locations: [],
      status: 'Scheduled'
    });
    setNewLocation('');
    setIsEditing(false);
  };

  const openEditModal = (job: Job) => {
    setNewService({
      id: job.id,
      job_date: job.job_date,
      vehicle: job.vehicles?.[0] || '',
      driver: job.team_leader || '',
      crew: job.writer_crew || [],
      drop_off_locations: job.drop_off_locations || [],
      status: job.transporter_status || 'Scheduled'
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const toggleCrew = (name: string) => {
    setNewService(prev => {
      const exists = prev.crew.includes(name);
      if (exists) return { ...prev, crew: prev.crew.filter(c => c !== name) };
      return { ...prev, crew: [...prev.crew, name] };
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Bus className="w-8 h-8 text-blue-600" />
            Transporter Module
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage crew transportation and route optimization</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="relative">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              />
           </div>
           <button 
             onClick={() => { resetForm(); generateUniqueId(); setShowModal(true); }}
             className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase text-xs tracking-widest shadow-lg shadow-blue-200"
           >
             <Plus className="w-4 h-4" /> Add Service
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {transporterJobs.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-32 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Bus className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-400">No transport services scheduled for {selectedDate}</h3>
          </div>
        ) : (
          transporterJobs.map(job => (
            <div key={job.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">{job.id}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                    job.transporter_status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                    job.transporter_status === 'In Transit' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {job.transporter_status || 'Scheduled'}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => openEditModal(job)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                   <button onClick={() => onDeleteJob(job.id)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <Bus className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</p>
                      <p className="text-sm font-bold text-slate-800">{job.vehicles?.[0] || 'Unassigned'}</p>
                   </div>
                </div>

                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <User className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crew Leader</p>
                      <p className="text-sm font-bold text-slate-800">{job.team_leader || 'Unassigned'}</p>
                   </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Users className="w-3 h-3" /> Crew ({job.writer_crew?.length || 0})
                   </p>
                   <div className="flex flex-wrap gap-1">
                      {job.writer_crew?.map((c, i) => (
                        <span key={i} className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{c}</span>
                      ))}
                   </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Route ({job.drop_off_locations?.length || 0} Stops)
                   </p>
                   <div className="space-y-2 relative pl-4 border-l-2 border-slate-200 ml-1.5">
                      {job.drop_off_locations?.slice(0, 3).map((loc, i) => (
                        <div key={i} className="relative">
                           <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-500"></span>
                           <p className="text-xs font-medium text-slate-600 truncate">{loc}</p>
                        </div>
                      ))}
                      {(job.drop_off_locations?.length || 0) > 3 && (
                        <p className="text-[10px] font-bold text-blue-500 pl-2">+ {(job.drop_off_locations?.length || 0) - 3} more stops</p>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">{isEditing ? 'Edit Service' : 'New Van Service'}</h3>
                <p className="text-sm text-slate-400 font-medium">Schedule transport for {selectedDate}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Service ID</label>
                    <input type="text" disabled value={newService.id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select 
                      value={newService.status} 
                      onChange={(e) => setNewService({...newService, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vehicle</label>
                    <select 
                      value={newService.vehicle} 
                      onChange={(e) => setNewService({...newService, vehicle: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Van</option>
                      {vehicles.map(v => <option key={v.id} value={v.name}>{v.name} ({v.plate})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Crew Leader</label>
                    <select 
                      value={newService.driver} 
                      onChange={(e) => setNewService({...newService, driver: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Crew Leader</option>
                      {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Crew Members</label>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-h-40 overflow-y-auto custom-scrollbar grid grid-cols-2 md:grid-cols-3 gap-2">
                     {availableCrew.map(c => (
                        <label key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${newService.crew.includes(c.name) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                           <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={newService.crew.includes(c.name)} onChange={() => toggleCrew(c.name)} />
                           <span className="text-xs font-bold text-slate-700 truncate">{c.name}</span>
                        </label>
                     ))}
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Drop-off Locations</label>
                     <button 
                       type="button" 
                       onClick={handleOptimizeRoute}
                       disabled={isOptimizing || newService.drop_off_locations.length < 2}
                       className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
                     >
                       {isOptimizing ? <Settings className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                       Optimize Route
                     </button>
                  </div>
                  
                  <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={newLocation} 
                       onChange={(e) => setNewLocation(e.target.value)} 
                       onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                       placeholder="Enter location address..." 
                       className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                     />
                     <button type="button" onClick={handleAddLocation} className="px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all">
                        <Plus className="w-5 h-5" />
                     </button>
                  </div>

                  <div className="space-y-2">
                     {newService.drop_off_locations.map((loc, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 group">
                           <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                              {index + 1}
                           </div>
                           <span className="flex-1 text-sm font-medium text-slate-700">{loc}</span>
                           <button onClick={() => handleRemoveLocation(index)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-4 h-4" />
                           </button>
                        </div>
                     ))}
                     {newService.drop_off_locations.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs italic">No locations added yet.</div>
                     )}
                  </div>
               </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex gap-4 shrink-0">
               <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest">Cancel</button>
               <button onClick={handleSubmit} className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest">
                  {isEditing ? 'Update Service' : 'Schedule Service'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
