import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  Copy, 
  CheckCircle, 
  Lock, 
  Clock, 
  Sparkles, 
  Database, 
  ExternalLink, 
  RefreshCw,
  Eye,
  Ship,
  Box,
  Layers,
  Check,
  CheckCheck,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { 
  Quotation, 
  QuotationFormat, 
  QuotationStatus, 
  Job, 
  UserProfile, 
  UserRole,
  DEFAULT_FCL_INCLUSIONS,
  DEFAULT_FCL_EXCLUSIONS,
  DEFAULT_FCL_SPECIAL_NOTES,
  DEFAULT_GROUPAGE_INCLUSIONS,
  DEFAULT_GROUPAGE_EXCLUSIONS,
  DEFAULT_GROUPAGE_SPECIAL_NOTES,
  BranchCode,
  BRANCHES
} from '../types';
import { INITIAL_QUOTATIONS } from '../mockData';
import { supabase } from '../supabaseClient';
import { safeLocalStorage, downloadPdfBlob } from '../utils';
import { generateQuotationPdf } from '../utils/quotationPdf';
import { QuotationEditorModal } from './QuotationEditorModal';
import { QuotationDownloadModal } from './QuotationDownloadModal';

interface QuotationsProps {
  jobs?: Job[];
  currentUser?: UserProfile | null;
  logo?: string;
  activeBranch?: BranchCode;
}

