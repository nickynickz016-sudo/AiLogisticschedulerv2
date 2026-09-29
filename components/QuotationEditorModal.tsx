import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  CheckCircle, 
  Lock, 
  Unlock, 
  Download, 
  Plus, 
  Trash2, 
  Copy, 
  FileText, 
  Calendar, 
  User, 
  MapPin, 
  Ship, 
  Box, 
  DollarSign, 
  Sparkles, 
  ExternalLink,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  Quotation, 
  QuotationFormat, 
  QuotationStatus, 
  QuotationLineItem, 
  QuotationBulletItem,
  Job,
  DEFAULT_FCL_INCLUSIONS,
  DEFAULT_FCL_EXCLUSIONS,
  DEFAULT_FCL_SPECIAL_NOTES,
  DEFAULT_GROUPAGE_INCLUSIONS,
  DEFAULT_GROUPAGE_EXCLUSIONS,
  DEFAULT_GROUPAGE_SPECIAL_NOTES,
  UserProfile,
  BranchCode,
  BRANCHES
} from '../types';
import { QuotationDownloadModal } from './QuotationDownloadModal';

interface QuotationEditorModalProps {
  quotation: Quotation | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quotation) => void;
  jobs?: Job[];
  currentUser?: UserProfile | null;
  logo?: string;
  activeBranch?: BranchCode;
}

