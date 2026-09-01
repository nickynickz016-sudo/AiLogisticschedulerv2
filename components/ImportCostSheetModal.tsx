import React, { useState, useEffect, useRef } from 'react';
import { Job, UserProfile, ImportClearanceCostSheet, ImportCostItem, DEFAULT_IMPORT_CLEARANCE_ITEMS } from '../types';
import { supabase } from '../supabaseClient';
import { generateImportCostSheetPdf } from '../utils/importCostSheetPdf';
import { 
  X, 
  Printer, 
  Download, 
  Save, 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calculator, 
  Calendar, 
  Truck, 
  DollarSign, 
  RotateCcw,
  Sparkles,
  Loader2,
  PenTool
} from 'lucide-react';

interface ImportCostSheetModalProps {
  job: Job;
  currentUser: UserProfile;
  logo?: string;
  onClose: () => void;
  onSaved?: (sheet: ImportClearanceCostSheet) => void;
}

const STORAGE_KEY_PREFIX = 'import_cost_sheet_';

export const ImportCostSheetModal: React.FC<ImportCostSheetModalProps> = ({
  job,
  currentUser,
  logo,
  onClose,
  onSaved
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Initialize sheet state
  const [sheet, setSheet] = useState<ImportClearanceCostSheet>({
    id: `ICS-${job.id}`,
    job_id: job.id,
    job_no: job.id.replace(/^IMP-/, ''),
    date: job.job_date || new Date().toISOString().split('T')[0],
    consignee: job.shipper_name || '',
    bl_no: job.bol_number || '',
    awb: job.bol_number || '',
    cont_no: job.container_number || 'AIR',
    volume_weight: job.volume_cbm ? `${job.volume_cbm} CBM` : '89 KGS',
    items: DEFAULT_IMPORT_CLEARANCE_ITEMS.map((def, idx) => ({
      id: `item-${idx + 1}`,
      sl_no: def.sl_no,
      description: def.description,
      cost_dhs: 0,
      cost_fils: 0,
      cost_amount: 0,
      invoice_dhs: 0,
      invoice_fils: 0,
      invoice_amount: 0
    })),
    transport_amount: 0,
    total_cost: 0,
    net_cost: 0,
    total_invoice: 0,
    signature_name: currentUser.name || '',
    signature_date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    created_at: Date.now(),
    updated_at: Date.now(),
    created_by: currentUser.name,
    last_edited_by: currentUser.name
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isManualTrPortOverride, setIsManualTrPortOverride] = useState(false);

  // Load existing cost sheet from Supabase / localStorage
  useEffect(() => {
    const loadCostSheet = async () => {
      setLoading(true);
      const cacheKey = `${STORAGE_KEY_PREFIX}${job.id}`;
      let loadedData: ImportClearanceCostSheet | null = null;

      // 1. Try Supabase import_clearance_cost_sheets table
      try {
        const { data, error } = await supabase
          .from('import_clearance_cost_sheets' as any)
          .select('*')
          .eq('job_id', job.id)
          .maybeSingle();

        if (data && !error) {
          loadedData = data as ImportClearanceCostSheet;
        }
      } catch (err) {
        console.warn('Notice: import_clearance_cost_sheets table not queried directly, trying job_cost_sheets...', err);
      }

      // 2. Fallback: try job_cost_sheets table if specialized table not yet created
      if (!loadedData) {
        try {
          const { data, error } = await supabase
            .from('job_cost_sheets')
            .select('*')
            .eq('job_id', `IMP_COST_${job.id}`)
            .maybeSingle();

          if (data && !error && (data as any).items) {
            loadedData = (data as any).import_cost_data || null;
          }
        } catch (err) {
          console.warn('Notice querying job_cost_sheets:', err);
        }
      }

      // 3. Fallback: LocalStorage cache
      if (!loadedData) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            loadedData = JSON.parse(cached);
          }
        } catch (err) {
          console.warn('LocalStorage error:', err);
        }
      }

      if (loadedData) {
        // Merge with default 23 items if any item was missing
        const existingItemsMap = new Map((loadedData.items || []).map(i => [i.sl_no, i]));
        const mergedItems: ImportCostItem[] = DEFAULT_IMPORT_CLEARANCE_ITEMS.map((def, idx) => {
          const existing = existingItemsMap.get(def.sl_no);
          if (existing) {
            return {
              ...existing,
              description: existing.description || def.description,
            };
          }
          return {
            id: `item-${idx + 1}`,
            sl_no: def.sl_no,
            description: def.description,
            cost_dhs: 0,
            cost_fils: 0,
            cost_amount: 0,
            invoice_dhs: 0,
            invoice_fils: 0,
            invoice_amount: 0
          };
        });

        // Add any custom items that were appended (sl_no > 23)
        const customItems = (loadedData.items || []).filter(i => i.sl_no > 23 || i.is_custom);

        setSheet({
          ...loadedData,
          items: [...mergedItems, ...customItems],
          job_no: loadedData.job_no || job.id.replace(/^IMP-/, ''),
          consignee: loadedData.consignee || job.shipper_name || '',
          bl_no: loadedData.bl_no || job.bol_number || '',
          awb: loadedData.awb || job.bol_number || '',
          cont_no: loadedData.cont_no || job.container_number || 'AIR',
          volume_weight: loadedData.volume_weight || (job.volume_cbm ? `${job.volume_cbm} CBM` : '89 KGS'),
        });
      } else {
        // Fresh sheet with prefilled info from the Job
        setSheet(prev => ({
          ...prev,
          job_no: job.id.replace(/^IMP-/, ''),
          consignee: job.shipper_name || '',
          bl_no: job.bol_number || '',
          awb: job.bol_number || '',
          cont_no: job.container_number || 'AIR',
          volume_weight: job.volume_cbm ? `${job.volume_cbm} CBM` : '89 KGS',
        }));
      }

      setLoading(false);
    };

    loadCostSheet();
  }, [job]);

  // Recalculate totals whenever items or transport amount change
  const handleItemChange = (index: number, field: 'cost_amount' | 'invoice_amount' | 'description', value: any) => {
    setSheet(prev => {
      const updatedItems = [...prev.items];
      const targetItem = { ...updatedItems[index] };

      if (field === 'cost_amount') {
        const numVal = Math.max(0, parseFloat(value) || 0);
        targetItem.cost_amount = numVal;
        targetItem.cost_dhs = Math.floor(numVal);
        targetItem.cost_fils = Math.round((numVal % 1) * 100);
      } else if (field === 'invoice_amount') {
        const numVal = Math.max(0, parseFloat(value) || 0);
        targetItem.invoice_amount = numVal;
        targetItem.invoice_dhs = Math.floor(numVal);
        targetItem.invoice_fils = Math.round((numVal % 1) * 100);
      } else if (field === 'description') {
        targetItem.description = value;
      }

      updatedItems[index] = targetItem;

      // Calculate total cost
      const newTotalCost = updatedItems.reduce((sum, it) => sum + (it.cost_amount || 0), 0);
      const newTotalInvoice = updatedItems.reduce((sum, it) => sum + (it.invoice_amount || 0), 0);

      // Sourced transportation amount from item 11 (TRANSPORTATION) unless manually overridden
      const item11 = updatedItems.find(it => it.sl_no === 11);
      const autoTransportAmount = item11 ? item11.cost_amount : 0;
      const finalTransportAmount = isManualTrPortOverride ? prev.transport_amount : autoTransportAmount;
      const netCost = newTotalCost - finalTransportAmount;

      return {
        ...prev,
        items: updatedItems,
        total_cost: parseFloat(newTotalCost.toFixed(2)),
        total_invoice: parseFloat(newTotalInvoice.toFixed(2)),
        transport_amount: parseFloat(finalTransportAmount.toFixed(2)),
        net_cost: parseFloat(netCost.toFixed(2))
      };
    });
  };

  const handleTransportOverride = (value: number) => {
    setIsManualTrPortOverride(true);
    setSheet(prev => {
      const val = Math.max(0, value || 0);
      return {
        ...prev,
        transport_amount: val,
        net_cost: parseFloat((prev.total_cost - val).toFixed(2))
      };
    });
  };

  const handleAddCustomItem = () => {
    setSheet(prev => {
      const nextSl = prev.items.length + 1;
      const newItem: ImportCostItem = {
        id: `custom-item-${Date.now()}`,
        sl_no: nextSl,
        description: 'ADDITIONAL CHARGE',
        cost_dhs: 0,
        cost_fils: 0,
        cost_amount: 0,
        invoice_dhs: 0,
        invoice_fils: 0,
        invoice_amount: 0,
        is_custom: true
      };
      return {
        ...prev,
        items: [...prev.items, newItem]
      };
    });
  };

  const handleRemoveItem = (index: number) => {
    setSheet(prev => {
      const updatedItems = prev.items.filter((_, idx) => idx !== index);
      // Re-index
      const reindexed = updatedItems.map((item, idx) => ({
        ...item,
        sl_no: idx + 1
      }));
      const newTotalCost = reindexed.reduce((sum, it) => sum + (it.cost_amount || 0), 0);
      const newTotalInvoice = reindexed.reduce((sum, it) => sum + (it.invoice_amount || 0), 0);
      const item11 = reindexed.find(it => it.sl_no === 11);
      const finalTransport = isManualTrPortOverride ? prev.transport_amount : (item11?.cost_amount || 0);

      return {
        ...prev,
        items: reindexed,
        total_cost: parseFloat(newTotalCost.toFixed(2)),
        total_invoice: parseFloat(newTotalInvoice.toFixed(2)),
        transport_amount: parseFloat(finalTransport.toFixed(2)),
        net_cost: parseFloat((newTotalCost - finalTransport).toFixed(2))
      };
    });
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = async (statusOverride?: 'Draft' | 'Saved' | 'Finalized') => {
    setSaving(true);
    const updatedSheet: ImportClearanceCostSheet = {
      ...sheet,
      status: statusOverride || sheet.status || 'Saved',
      updated_at: Date.now(),
      last_edited_by: currentUser.name
    };

    const cacheKey = `${STORAGE_KEY_PREFIX}${job.id}`;
    // Always mirror to localStorage immediately for instant offline durability
    try {
      localStorage.setItem(cacheKey, JSON.stringify(updatedSheet));
      localStorage.setItem(`import_cost_summary_${job.id}`, JSON.stringify({
        total_cost: updatedSheet.total_cost,
        net_cost: updatedSheet.net_cost,
        transport_amount: updatedSheet.transport_amount,
        status: updatedSheet.status,
        updated_at: updatedSheet.updated_at
      }));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // 1. Try to save to Supabase import_clearance_cost_sheets table
    let savedToDb = false;
    try {
      const { error } = await supabase
        .from('import_clearance_cost_sheets' as any)
        .upsert(updatedSheet, { onConflict: 'job_id' });

      if (!error) {
        savedToDb = true;
      }
    } catch (e) {
      console.warn('Supabase upsert into import_clearance_cost_sheets notice:', e);
    }

    // 2. Also save to job_cost_sheets table as backup record
    try {
      await supabase
        .from('job_cost_sheets')
        .upsert({
          job_id: `IMP_COST_${job.id}`,
          items: [],
          status: updatedSheet.status === 'Finalized' ? 'Finalized' : 'Issued',
          total_cost: updatedSheet.total_cost,
          job_category: 'Import',
          import_cost_data: updatedSheet
        } as any, { onConflict: 'job_id' });
    } catch (e) {
      console.warn('Supabase backup upsert into job_cost_sheets notice:', e);
    }

    setSheet(updatedSheet);
    setSaving(false);
    showToast('Import Cost Sheet successfully saved!', 'success');
    if (onSaved) onSaved(updatedSheet);
  };

  const handleDownloadPdf = () => {
    try {
      const doc = generateImportCostSheetPdf({ sheet, logo });
      const filename = `Import_Cost_Sheet_${sheet.job_no || sheet.job_id || 'IMP'}_${sheet.date || 'UAE'}.pdf`;
      doc.save(filename);
      showToast('PDF downloaded successfully!', 'success');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      showToast(`PDF generation failed: ${err.message || err}`, 'error');
    }
  };

  const handlePrint = () => {
    try {
      const doc = generateImportCostSheetPdf({ sheet, logo });
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    } catch (err: any) {
      console.error('Print error:', err);
      showToast('Print preview failed', 'error');
    }
  };

  // Quick Preset Sample Data (Matching the user's attached invoice sample)
  const handleLoadSampleData = () => {
    setSheet(prev => {
      const sampleValues: Record<number, number> = {
        1: 150.00,  // DO FEE
        2: 30.00,   // PHC
        7: 70.00,   // BILL OF ENTRY
        8: 876.00,  // DUTY
        9: 170.00,  // CUSTOMS INSPECTION BOOKING FEE
        10: 925.96, // VAT
        11: 350.00, // TRANSPORTATION
        14: 20.00,  // LABOUR FEE
        17: 100.00, // DO DOCUMENTATION FEE
        18: 200.00, // CUSTOMS DOCUMENTATION
        22: 20.00,  // (Fork Lift)
      };

      const updatedItems = prev.items.map(item => {
        const val = sampleValues[item.sl_no];
        if (val !== undefined) {
          return {
            ...item,
            cost_amount: val,
            cost_dhs: Math.floor(val),
            cost_fils: Math.round((val % 1) * 100),
          };
        }
        return item;
      });

      const newTotalCost = updatedItems.reduce((sum, it) => sum + (it.cost_amount || 0), 0);
      const transportVal = 350.00;

      return {
        ...prev,
        items: updatedItems,
        total_cost: parseFloat(newTotalCost.toFixed(2)),
        transport_amount: transportVal,
        net_cost: parseFloat((newTotalCost - transportVal).toFixed(2)),
        consignee: prev.consignee || 'MARK HENRY WRONG 812103000041 RIJAS',
        awb: prev.awb || '176-27127402',
        cont_no: prev.cont_no || 'AIR',
        volume_weight: prev.volume_weight || '89 KGS'
      };
    });
    showToast('Applied sample standard cost items template!', 'success');
  };

  const handleZeroFill = () => {
    if (!confirm('Clear all entered cost amounts to zero?')) return;
    setSheet(prev => ({
      ...prev,
      items: prev.items.map(i => ({
        ...i,
        cost_dhs: 0,
        cost_fils: 0,
        cost_amount: 0,
        invoice_dhs: 0,
        invoice_fils: 0,
        invoice_amount: 0
      })),
      total_cost: 0,
      total_invoice: 0,
      transport_amount: 0,
      net_cost: 0
    }));
    setIsManualTrPortOverride(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[920px] border border-slate-200">
        
        {/* Toast */}
        {toastMessage && (
          <div className={`fixed top-6 right-6 z-[130] px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20' 
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-xs font-bold">{toastMessage.text}</span>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-black tracking-tight text-white uppercase">
                  Import Clearance Cost Sheet
                </h3>
                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                  sheet.status === 'Finalized' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : sheet.status === 'Saved' 
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {sheet.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Manifest Ref: <span className="font-bold text-slate-200">{job.id}</span> • Shipper: <span className="font-bold text-slate-200">{job.shipper_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Template Fill Button */}
            <button
              onClick={handleLoadSampleData}
              type="button"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl text-xs font-black transition-all border border-indigo-500/30"
              title="Pre-fill standard charge rates"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Standard Rates
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              type="button"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
              title="Print Cost Sheet"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            {/* Save */}
            <button
              onClick={() => handleSave('Saved')}
              disabled={saving}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Close */}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Metadata Info Strip (Matching the Writer Cost Sheet Header) */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 shrink-0">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Job No</label>
            <input 
              type="text" 
              value={sheet.job_no} 
              onChange={e => setSheet({...sheet, job_no: e.target.value})}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="e.g. 812103000041"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Date</label>
            <input 
              type="date" 
              value={sheet.date} 
              onChange={e => setSheet({...sheet, date: e.target.value})}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Consignee</label>
            <input 
              type="text" 
              value={sheet.consignee} 
              onChange={e => setSheet({...sheet, consignee: e.target.value})}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
              placeholder="Consignee Name"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">BL No</label>
            <input 
              type="text" 
              value={sheet.bl_no} 
              onChange={e => setSheet({...sheet, bl_no: e.target.value})}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="BL Number"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">AWB / Air No</label>
            <input 
              type="text" 
              value={sheet.awb} 
              onChange={e => setSheet({...sheet, awb: e.target.value})}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
              placeholder="e.g. 176-27127402"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cont No / Vol</label>
            <div className="flex gap-1">
              <input 
                type="text" 
                value={sheet.cont_no} 
                onChange={e => setSheet({...sheet, cont_no: e.target.value})}
                className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="AIR"
              />
              <input 
                type="text" 
                value={sheet.volume_weight} 
                onChange={e => setSheet({...sheet, volume_weight: e.target.value})}
                className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="89 KGS"
              />
            </div>
          </div>
        </div>

        {/* Main Body: Cost Sheet Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-100/50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Table Header Bar */}
            <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                  Cost Breakdown Breakdown Schedule
                </span>
                <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  {sheet.items.length} Line Items
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-3 py-1 bg-indigo-600/40 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-indigo-500/40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Item
                </button>
                <button
                  type="button"
                  onClick={handleZeroFill}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                  title="Reset all values to 0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* The 23 Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center border-r border-slate-200">Sl No.</th>
                    <th className="py-3 px-6 border-r border-slate-200">Description of Charges</th>
                    <th className="py-2 px-4 w-48 text-center border-r border-slate-200 bg-indigo-50/40" colSpan={2}>
                      <div className="text-[10px] font-black text-indigo-900 uppercase">Cost Amount (AED)</div>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-[9px] font-bold text-indigo-600">
                        <span>DHS</span>
                        <span>Fils</span>
                      </div>
                    </th>
                    <th className="py-2 px-4 w-44 text-center border-r border-slate-200 bg-slate-50/60" colSpan={2}>
                      <div className="text-[10px] font-black text-slate-700 uppercase">Invoice Amount (AED)</div>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-[9px] font-bold text-slate-500">
                        <span>DHS</span>
                        <span>Fils</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sheet.items.map((item, idx) => {
                    const isTransportItem = item.sl_no === 11;
                    const hasCost = (item.cost_amount || 0) > 0;

                    return (
                      <tr 
                        key={item.id || idx} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isTransportItem ? 'bg-amber-50/40 font-semibold' : hasCost ? 'bg-indigo-50/15' : ''
                        }`}
                      >
                        {/* Sl No */}
                        <td className="py-2.5 px-4 text-center font-bold text-slate-500 border-r border-slate-100">
                          {item.sl_no}
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-6 font-bold text-slate-800 border-r border-slate-100">
                          {item.is_custom ? (
                            <input 
                              type="text" 
                              value={item.description} 
                              onChange={e => handleItemChange(idx, 'description', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-indigo-900 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{item.description}</span>
                              {isTransportItem && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">
                                  Feeds TR.PORT
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Cost DHS & Fils / Direct Input */}
                        <td className="py-1.5 px-3 border-r border-slate-100 bg-indigo-50/20" colSpan={2}>
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">AED</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                placeholder="0.00"
                                value={item.cost_amount === 0 ? '' : item.cost_amount} 
                                onChange={e => handleItemChange(idx, 'cost_amount', e.target.value)}
                                className={`w-full pl-9 pr-3 py-1.5 bg-white border rounded-lg text-xs font-black text-right outline-none transition-all ${
                                  hasCost 
                                    ? 'border-indigo-300 text-indigo-950 font-mono shadow-xs ring-1 ring-indigo-200' 
                                    : 'border-slate-200 text-slate-600 focus:border-indigo-400'
                                }`}
                              />
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 font-bold w-12 text-right">
                              {item.cost_dhs || 0}.<span className="text-[9px]">{String(item.cost_fils || 0).padStart(2, '0')}</span>
                            </div>
                          </div>
                        </td>

                        {/* Invoice DHS & Fils */}
                        <td className="py-1.5 px-3 border-r border-slate-100" colSpan={2}>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              placeholder="0.00"
                              value={item.invoice_amount === 0 ? '' : item.invoice_amount} 
                              onChange={e => handleItemChange(idx, 'invoice_amount', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-slate-700 outline-none focus:border-blue-400"
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          {item.is_custom ? (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-300 font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Totals and Summary Box Matching PDF */}
            <div className="bg-slate-900 text-white p-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: Signatory & Status */}
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <PenTool className="w-4 h-4 text-indigo-400" />
                  <span>Cost Sheet Authorization & Signatory</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Signatory Name</label>
                    <input 
                      type="text" 
                      value={sheet.signature_name || ''} 
                      onChange={e => setSheet({...sheet, signature_name: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Filing Status</label>
                    <select
                      value={sheet.status}
                      onChange={e => setSheet({...sheet, status: e.target.value as any})}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Saved">Saved</option>
                      <option value="Finalized">Finalized</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Middle / Right Column: Calculations & Net Highlight Box */}
              <div className="md:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4">
                
                {/* Total Cost Pill */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 min-w-[140px] text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                    Gross Total
                  </span>
                  <div className="text-xl font-black text-white font-mono">
                    AED {(sheet.total_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* TR.PORT Box */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 min-w-[140px] text-right">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Transport</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">TR.PORT</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={sheet.transport_amount === 0 ? '' : sheet.transport_amount}
                    onChange={e => handleTransportOverride(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-black text-amber-300 text-right font-mono outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                {/* Net Box (Exact Yellow Highlight Replica from Paper Format) */}
                <div className="bg-yellow-300 text-slate-950 rounded-2xl p-4 min-w-[170px] text-right border-2 border-yellow-400 shadow-xl shadow-yellow-500/10">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider mb-0.5 text-slate-800">
                    <span>Net Clearance Cost</span>
                    <span>(Total - TR)</span>
                  </div>
                  <div className="text-2xl font-black font-mono tracking-tight text-slate-950">
                    AED {(sheet.net_cost !== undefined ? sheet.net_cost : (sheet.total_cost - sheet.transport_amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Format complies 1:1 with Writer Relocations Import Clearance Specification</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-wider"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 font-bold text-xs text-white transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('Finalized')}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save & Finalize</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