export const Quotations: React.FC<QuotationsProps> = ({
  jobs = [],
  currentUser,
  logo,
  activeBranch = 'UAE'
}) => {
  // State for quotations list (branch-isolated)
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    try {
      const saved = safeLocalStorage.getItem(`writer_quotations_${activeBranch}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load local quotations', e);
    }
    return INITIAL_QUOTATIONS.filter(q => (q.branch || 'UAE') === activeBranch);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | QuotationFormat>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QuotationStatus>('ALL');

  // Modals
  const [selectedQuoteForEdit, setSelectedQuoteForEdit] = useState<Quotation | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const [selectedQuoteForDownload, setSelectedQuoteForDownload] = useState<Quotation | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Sync to safeLocalStorage whenever quotations state updates (branch-keyed)
  useEffect(() => {
    safeLocalStorage.setItem(`writer_quotations_${activeBranch}`, JSON.stringify(quotations));
  }, [quotations, activeBranch]);

  // When activeBranch changes, reload branch-isolated quotations
  useEffect(() => {
    try {
      const saved = safeLocalStorage.getItem(`writer_quotations_${activeBranch}`);
      if (saved) {
        setQuotations(JSON.parse(saved));
      } else {
        setQuotations(INITIAL_QUOTATIONS.filter(q => (q.branch || 'UAE') === activeBranch));
      }
    } catch (_) {}
  }, [activeBranch]);

  // Load from Supabase with branch filter
  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setIsLoading(true);
        let query = supabase
          .from('quotations')
          .select('*')
          .order('created_at', { ascending: false });

        if (activeBranch) {
          query = query.eq('branch', activeBranch);
        }

        const { data, error } = await query;

        if (error) {
          if (error.message?.includes('branch') || error.code === '42703') {
            const fallbackRes = await supabase.from('quotations').select('*').order('created_at', { ascending: false });
            if (fallbackRes.data) {
              const branchData = fallbackRes.data.filter((q: any) => (q.branch || 'UAE') === activeBranch);
              setQuotations(branchData);
            }
          } else {
            console.warn('Supabase quotations table offline or error, using local storage cache.');
          }
        } else if (data && data.length > 0) {
          setQuotations(data as Quotation[]);
        }
      } catch (err) {
        console.warn('Supabase quotations table not yet populated or offline, using local storage cache.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotations();
  }, [activeBranch]);

  // Save/Update quotation
  const handleSaveQuotation = async (quoteToSave: Quotation) => {
    const quoteWithBranch: Quotation = {
      ...quoteToSave,
      branch: activeBranch
    };

    // 1. Update local state
    setQuotations(prev => {
      const idx = prev.findIndex(q => q.id === quoteWithBranch.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = quoteWithBranch;
        return next;
      } else {
        return [quoteWithBranch, ...prev];
      }
    });

    // 2. Persist to Supabase if table exists
    try {
      const { error } = await supabase
        .from('quotations')
        .upsert(quoteWithBranch, { onConflict: 'id' });

      if (error && (error.message.includes('branch') || error.message.includes('column'))) {
        const { branch, ...stripped } = quoteWithBranch as any;
        await supabase.from('quotations').upsert(stripped, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('Supabase upsert failed, retained in local storage.', err);
    }
  };

  // Delete quotation
  const handleDeleteQuotation = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = confirm('Are you sure you want to delete this quotation? This action cannot be undone.');
    if (!confirmed) return;

    setQuotations(prev => prev.filter(q => q.id !== id));

    try {
      await supabase
        .from('quotations')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  };

  // Duplicate quotation
  const handleDuplicateQuotation = (source: Quotation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const serial = Math.floor(100 + Math.random() * 900);
    const prefix = source.format === 'FCL_EXPORT' ? 'WR-FCL-2026' : 'WR-GRP-2026';
    const newQuote: Quotation = {
      ...source,
      id: `quote-${Date.now()}`,
      quotation_no: `${prefix}-${serial}`,
      title: `${source.title} (Copy)`,
      status: 'DRAFT',
      date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      finalized_at: undefined,
      finalized_by: undefined
    };

    handleSaveQuotation(newQuote);
  };

  const [quickDownloadNotice, setQuickDownloadNotice] = useState<{ filename: string; blobUrl: string } | null>(null);

  const handleQuickDownloadPdf = (quote: Quotation, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const doc = generateQuotationPdf({
        quotation: quote,
        logo,
        logoLinkUrl: quote.logo_url,
        termsLinkUrl: quote.terms_and_conditions_url,
        highlightSpecialNotes: quote.special_notes_bold || quote.special_notes_highlighted
      });

      const quoteSlug = (quote.quotation_no || 'Quotation').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const clientSlug = (quote.client_name || 'Client').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${quoteSlug}_${clientSlug}.pdf`;

      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      // Trigger robust multi-platform download
      downloadPdfBlob(blob, filename);

      try {
        doc.save(filename);
      } catch (err) {
        console.warn('doc.save notice:', err);
      }

      setQuickDownloadNotice({ filename, blobUrl });
      setTimeout(() => {
        setQuickDownloadNotice(null);
      }, 10000);
    } catch (err: any) {
      console.error('Quick download failed:', err);
      setSelectedQuoteForDownload(quote);
      setIsDownloadOpen(true);
    }
  };

  // Create new quotation helper
  const handleCreateNew = (format: QuotationFormat) => {
    const isGrp = format === 'GROUPAGE_FCL_EXPORT';
    const serial = Math.floor(100 + Math.random() * 900);
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const branchInfo = BRANCHES[activeBranch] || BRANCHES.UAE;
    const defaultCity = activeBranch === 'KSA' ? 'Riyadh' : activeBranch === 'QATAR' ? 'Doha' : 'Dubai';
    const defaultPort = branchInfo.port || (activeBranch === 'KSA' ? 'Jeddah Islamic Port' : activeBranch === 'QATAR' ? 'Hamad Port, Doha' : 'Jebel Ali Port (AEJEA), Dubai');
    const defaultEmail = `relocations.${activeBranch.toLowerCase()}@writerrelocations.com`;
    const defaultPhone = `${branchInfo.phone_code} ${activeBranch === 'KSA' ? '11 234 5678' : activeBranch === 'QATAR' ? '44 123 456' : '4 885 1234'}`;
    const defaultCurrency = branchInfo.currency;

    const newQuote: Quotation = {
      id: `quote-${Date.now()}`,
      branch: activeBranch,
      quotation_no: isGrp ? `WR-${activeBranch}-GRP-2026-${serial}` : `WR-${activeBranch}-FCL-2026-${serial}`,
      format,
      title: isGrp ? 'Export Quotation — Groupage Consolidation in 40ft HC' : 'Export Quotation — Full Container Load (FCL)',
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
      container_size: isGrp ? undefined : '20ft General Purpose',
      groupage_mode: isGrp ? 'Co-loaded Groupage Consolidation in 40ft HC' : undefined,
      estimated_volume_cbm: isGrp ? 10.0 : 25.0,
      estimated_volume_cft: isGrp ? 353 : 883,
      estimated_weight_kg: isGrp ? 1400 : 3200,
      origin_port: defaultPort,
      destination_port: '',
      transit_time: isGrp ? '30 - 45 Days (including consolidation)' : '24 - 30 Days (ocean transit)',
      commodity_description: 'Used Household Goods & Personal Effects',

      currency: defaultCurrency,
      line_items: isGrp ? [
        {
          id: 'li-g1',
          description: 'Origin Services: Residence packing, wrapping, handling and transit to Writer central hub',
          quantity: 10,
          unit: 'CBM',
          unit_price: 380,
          total_price: 3800,
          currency: 'AED'
        },
        {
          id: 'li-g2',
          description: 'Consolidation & Documentation: Warehouse staging, pallet strapping and UAE export clearance',
          quantity: 1,
          unit: 'Shipment',
          unit_price: 1850,
          total_price: 1850,
          currency: 'AED'
        },
        {
          id: 'li-g3',
          description: 'Consolidated Sea Freight: Jebel Ali to Destination Groupage Terminal',
          quantity: 10,
          unit: 'CBM',
          unit_price: 450,
          total_price: 4500,
          currency: 'AED'
        },
        {
          id: 'li-g4',
          description: 'Destination Port Handling & Customs Clearance',
          quantity: 1,
          unit: 'Shipment',
          unit_price: 2100,
          total_price: 2100,
          currency: 'AED'
        },
        {
          id: 'li-g5',
          description: 'Destination Delivery: Residence delivery, room placement, reassembly & debris removal',
          quantity: 10,
          unit: 'CBM',
          unit_price: 320,
          total_price: 3200,
          currency: 'AED'
        }
      ] : [
        {
          id: 'li-1',
          description: 'Origin Services: Export packing, wrapping, dismantling and loading into 20ft container at residence',
          quantity: 1,
          unit: 'Lump Sum',
          unit_price: 6500,
          total_price: 6500,
          currency: 'AED'
        },
        {
          id: 'li-2',
          description: 'Terminal Haulage & Export Customs Clearance at Jebel Ali Port',
          quantity: 1,
          unit: 'Shipment',
          unit_price: 2200,
          total_price: 2200,
          currency: 'AED'
        },
        {
          id: 'li-3',
          description: 'Ocean Freight: Sea freight to destination port on FCL liner terms',
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
      subtotal: isGrp ? 15450 : 22700,
      vat_percent: 0,
      vat_amount: 0,
      total_amount: isGrp ? 15450 : 22700,
      payment_terms: '100% advance prior to packing / container dispatch',

      inclusions: (isGrp ? DEFAULT_GROUPAGE_INCLUSIONS : DEFAULT_FCL_INCLUSIONS).map(i => ({ ...i })),
      exclusions: (isGrp ? DEFAULT_GROUPAGE_EXCLUSIONS : DEFAULT_FCL_EXCLUSIONS).map(e => ({ ...e })),

      special_notes: isGrp ? DEFAULT_GROUPAGE_SPECIAL_NOTES : DEFAULT_FCL_SPECIAL_NOTES,
      special_notes_bold: true,
      special_notes_highlighted: true,

      terms_and_conditions_url: 'https://www.writerrelocations.com/terms-and-conditions',
      terms_and_conditions_text: 'Writer Relocations Standard Terms and Conditions',
      logo_url: 'https://www.writerrelocations.com',

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentUser?.employee_id || 'SYSTEM'
    };

    setSelectedQuoteForEdit(newQuote);
    setIsEditorOpen(true);
  };

  // Strict Branch Isolation Filtering
  const branchQuotations = quotations.filter(q => (q.branch || 'UAE') === activeBranch);

  const filteredQuotations = branchQuotations.filter(q => {
    // Format filter
    if (formatFilter !== 'ALL' && q.format !== formatFilter) return false;
    // Status filter
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchNo = q.quotation_no?.toLowerCase().includes(query);
      const matchClient = q.client_name?.toLowerCase().includes(query);
      const matchCompany = q.company_name?.toLowerCase().includes(query);
      const matchDest = (q.destination_city + ' ' + q.destination_country)?.toLowerCase().includes(query);
      const matchCoord = q.prepared_by?.toLowerCase().includes(query);
      if (!matchNo && !matchClient && !matchCompany && !matchDest && !matchCoord) return false;
    }
    return true;
  });

  // Branch-specific Counters
  const totalCount = branchQuotations.length;
  const fclCount = branchQuotations.filter(q => q.format === 'FCL_EXPORT').length;
  const grpCount = branchQuotations.filter(q => q.format === 'GROUPAGE_FCL_EXPORT').length;
  const finalizedCount = branchQuotations.filter(q => q.status === 'FINALIZED').length;
  const draftCount = branchQuotations.filter(q => q.status === 'DRAFT').length;

  const sqlCode = `-- ==============================================================================
-- WRITER RELOCATIONS - QUOTATIONS MODULE SUPABASE SQL MIGRATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.quotations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    quotation_no TEXT UNIQUE NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('FCL_EXPORT', 'GROUPAGE_FCL_EXPORT')),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SAVED', 'FINALIZED')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    prepared_by TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    client_name TEXT NOT NULL,
    company_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    origin_address TEXT,
    origin_city TEXT DEFAULT 'Dubai',
    origin_country TEXT DEFAULT 'United Arab Emirates',
    destination_address TEXT,
    destination_city TEXT,
    destination_country TEXT,
    service_type TEXT DEFAULT 'Door-to-Door',
    container_size TEXT,
    groupage_mode TEXT,
    estimated_volume_cbm NUMERIC(10, 2),
    estimated_volume_cft NUMERIC(10, 2),
    estimated_weight_kg NUMERIC(10, 2),
    origin_port TEXT DEFAULT 'Jebel Ali Port (AEJEA), Dubai',
    destination_port TEXT,
    transit_time TEXT,
    commodity_description TEXT DEFAULT 'Used Household Goods & Personal Effects',
    currency TEXT NOT NULL DEFAULT 'AED',
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    vat_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_terms TEXT DEFAULT '100% advance prior to packing / container dispatch',
    inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    special_notes TEXT,
    special_notes_bold BOOLEAN NOT NULL DEFAULT true,
    special_notes_highlighted BOOLEAN NOT NULL DEFAULT true,
    terms_and_conditions_url TEXT DEFAULT 'https://www.writerrelocations.com/terms-and-conditions',
    terms_and_conditions_text TEXT DEFAULT 'Writer Relocations Standard Terms and Conditions',
    logo_url TEXT DEFAULT 'https://www.writerrelocations.com',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by TEXT,
    finalized_at TIMESTAMPTZ,
    finalized_by TEXT,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_quotations_no ON public.quotations(quotation_no);
CREATE INDEX IF NOT EXISTS idx_quotations_format ON public.quotations(format);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON public.quotations(client_name);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for all on quotations" ON public.quotations;
CREATE POLICY "Allow select for all on quotations" ON public.quotations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all on quotations" ON public.quotations;
CREATE POLICY "Allow insert for all on quotations" ON public.quotations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all on quotations" ON public.quotations;
CREATE POLICY "Allow update for all on quotations" ON public.quotations FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for all on quotations" ON public.quotations;
CREATE POLICY "Allow delete for all on quotations" ON public.quotations FOR DELETE USING (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E31E24] text-white flex items-center justify-center shadow-lg shadow-red-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#E31E24] tracking-widest">
                International Moving & Freight
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Quotations Management
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 max-w-2xl">
            Create, manage and export official branded quotations for <strong>Groupage FCL Export</strong> and <strong>FCL Export</strong>. 
            Customize bulletized inclusions/exclusions, highlight critical special notes, and control draft to finalized lifecycle.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition"
            title="View Supabase SQL code"
          >
            <Database className="w-4 h-4 text-emerald-600" />
            Supabase SQL
          </button>

          <button
            onClick={() => handleCreateNew('GROUPAGE_FCL_EXPORT')}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-orange-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            New Groupage FCL Quote
          </button>

          <button
            onClick={() => handleCreateNew('FCL_EXPORT')}
            className="px-5 py-2.5 bg-[#E31E24] hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            New FCL Export Quote
          </button>
        </div>
      </div>

      {/* Quick Download Notification Banner */}
      {quickDownloadNotice && (
        <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                PDF Generated Successfully!
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                {quickDownloadNotice.filename} &bull; Ready to save or view
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={quickDownloadNotice.blobUrl}
              download={quickDownloadNotice.filename}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Save File
            </a>
            <a
              href={quickDownloadNotice.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              Open in Tab
            </a>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Quotes</p>
            <p className="text-xl font-black text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">FCL Export</p>
            <p className="text-xl font-black text-blue-700">{fclCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Groupage FCL</p>
            <p className="text-xl font-black text-orange-700">{grpCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Finalized (Locked)</p>
            <p className="text-xl font-black text-emerald-700">{finalizedCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Drafts / In Progress</p>
            <p className="text-xl font-black text-amber-700">{draftCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Quote #, client, destination city..."
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* Format */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFormatFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                formatFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Formats
            </button>
            <button
              onClick={() => setFormatFilter('FCL_EXPORT')}
              className={`px-3 py-1.5 rounded-lg transition ${
                formatFilter === 'FCL_EXPORT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              FCL Export
            </button>
            <button
              onClick={() => setFormatFilter('GROUPAGE_FCL_EXPORT')}
              className={`px-3 py-1.5 rounded-lg transition ${
                formatFilter === 'GROUPAGE_FCL_EXPORT' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Groupage FCL
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'DRAFT' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setStatusFilter('SAVED')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'SAVED' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Saved
            </button>
            <button
              onClick={() => setStatusFilter('FINALIZED')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'FINALIZED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Finalized
            </button>
          </div>
        </div>
      </div>

      {/* Quotations List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">No Quotations Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No quotations match your current search or filters. Click below to create a new quotation.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleCreateNew('FCL_EXPORT')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
              >
                + Create FCL Quote
              </button>
              <button
                onClick={() => handleCreateNew('GROUPAGE_FCL_EXPORT')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition"
              >
                + Create Groupage Quote
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Quote Ref #</th>
                  <th className="py-3.5 px-4">Format</th>
                  <th className="py-3.5 px-4">Client / Shipper</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Volume / Equip</th>
                  <th className="py-3.5 px-4 text-right">Quoted Value</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((quote) => {
                  const isFcl = quote.format === 'FCL_EXPORT';
                  const isFinal = quote.status === 'FINALIZED';

                  return (
                    <tr 
                      key={quote.id} 
                      onClick={() => {
                        setSelectedQuoteForEdit(quote);
                        setIsEditorOpen(true);
                      }}
                      className="hover:bg-slate-50/70 transition cursor-pointer group"
                    >
                      {/* Quote Ref */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{quote.quotation_no}</span>
                          {quote.special_notes_bold && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Bold highlighted notes enabled"></span>
                          )}
                        </div>
                      </td>

                      {/* Format Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          isFcl ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}>
                          {isFcl ? 'FCL Export' : 'Groupage FCL'}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <p className="font-bold text-slate-800 break-words text-xs sm:text-sm leading-snug">{quote.client_name || '—'}</p>
                        {quote.company_name && (
                          <p className="text-[10px] text-slate-400 break-words leading-tight mt-0.5">{quote.company_name}</p>
                        )}
                      </td>

                      {/* Destination */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <p className="font-medium">{quote.destination_city || '—'}</p>
                        <p className="text-[10px] text-slate-400">{quote.destination_country || '—'}</p>
                      </td>

                      {/* Volume */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <p className="font-bold text-slate-800">
                          {quote.estimated_volume_cbm ? `${quote.estimated_volume_cbm} CBM` : (quote.container_size || '—')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isFcl ? (quote.container_size || 'Full Container') : 'Shared 40ft HC'}
                        </p>
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {quote.currency} {Number(quote.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                          quote.status === 'FINALIZED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : quote.status === 'SAVED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {quote.status === 'FINALIZED' && <Lock className="w-3 h-3" />}
                          {quote.status === 'SAVED' && <CheckCircle className="w-3 h-3" />}
                          {quote.status === 'DRAFT' && <Sparkles className="w-3 h-3" />}
                          {quote.status}
                        </span>
                      </td>

                      {/* Validity */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <p className="text-[11px]">{quote.date}</p>
                        <p className="text-[10px] text-slate-400">Exp: {quote.valid_until || '30 days'}</p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuoteForEdit(quote);
                              setIsEditorOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title={isFinal ? 'View Finalized Quote (Locked)' : 'Edit Quotation'}
                          >
                            {isFinal ? <Eye className="w-4 h-4 text-emerald-700" /> : <Edit3 className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleQuickDownloadPdf(quote, e)}
                            className="p-1.5 text-slate-500 hover:text-[#E31E24] hover:bg-red-50 rounded-lg transition"
                            title="1-Click Instant Download PDF"
                          >
                            <Download className="w-4 h-4 text-[#E31E24]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuoteForDownload(quote);
                              setIsDownloadOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Customize Bullets & Download PDF"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDuplicateQuotation(quote, e)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Duplicate Quote"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteQuotation(quote.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Quote"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quotation Editor Modal */}
      {isEditorOpen && (
        <QuotationEditorModal
          quotation={selectedQuoteForEdit}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setSelectedQuoteForEdit(null);
          }}
          onSave={handleSaveQuotation}
          jobs={jobs}
          currentUser={currentUser}
          logo={logo}
          activeBranch={activeBranch}
        />
      )}

      {/* Pre-Download Customization Modal */}
      {isDownloadOpen && selectedQuoteForDownload && (
        <QuotationDownloadModal
          quotation={selectedQuoteForDownload}
          isOpen={isDownloadOpen}
          onClose={() => {
            setIsDownloadOpen(false);
            setSelectedQuoteForDownload(null);
          }}
          onUpdateQuotation={handleSaveQuotation}
          logo={logo}
        />
      )}

      {/* Supabase SQL Code Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Supabase SQL Code</h3>
                  <p className="text-xs text-slate-500 font-medium">Run this in your Supabase SQL Editor to provision the quotations module</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSqlModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-200 space-y-4">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800">
                <span>Migration: quotations_migration.sql</span>
                <span className="text-emerald-400">PostgreSQL / Supabase Schema</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed select-all">
                {sqlCode}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <p className="text-xs text-slate-500">
                File is also saved to <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold">quotations_migration.sql</code> in root.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition"
                >
                  {copiedSql ? (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy SQL Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