export const QuotationEditorModal: React.FC<QuotationEditorModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onSave,
  jobs = [],
  currentUser,
  logo,
  activeBranch = 'UAE'
}) => {
  if (!isOpen) return null;

  // Local state for the quotation form
  const [formData, setFormData] = useState<Quotation>(() => {
    if (quotation) return JSON.parse(JSON.stringify(quotation));

    // Default new quotation
    const isGrp = false;
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const serial = Math.floor(100 + Math.random() * 900);

    const branchInfo = BRANCHES[activeBranch || 'UAE'] || BRANCHES.UAE;
    const defaultCity = activeBranch === 'KSA' ? 'Riyadh' : activeBranch === 'QATAR' ? 'Doha' : 'Dubai';
    const defaultPort = branchInfo.port || (activeBranch === 'KSA' ? 'Jeddah Islamic Port' : activeBranch === 'QATAR' ? 'Hamad Port, Doha' : 'Jebel Ali Port (AEJEA), Dubai');
    const defaultEmail = `relocations.${(activeBranch || 'uae').toLowerCase()}@writerrelocations.com`;
    const defaultPhone = `${branchInfo.phone_code} ${activeBranch === 'KSA' ? '11 234 5678' : activeBranch === 'QATAR' ? '44 123 456' : '4 885 1234'}`;
    const defaultCurrency = branchInfo.currency;

    return {
      id: `quote-${Date.now()}`,
      branch: activeBranch,
      quotation_no: `WR-${activeBranch}-FCL-2026-${serial}`,
      format: 'FCL_EXPORT',
      title: 'Export Quotation — Full Container Load (FCL)',
      status: 'DRAFT',
      date: today,
      valid_until: expiry,
      prepared_by: currentUser?.name || 'Relocation Specialist',
      contact_email: defaultEmail,
      contact_phone: defaultPhone,

      client_name: '',
      company_name: '',
      client_email: '',
      client_phone: '',
      origin_address: '',
      origin_city: defaultCity,
      origin_country: branchInfo.country,
      destination_address: '',
      destination_city: '',
      destination_country: '',

      service_type: 'Door-to-Door',
      container_size: '20ft General Purpose',
      groupage_mode: 'Shared 40ft HC FCL Groupage',
      estimated_volume_cbm: 25.0,
      estimated_volume_cft: 883,
      estimated_weight_kg: 3200,
      origin_port: defaultPort,
      destination_port: '',
      transit_time: '24 - 30 Days (approx.)',
      commodity_description: 'Used Household Goods & Personal Effects',

      currency: defaultCurrency,
      line_items: [
        {
          id: 'li-1',
          description: 'Origin Services: Export packing, wrapping, dismantling and direct container loading at residence',
          quantity: 1,
          unit: 'Lump Sum',
          unit_price: 6500,
          total_price: 6500,
          currency: defaultCurrency
        },
        {
          id: 'li-2',
          description: `Port Drayage & Customs: Terminal haulage, port handling and ${branchInfo.name} export customs clearance`,
          quantity: 1,
          unit: 'Shipment',
          unit_price: 2200,
          total_price: 2200,
          currency: defaultCurrency
        },
        {
          id: 'li-3',
          description: 'Ocean Freight: Sea freight to destination port of arrival on FCL liner terms',
          quantity: 1,
          unit: 'Container',
          unit_price: 8800,
          total_price: 8800,
          currency: 'AED'
        },
        {
          id: 'li-4',
          description: 'Destination Services: Import customs clearance, residence delivery, room placement and debris removal',
          quantity: 1,
          unit: 'Lump Sum',
          unit_price: 5200,
          total_price: 5200,
          currency: 'AED'
        }
      ],
      subtotal: 22700,
      vat_percent: 0,
      vat_amount: 0,
      total_amount: 22700,
      payment_terms: '100% advance prior to packing / container dispatch',

      inclusions: DEFAULT_FCL_INCLUSIONS.map(i => ({ ...i })),
      exclusions: DEFAULT_FCL_EXCLUSIONS.map(e => ({ ...e })),

      special_notes: DEFAULT_FCL_SPECIAL_NOTES,
      special_notes_bold: true,
      special_notes_highlighted: true,

      terms_and_conditions_url: 'https://www.writerrelocations.com/terms-and-conditions',
      terms_and_conditions_text: 'Writer Relocations Standard Terms and Conditions',
      logo_url: 'https://www.writerrelocations.com',

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentUser?.employee_id || 'SYSTEM'
    };
  });

  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'scope' | 'legal'>('details');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Sync if quotation prop changes
  useEffect(() => {
    if (quotation) {
      setFormData(JSON.parse(JSON.stringify(quotation)));
    }
  }, [quotation]);

  const isFinalized = formData.status === 'FINALIZED';

  // Recalculate totals
  const recalculateTotals = (items: QuotationLineItem[], vatRate: number) => {
    const sub = items.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0);
    const vat = sub * (vatRate / 100);
    const total = sub + vat;
    return {
      subtotal: Math.round(sub * 100) / 100,
      vat_amount: Math.round(vat * 100) / 100,
      total_amount: Math.round(total * 100) / 100
    };
  };

  // Switch format (FCL Export vs Groupage FCL Export)
  const handleFormatChange = (newFormat: QuotationFormat) => {
    if (isFinalized) return;
    if (newFormat === formData.format) return;

    const confirmSwitch = confirm(`Switch quotation format to ${newFormat === 'FCL_EXPORT' ? 'Full Container Load (FCL)' : 'Groupage FCL Consolidation'}? Standard template inclusions, exclusions and default notes will update.`);
    if (!confirmSwitch) return;

    const serial = Math.floor(100 + Math.random() * 900);
    const newNo = newFormat === 'FCL_EXPORT' ? `WR-FCL-2026-${serial}` : `WR-GRP-2026-${serial}`;
    const newTitle = newFormat === 'FCL_EXPORT' ? 'Export Quotation — Full Container Load (FCL)' : 'Export Quotation — Groupage Consolidation in 40ft HC';

    setFormData(prev => ({
      ...prev,
      format: newFormat,
      quotation_no: newNo,
      title: newTitle,
      inclusions: (newFormat === 'FCL_EXPORT' ? DEFAULT_FCL_INCLUSIONS : DEFAULT_GROUPAGE_INCLUSIONS).map(i => ({ ...i })),
      exclusions: (newFormat === 'FCL_EXPORT' ? DEFAULT_FCL_EXCLUSIONS : DEFAULT_GROUPAGE_EXCLUSIONS).map(e => ({ ...e })),
      special_notes: newFormat === 'FCL_EXPORT' ? DEFAULT_FCL_SPECIAL_NOTES : DEFAULT_GROUPAGE_SPECIAL_NOTES,
      container_size: newFormat === 'FCL_EXPORT' ? '20ft General Purpose' : undefined,
      groupage_mode: newFormat === 'GROUPAGE_FCL_EXPORT' ? 'Co-loaded Groupage Consolidation in 40ft HC' : undefined
    }));
  };

  // Line item handlers
  const handleLineItemChange = (index: number, field: keyof QuotationLineItem, value: any) => {
    if (isFinalized) return;
    setFormData(prev => {
      const updated = [...prev.line_items];
      const target = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? Number(value) || 0 : target.quantity;
        const p = field === 'unit_price' ? Number(value) || 0 : target.unit_price;
        target.total_price = Math.round(q * p * 100) / 100;
      }
      updated[index] = target;
      const { subtotal, vat_amount, total_amount } = recalculateTotals(updated, prev.vat_percent);
      return {
        ...prev,
        line_items: updated,
        subtotal,
        vat_amount,
        total_amount
      };
    });
  };

  const handleAddLineItem = () => {
    if (isFinalized) return;
    const newItem: QuotationLineItem = {
      id: `li-${Date.now()}`,
      description: 'New Logistics Service / Additional Charge',
      quantity: 1,
      unit: 'Shipment',
      unit_price: 1000,
      total_price: 1000,
      currency: formData.currency
    };
    setFormData(prev => {
      const updated = [...prev.line_items, newItem];
      const { subtotal, vat_amount, total_amount } = recalculateTotals(updated, prev.vat_percent);
      return { ...prev, line_items: updated, subtotal, vat_amount, total_amount };
    });
  };

  const handleRemoveLineItem = (index: number) => {
    if (isFinalized) return;
    setFormData(prev => {
      const updated = prev.line_items.filter((_, i) => i !== index);
      const { subtotal, vat_amount, total_amount } = recalculateTotals(updated, prev.vat_percent);
      return { ...prev, line_items: updated, subtotal, vat_amount, total_amount };
    });
  };

  // Prefill from existing job
  const handleAutofillJob = (jobId: string) => {
    if (isFinalized || !jobId) return;
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setFormData(prev => ({
      ...prev,
      client_name: job.shipper_name || job.title || prev.client_name,
      client_phone: job.shipper_phone || prev.client_phone,
      client_email: job.client_email || prev.client_email,
      origin_address: job.location || prev.origin_address,
      estimated_volume_cbm: job.volume_cbm ? Number(job.volume_cbm) : prev.estimated_volume_cbm,
      container_size: job.container_number ? `Container: ${job.container_number}` : prev.container_size
    }));
  };

  // Save actions
  const handleSaveDraft = () => {
    const toSave: Quotation = {
      ...formData,
      status: 'DRAFT',
      updated_at: new Date().toISOString()
    };
    onSave(toSave);
    onClose();
  };

  const handleSaveActive = () => {
    if (!formData.client_name.trim()) {
      alert('Please enter Client / Shipper Name');
      return;
    }
    const toSave: Quotation = {
      ...formData,
      branch: formData.branch || activeBranch,
      status: 'SAVED',
      updated_at: new Date().toISOString()
    };
    onSave(toSave);
    onClose();
  };

  const handleFinalize = () => {
    if (!formData.client_name.trim()) {
      alert('Please enter Client / Shipper Name');
      return;
    }
    const confirmed = confirm('Are you sure you want to FINALIZE this quotation? Once finalized, no further edits can be made unless explicitly unlocked by an authorized coordinator.');
    if (!confirmed) return;

    const toSave: Quotation = {
      ...formData,
      branch: formData.branch || activeBranch,
      status: 'FINALIZED',
      finalized_at: new Date().toISOString(),
      finalized_by: currentUser?.name || 'Authorized Coordinator',
      updated_at: new Date().toISOString()
    };
    onSave(toSave);
    onClose();
  };

  const handleUnlock = () => {
    const confirmed = confirm('Unlock this finalized quotation and revert status back to DRAFT for modifications?');
    if (!confirmed) return;

    setFormData(prev => ({
      ...prev,
      status: 'DRAFT',
      finalized_at: undefined,
      finalized_by: undefined
    }));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <FileText className="w-6 h-6 text-[#E31E24]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {formData.quotation_no || 'New Quotation'}
                  </h2>

                  {/* Format Pills */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl">
                    <button
                      type="button"
                      disabled={isFinalized}
                      onClick={() => handleFormatChange('FCL_EXPORT')}
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition ${
                        formData.format === 'FCL_EXPORT' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      FCL Export
                    </button>
                    <button
                      type="button"
                      disabled={isFinalized}
                      onClick={() => handleFormatChange('GROUPAGE_FCL_EXPORT')}
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition ${
                        formData.format === 'GROUPAGE_FCL_EXPORT' 
                          ? 'bg-orange-600 text-white shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Groupage FCL
                    </button>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    formData.status === 'FINALIZED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : formData.status === 'SAVED'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {formData.status === 'FINALIZED' && <Lock className="w-3 h-3" />}
                    {formData.status === 'SAVED' && <CheckCircle className="w-3 h-3" />}
                    {formData.status === 'DRAFT' && <Sparkles className="w-3 h-3" />}
                    {formData.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {formData.format === 'FCL_EXPORT' 
                    ? 'Dedicated Full Container Load Export Quotation with Custom Bullets & Terms' 
                    : 'Consolidated Shared 40ft HC Sea Freight Export Quotation'}
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2 flex-wrap">
              {isFinalized && (
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition"
                  title="Unlock finalized quotation for revision"
                >
                  <Unlock className="w-4 h-4" />
                  Unlock for Edit
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4 text-[#E31E24]" />
                Download PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Locked Notification Banner if Finalized */}
          {isFinalized && (
            <div className="bg-emerald-50 px-6 py-2.5 border-b border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  This quotation is <strong>FINALIZED & LOCKED</strong>. All fields are preserved in read-only mode to prevent unintended alterations.
                  {formData.finalized_by && ` Finalized by ${formData.finalized_by}.`}
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded-lg">
                Read-Only Protection Active
              </span>
            </div>
          )}

          {/* Sub Navigation Tabs */}
          <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'details' 
                    ? 'text-slate-900 border-b-2 border-slate-900' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                1. Quotation & Client Details
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'pricing' 
                    ? 'text-slate-900 border-b-2 border-slate-900' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                2. Pricing & Freight Charges ({formData.line_items.length})
              </button>
              <button
                onClick={() => setActiveTab('scope')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'scope' 
                    ? 'text-slate-900 border-b-2 border-slate-900' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                3. Inclusions, Exclusions & Bullets
              </button>
              <button
                onClick={() => setActiveTab('legal')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'legal' 
                    ? 'text-slate-900 border-b-2 border-slate-900' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                4. Special Notes & Legal Links
              </button>
            </div>

            {/* Quick autofill helper */}
            {!isFinalized && jobs.length > 0 && (
              <div className="flex items-center gap-2 pb-2">
                <span className="text-[11px] font-bold text-slate-400">Prefill from Job:</span>
                <select
                  onChange={(e) => handleAutofillJob(e.target.value)}
                  defaultValue=""
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="" disabled>Select Job to Autofill...</option>
                  {jobs.slice(0, 15).map(j => (
                    <option key={j.id} value={j.id}>
                      {j.id} - {j.shipper_name || j.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">

            {/* TAB 1: DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                
                {/* Meta section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Quotation Identification & Validity</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Quote Reference No</label>
                      <input
                        type="text"
                        disabled={isFinalized}
                        value={formData.quotation_no}
                        onChange={(e) => setFormData(prev => ({ ...prev, quotation_no: e.target.value }))}
                        className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Quotation Date</label>
                      <input
                        type="date"
                        disabled={isFinalized}
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Valid Until</label>
                      <input
                        type="date"
                        disabled={isFinalized}
                        value={formData.valid_until}
                        onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Prepared By (Coordinator)</label>
                      <input
                        type="text"
                        disabled={isFinalized}
                        value={formData.prepared_by}
                        onChange={(e) => setFormData(prev => ({ ...prev, prepared_by: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Shipper / Client Profile</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Client Full Name *</label>
                      <input
                        type="text"
                        disabled={isFinalized}
                        value={formData.client_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                        placeholder="e.g. John & Sarah Doe"
                        className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Company / Corporate Account</label>
                      <input
                        type="text"
                        disabled={isFinalized}
                        value={formData.company_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="Optional corporate sponsor"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Client Email</label>
                      <input
                        type="email"
                        disabled={isFinalized}
                        value={formData.client_email || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                        placeholder="client@example.com"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Client Phone</label>
                      <input
                        type="tel"
                        disabled={isFinalized}
                        value={formData.client_phone || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                        placeholder="+971 50 123 4567"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                  </div>

                  {/* Origin & Destination Addresses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Origin Location (Pick-up)</span>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Origin Street Address / Villa</label>
                        <input
                          type="text"
                          disabled={isFinalized}
                          value={formData.origin_address}
                          onChange={(e) => setFormData(prev => ({ ...prev, origin_address: e.target.value }))}
                          placeholder="e.g. Villa 12, Springs 5"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">City</label>
                          <input
                            type="text"
                            disabled={isFinalized}
                            value={formData.origin_city}
                            onChange={(e) => setFormData(prev => ({ ...prev, origin_city: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Country</label>
                          <input
                            type="text"
                            disabled={isFinalized}
                            value={formData.origin_country}
                            onChange={(e) => setFormData(prev => ({ ...prev, origin_country: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Destination Location (Delivery)</span>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Address / Residence</label>
                        <input
                          type="text"
                          disabled={isFinalized}
                          value={formData.destination_address}
                          onChange={(e) => setFormData(prev => ({ ...prev, destination_address: e.target.value }))}
                          placeholder="e.g. 14 High Street, Richmond"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">City</label>
                          <input
                            type="text"
                            disabled={isFinalized}
                            value={formData.destination_city}
                            onChange={(e) => setFormData(prev => ({ ...prev, destination_city: e.target.value }))}
                            placeholder="e.g. London"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Country</label>
                          <input
                            type="text"
                            disabled={isFinalized}
                            value={formData.destination_country}
                            onChange={(e) => setFormData(prev => ({ ...prev, destination_country: e.target.value }))}
                            placeholder="e.g. United Kingdom"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cargo & Shipment Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Ship className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Shipment & Equipment Parameters</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Service Scope</label>
                      <select
                        disabled={isFinalized}
                        value={formData.service_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value as any }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      >
                        <option value="Door-to-Door">Door-to-Door Standard</option>
                        <option value="Door-to-Port">Door-to-Port</option>
                        <option value="Port-to-Door">Port-to-Door</option>
                        <option value="Port-to-Port">Port-to-Port</option>
                      </select>
                    </div>

                    {formData.format === 'FCL_EXPORT' ? (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Container Size</label>
                        <select
                          disabled={isFinalized}
                          value={formData.container_size || '20ft General Purpose'}
                          onChange={(e) => setFormData(prev => ({ ...prev, container_size: e.target.value }))}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                        >
                          <option value="20ft General Purpose (GP)">20ft General Purpose (GP)</option>
                          <option value="40ft General Purpose (GP)">40ft General Purpose (GP)</option>
                          <option value="40ft High Cube (HC)">40ft High Cube (HC)</option>
                          <option value="2x 40ft High Cube (HC)">2x 40ft High Cube (HC)</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Groupage Mode</label>
                        <input
                          type="text"
                          disabled={isFinalized}
                          value={formData.groupage_mode || 'Shared 40ft HC FCL Groupage'}
                          onChange={(e) => setFormData(prev => ({ ...prev, groupage_mode: e.target.value }))}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Estimated Volume (CBM)</label>
                      <input
                        type="number"
                        step="0.1"
                        disabled={isFinalized}
                        value={formData.estimated_volume_cbm || ''}
                        onChange={(e) => {
                          const cbm = parseFloat(e.target.value) || 0;
                          const cft = Math.round(cbm * 35.315);
                          setFormData(prev => ({ ...prev, estimated_volume_cbm: cbm, estimated_volume_cft: cft }));
                        }}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Estimated Gross Weight (KG)</label>
                      <input
                        type="number"
                        disabled={isFinalized}
                        value={formData.estimated_weight_kg || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_weight_kg: parseInt(e.target.value) || 0 }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Origin Port</label>
                      <input
                        type="text"
                        disabled={isFinalized}
                        value={formData.origin_port || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, origin_port: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Destination Port</label>
                      <input
                        type="text"
                        disabled={isFinalized}
                        value={formData.destination_port || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, destination_port: e.target.value }))}
                        placeholder="e.g. Southampton Port, UK"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Transit Time Estimate</label>
                      <input
                        type="text"
                        disabled={isFinalized}
                        value={formData.transit_time || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, transit_time: e.target.value }))}
                        placeholder="e.g. 24 - 30 Days (approx.)"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: PRICING & LINE ITEMS */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Itemized Logistics & Ocean Freight Schedule
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Currency:</span>
                        <select
                          disabled={isFinalized}
                          value={formData.currency}
                          onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                          className="text-xs font-bold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400"
                        >
                          <option value="AED">AED (UAE Dirhams)</option>
                          <option value="USD">USD (US Dollars)</option>
                          <option value="EUR">EUR (Euros)</option>
                          <option value="GBP">GBP (British Pounds)</option>
                        </select>
                      </div>

                      {!isFinalized && (
                        <button
                          type="button"
                          onClick={handleAddLineItem}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Line Item
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-2 px-2 w-8">#</th>
                          <th className="py-2 px-2">Service Description</th>
                          <th className="py-2 px-2 w-20 text-center">Qty</th>
                          <th className="py-2 px-2 w-28 text-center">Unit</th>
                          <th className="py-2 px-2 w-32 text-right">Unit Rate ({formData.currency})</th>
                          <th className="py-2 px-2 w-32 text-right">Total ({formData.currency})</th>
                          {!isFinalized && <th className="py-2 px-2 w-10"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.line_items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-2">
                              <input
                                type="text"
                                disabled={isFinalized}
                                value={item.description}
                                onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min="1"
                                disabled={isFinalized}
                                value={item.quantity}
                                onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                                className="w-full text-xs text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <select
                                disabled={isFinalized}
                                value={item.unit}
                                onChange={(e) => handleLineItemChange(idx, 'unit', e.target.value)}
                                className="w-full text-xs text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                              >
                                <option value="Lump Sum">Lump Sum</option>
                                <option value="Shipment">Shipment</option>
                                <option value="Container">Container</option>
                                <option value="CBM">CBM</option>
                                <option value="CFT">CFT</option>
                                <option value="KG">KG</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                step="any"
                                disabled={isFinalized}
                                value={item.unit_price}
                                onChange={(e) => handleLineItemChange(idx, 'unit_price', e.target.value)}
                                className="w-full text-xs text-right px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 disabled:opacity-70 font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800">
                              {Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            {!isFinalized && (
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(idx)}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pt-4 border-t border-slate-200">
                    <div className="w-full sm:max-w-md space-y-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase">Payment Terms</label>
                      <input
                        type="text"
                        disabled={isFinalized}
                        value={formData.payment_terms || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-slate-400 disabled:opacity-70"
                      />
                    </div>

                    <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 font-mono text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-bold">{formData.currency} {formData.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          VAT / Taxes:
                          <input
                            type="number"
                            min="0"
                            max="100"
                            disabled={isFinalized}
                            value={formData.vat_percent}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value) || 0;
                              const { subtotal, vat_amount, total_amount } = recalculateTotals(formData.line_items, rate);
                              setFormData(prev => ({ ...prev, vat_percent: rate, vat_amount, total_amount }));
                            }}
                            className="w-12 text-center text-xs px-1 py-0.5 bg-white border border-slate-200 rounded font-mono"
                          />
                          %
                        </span>
                        <span>{formData.currency} {formData.vat_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-[#E31E24]">
                        <span>Grand Total:</span>
                        <span>{formData.currency} {formData.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INCLUSIONS & EXCLUSIONS BULLET EDITOR */}
            {activeTab === 'scope' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Inclusions */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Inclusions (Bulletized)
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {formData.inclusions.filter(i => i.included).length} active bullets
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Toggle checkmarks to include/exclude specific bullets in the printed PDF quotation.
                  </p>

                  <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                    {formData.inclusions.map((item, idx) => (
                      <div key={item.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-200/80">
                        <input
                          type="checkbox"
                          disabled={isFinalized}
                          checked={item.included}
                          onChange={(e) => {
                            const updated = [...formData.inclusions];
                            updated[idx] = { ...item, included: e.target.checked };
                            setFormData(prev => ({ ...prev, inclusions: updated }));
                          }}
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer disabled:opacity-60"
                        />
                        <input
                          type="text"
                          disabled={isFinalized}
                          value={item.text}
                          onChange={(e) => {
                            const updated = [...formData.inclusions];
                            updated[idx] = { ...item, text: e.target.value };
                            setFormData(prev => ({ ...prev, inclusions: updated }));
                          }}
                          className="flex-1 text-xs text-slate-800 bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded p-0.5 disabled:opacity-70"
                        />
                        {!isFinalized && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.inclusions.filter((_, i) => i !== idx);
                              setFormData(prev => ({ ...prev, inclusions: updated }));
                            }}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {!isFinalized && (
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: QuotationBulletItem = {
                          id: `inc-cust-${Date.now()}`,
                          text: 'Custom inclusion service description...',
                          included: true
                        };
                        setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, newItem] }));
                      }}
                      className="w-full py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Inclusion Bullet
                    </button>
                  )}
                </div>

                {/* Exclusions */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#E31E24]" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Exclusions (Bulletized)
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                      {formData.exclusions.filter(e => e.included).length} active bullets
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Specify conditions excluded from quotation pricing or subject to additional client charges.
                  </p>

                  <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                    {formData.exclusions.map((item, idx) => (
                      <div key={item.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-200/80">
                        <input
                          type="checkbox"
                          disabled={isFinalized}
                          checked={item.included}
                          onChange={(e) => {
                            const updated = [...formData.exclusions];
                            updated[idx] = { ...item, included: e.target.checked };
                            setFormData(prev => ({ ...prev, exclusions: updated }));
                          }}
                          className="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer disabled:opacity-60"
                        />
                        <input
                          type="text"
                          disabled={isFinalized}
                          value={item.text}
                          onChange={(e) => {
                            const updated = [...formData.exclusions];
                            updated[idx] = { ...item, text: e.target.value };
                            setFormData(prev => ({ ...prev, exclusions: updated }));
                          }}
                          className="flex-1 text-xs text-slate-800 bg-transparent border-0 focus:ring-1 focus:ring-red-500 rounded p-0.5 disabled:opacity-70"
                        />
                        {!isFinalized && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.exclusions.filter((_, i) => i !== idx);
                              setFormData(prev => ({ ...prev, exclusions: updated }));
                            }}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {!isFinalized && (
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: QuotationBulletItem = {
                          id: `exc-cust-${Date.now()}`,
                          text: 'Custom exclusion description...',
                          included: true
                        };
                        setFormData(prev => ({ ...prev, exclusions: [...prev.exclusions, newItem] }));
                      }}
                      className="w-full py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Exclusion Bullet
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: SPECIAL NOTES & LEGAL LINKS */}
            {activeTab === 'legal' && (
              <div className="space-y-6">
                
                {/* Special notes */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Special Operational Notes & Critical Conditions
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          These notes can be set to bold and highlighted in amber so they stand out clearly to clients.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      <input
                        type="checkbox"
                        disabled={isFinalized}
                        checked={formData.special_notes_bold}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          special_notes_bold: e.target.checked,
                          special_notes_highlighted: e.target.checked
                        }))}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <span className="text-xs font-black text-amber-900">Make Bold & Highlight in PDF</span>
                    </label>
                  </div>

                  <div>
                    <textarea
                      rows={5}
                      disabled={isFinalized}
                      value={formData.special_notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, special_notes: e.target.value }))}
                      className={`w-full text-xs p-3.5 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                        formData.special_notes_bold 
                          ? 'font-bold bg-amber-50/40 border-amber-300 text-amber-950 focus:ring-amber-500' 
                          : 'font-normal bg-white border-slate-200 text-slate-800 focus:ring-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Clickable links config */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        PDF Clickable Links & Company Logo
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Interactive links embedded in the PDF document.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Logo Click Destination URL
                      </label>
                      <input
                        type="url"
                        disabled={isFinalized}
                        value={formData.logo_url || 'https://www.writerrelocations.com'}
                        onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Clicking the Writer Relocations logo inside the PDF navigates to this address.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Terms & Conditions Link URL
                      </label>
                      <input
                        type="url"
                        disabled={isFinalized}
                        value={formData.terms_and_conditions_url || 'https://www.writerrelocations.com/terms-and-conditions'}
                        onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions_url: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Clickable hyperlink target for general contract terms.
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Modal Footer / Save Status Bar */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Status:</span>
              <span className="font-bold text-slate-900">{formData.status}</span>
              {formData.updated_at && (
                <span className="text-[10px] text-slate-400">
                  (Last updated {new Date(formData.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                Close
              </button>

              {!isFinalized ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveActive}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Save Quotation
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalize}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Finalize Quotation
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="px-5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-black transition flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unlock for Editing
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#E31E24] hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-500/20 flex items-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Customize & Download PDF
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Pre-Download Bullet Customization Modal */}
      {isDownloadModalOpen && (
        <QuotationDownloadModal
          quotation={formData}
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          onUpdateQuotation={(updated) => {
            setFormData(updated);
            onSave(updated);
          }}
          logo={logo}
        />
      )}
    </>
  );
};
