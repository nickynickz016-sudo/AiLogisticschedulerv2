
import React, { useState } from 'react';
import { Job, UserProfile } from '../types';
import { X, Package, Truck, User, Users, Clock, Calendar, MapPin, Tag, CheckSquare, FileText, Wind, Anchor, Phone, Mail, Send, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  users: UserProfile[];
}

const DetailItem: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; className?: string }> = ({ icon: Icon, label, value, className }) => (
  <div className={`flex items-start gap-4 ${className}`}>
    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
      <Icon className="w-5 h-5 text-slate-400" />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-800 leading-tight">{value || 'N/A'}</p>
    </div>
  </div>
);

const RequestItem: React.FC<{ label: string; requested: boolean }> = ({ label, requested }) => (
  <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${requested ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'} border`}>
    <CheckSquare className={`w-4 h-4 shrink-0 ${requested ? 'text-blue-600' : 'text-slate-300'}`} />
    <span className={`text-xs font-bold ${requested ? 'text-blue-800' : 'text-slate-400'}`}>{label}</span>
  </div>
);

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, users }) => {
  const [isSending, setIsSending] = useState(false);
  const requester = users.find(u => u.employee_id === job.requester_id);

  const getStatusInfo = () => {
    switch (job.status) {
      case 'ACTIVE': return { text: 'Active & Authorized', color: 'bg-emerald-100 text-emerald-700' };
      case 'PENDING_ADD': return { text: 'Pending Authorization', color: 'bg-amber-100 text-amber-700' };
      case 'PENDING_DELETE': return { text: 'Pending Removal', color: 'bg-rose-100 text-rose-700' };
      case 'COMPLETED': return { text: 'Completed', color: 'bg-slate-100 text-slate-700' };
      case 'REJECTED': return { text: 'Rejected', color: 'bg-rose-100 text-rose-700' };
      default: return { text: job.status, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const handleNotifyClient = async () => {
    if (!job.client_email && !job.shipper_phone) {
        alert("No client email or phone number found.");
        return;
    }
    
    setIsSending(true);
    try {
        const { error } = await supabase.functions.invoke('notify-client', {
            body: { 
                jobId: job.id,
                status: job.status,
                shipperName: job.shipper_name,
                email: job.client_email,
                phone: job.shipper_phone,
                jobDate: job.job_date
            }
        });

        if (error) throw error;
        alert("Alert sent successfully via Email and WhatsApp (if configured).");
    } catch (error: any) {
        console.error('Error sending alert:', error);
        alert(`Failed to send alert: ${error.message || 'Unknown error'}`);
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] h-full md:h-auto overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 border-b bg-slate-50/50 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${getStatusInfo().color}`}>{getStatusInfo().text}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Job ID: {job.id}</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mt-2">{job.shipper_name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleNotifyClient} 
                disabled={isSending}
                className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
            >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Alert
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
          </div>
        </div>
        
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-10">
          {/* Core Details */}
          <section>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Core Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailItem icon={User} label="Requester" value={requester?.name || `#${job.requester_id}`} />
              <DetailItem icon={Phone} label="Shipper Phone" value={job.shipper_phone} />
              <DetailItem icon={Mail} label="Client Email" value={job.client_email} />
              <DetailItem icon={Calendar} label="Date" value={new Date(job.job_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
              <DetailItem icon={Clock} label="Time" value={job.job_time} />
              <DetailItem icon={Tag} label="Priority" value={job.priority} />
              <DetailItem icon={MapPin} label="Location" value={job.location} />
            </div>
          </section>

          {/* Shipment Specs */}
          <section>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 pt-8 border-t border-slate-100">Shipment Specifications</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailItem icon={Package} label="Shipment Details" value={job.shipment_details} />
              <DetailItem icon={Anchor} label="Loading Type" value={job.loading_type} />
              <DetailItem icon={Wind} label="Volume (CBM)" value={`${job.volume_cbm ?? 0} m³`} />
              <DetailItem icon={Truck} label="Shuttle Required" value={job.shuttle} />
              <DetailItem icon={Users} label="Long Carry" value={job.long_carry} />
            </div>
          </section>

          {/* Allocation */}
          <section>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 pt-8 border-t border-slate-100">Allocation Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailItem icon={User} label="Team Leader" value={job.team_leader} />
              <DetailItem icon={Truck} label="Vehicles" value={job.vehicles?.join(', ')} />
              <DetailItem icon={Users} label="Assigned Crew" value={job.writer_crew?.join(', ')} />
            </div>
          </section>

          {/* Requests */}
          <section>
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 pt-8 border-t border-slate-100">Special Requirements</h4>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
               <RequestItem label="Handyman Service" requested={job.special_requests?.handyman ?? false} />
               <RequestItem label="Extra Manpower" requested={job.special_requests?.manpower ?? false} />
               <RequestItem label="Overtime Policy" requested={job.special_requests?.overtime ?? false} />
               <RequestItem label="Main Documentation" requested={job.special_requests?.documents ?? false} />
               <RequestItem label="Packing List / Inventory" requested={job.special_requests?.packingList ?? false} />
               <RequestItem label="Crate Certificate" requested={job.special_requests?.crateCertificate ?? false} />
               <RequestItem label="Walk-through" requested={job.special_requests?.walkThrough ?? false} />
             </div>
          </section>
          
          <div className="sm:hidden pt-4">
             <button 
                onClick={handleNotifyClient} 
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
            >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Alert to Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
