import React, { useState } from 'react';
import { 
  X, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  Sparkles, 
  ExternalLink, 
  FileText, 
  AlertCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { 
  Quotation, 
  QuotationBulletItem, 
  DEFAULT_FCL_INCLUSIONS, 
  DEFAULT_FCL_EXCLUSIONS,
  DEFAULT_GROUPAGE_INCLUSIONS,
  DEFAULT_GROUPAGE_EXCLUSIONS
} from '../types';
import { generateQuotationPdf } from '../utils/quotationPdf';
import { downloadPdfBlob } from '../utils';

interface QuotationDownloadModalProps {
  quotation: Quotation;
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuotation?: (updated: Quotation) => void;
  logo?: string;
}

export const QuotationDownloadModal: React.FC<QuotationDownloadModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onUpdateQuotation,
  logo
}) => {
  const [activeTab, setActiveTab] = useState<'inclusions' | 'exclusions' | 'notes' | 'links'>('inclusions');
  
  // Local state for interactive choices prior to generating PDF
  const [inclusions, setInclusions] = useState<QuotationBulletItem[]>(() => 
    quotation.inclusions?.length 
      ? JSON.parse(JSON.stringify(quotation.inclusions))
      : (quotation.format === 'FCL_EXPORT' ? DEFAULT_FCL_INCLUSIONS : DEFAULT_GROUPAGE_INCLUSIONS)
  );

  const [exclusions, setExclusions] = useState<QuotationBulletItem[]>(() => 
    quotation.exclusions?.length 
      ? JSON.parse(JSON.stringify(quotation.exclusions))
      : (quotation.format === 'FCL_EXPORT' ? DEFAULT_FCL_EXCLUSIONS : DEFAULT_GROUPAGE_EXCLUSIONS)
  );

  const [specialNotes, setSpecialNotes] = useState(quotation.special_notes || '');
  const [specialNotesBold, setSpecialNotesBold] = useState(quotation.special_notes_bold ?? true);
  const [specialNotesHighlighted, setSpecialNotesHighlighted] = useState(quotation.special_notes_highlighted ?? true);
  
  const [logoUrl, setLogoUrl] = useState(quotation.logo_url || 'https://www.writerrelocations.com');
  const [termsUrl, setTermsUrl] = useState(quotation.terms_and_conditions_url || 'https://www.writerrelocations.com/terms-and-conditions');
  const [termsText, setTermsText] = useState(quotation.terms_and_conditions_text || 'Writer Relocations Standard Terms and Conditions');

  const [newInclusionText, setNewInclusionText] = useState('');
  const [newExclusionText, setNewExclusionText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [directBlobUrl, setDirectBlobUrl] = useState<string | null>(null);
  const [directFilename, setDirectFilename] = useState<string>('Quotation.pdf');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  // Toggle single inclusion bullet
  const handleToggleInclusion = (id: string) => {
    setInclusions(prev => prev.map(item => item.id === id ? { ...item, included: !item.included } : item));
  };

  // Toggle single exclusion bullet
  const handleToggleExclusion = (id: string) => {
    setExclusions(prev => prev.map(item => item.id === id ? { ...item, included: !item.included } : item));
  };

  // Update text of a bullet
  const handleEditInclusion = (id: string, text: string) => {
    setInclusions(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const handleEditExclusion = (id: string, text: string) => {
    setExclusions(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  // Delete bullet
  const handleDeleteInclusion = (id: string) => {
    setInclusions(prev => prev.filter(item => item.id !== id));
  };

  const handleDeleteExclusion = (id: string) => {
    setExclusions(prev => prev.filter(item => item.id !== id));
  };

  // Add custom bullet
  const handleAddInclusion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInclusionText.trim()) return;
    const newItem: QuotationBulletItem = {
      id: `custom-inc-${Date.now()}`,
      text: newInclusionText.trim(),
      included: true
    };
    setInclusions(prev => [...prev, newItem]);
    setNewInclusionText('');
  };

  const handleAddExclusion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExclusionText.trim()) return;
    const newItem: QuotationBulletItem = {
      id: `custom-exc-${Date.now()}`,
      text: newExclusionText.trim(),
      included: true
    };
    setExclusions(prev => [...prev, newItem]);
    setNewExclusionText('');
  };

  // Batch toggle
  const handleSelectAllInclusions = (select: boolean) => {
    setInclusions(prev => prev.map(item => ({ ...item, included: select })));
  };

  const handleSelectAllExclusions = (select: boolean) => {
    setExclusions(prev => prev.map(item => ({ ...item, included: select })));
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (confirm('Reset inclusions and exclusions to default standard template?')) {
      if (quotation.format === 'FCL_EXPORT') {
        setInclusions(DEFAULT_FCL_INCLUSIONS.map(i => ({ ...i })));
        setExclusions(DEFAULT_FCL_EXCLUSIONS.map(e => ({ ...e })));
      } else {
        setInclusions(DEFAULT_GROUPAGE_INCLUSIONS.map(i => ({ ...i })));
        setExclusions(DEFAULT_GROUPAGE_EXCLUSIONS.map(e => ({ ...e })));
      }
    }
  };

  // Generate and Download PDF
  const handleDownload = () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setDownloadSuccess(false);

    try {
      // Build snapshot with active user choices
      const customizedQuotation: Quotation = {
        ...quotation,
        inclusions: inclusions || [],
        exclusions: exclusions || [],
        special_notes: specialNotes || '',
        special_notes_bold: specialNotesBold,
        special_notes_highlighted: specialNotesHighlighted,
        logo_url: logoUrl,
        terms_and_conditions_url: termsUrl,
        terms_and_conditions_text: termsText
      };

      // Save back to parent state/database if handler is provided
      if (onUpdateQuotation) {
        try {
          onUpdateQuotation(customizedQuotation);
        } catch (saveErr) {
          console.warn('Update quotation callback error (continuing download):', saveErr);
        }
      }

      // Generate PDF
      const doc = generateQuotationPdf({
        quotation: customizedQuotation,
        logo,
        logoLinkUrl: logoUrl,
        termsLinkUrl: termsUrl,
        highlightSpecialNotes: specialNotesBold || specialNotesHighlighted
      });

      const quotePart = (customizedQuotation.quotation_no || 'Quotation').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Quotation';
      const clientPart = (customizedQuotation.client_name || 'Client').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Client';
      const safeFilename = `${quotePart}_${clientPart}.pdf`;
      setDirectFilename(safeFilename);

      // Create Blob and Object URL
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      setDirectBlobUrl(blobUrl);

      // Trigger robust multi-platform download
      downloadPdfBlob(blob, safeFilename);

      // Also invoke doc.save as secondary fallback
      try {
        doc.save(safeFilename);
      } catch (saveEx) {
        console.warn('doc.save notice:', saveEx);
      }

      setDownloadSuccess(true);
    } catch (err: any) {
      console.error('Failed to generate quotation PDF:', err);
      setErrorMessage(err?.message || 'Error generating PDF. Please review quotation fields.');
    } finally {
      setIsGenerating(false);
    }
  };

  const includedCount = inclusions.filter(i => i.included).length;
  const excludedCount = exclusions.filter(e => e.included).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#E31E24]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Prepare Quotation PDF</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {quotation.quotation_no}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  quotation.format === 'FCL_EXPORT' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {quotation.format === 'FCL_EXPORT' ? 'FCL Export' : 'Groupage FCL'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Choose and bulletize which items appear as Inclusions and Exclusions in the final PDF
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inclusions')}
              className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                activeTab === 'inclusions' 
                  ? 'text-emerald-700 border-b-2 border-emerald-600' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Inclusions ({includedCount}/{inclusions.length})
            </button>
            <button
              onClick={() => setActiveTab('exclusions')}
              className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                activeTab === 'exclusions' 
                  ? 'text-red-700 border-b-2 border-[#E31E24]' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Exclusions ({excludedCount}/{exclusions.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                activeTab === 'notes' 
                  ? 'text-amber-700 border-b-2 border-amber-600' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Special Notes (Bold/Highlight)
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all relative ${
                activeTab === 'links' 
                  ? 'text-blue-700 border-b-2 border-blue-600' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Clickable Links & Logo
            </button>
          </div>

          <button
            onClick={handleResetDefaults}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 pb-3 px-2"
            title="Reset to default template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
          
          {/* TAB 1: INCLUSIONS */}
          {activeTab === 'inclusions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-900">
                    Checked items will be printed as bullet points under "INCLUSIONS" in the PDF.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectAllInclusions(true)}
                    className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllInclusions(false)}
                    className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Add Custom Inclusion */}
              <form onSubmit={handleAddInclusion} className="flex gap-2">
                <input
                  type="text"
                  value={newInclusionText}
                  onChange={(e) => setNewInclusionText(e.target.value)}
                  placeholder="Type a new inclusion bullet point and press Enter or Add..."
                  className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newInclusionText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Bullet
                </button>
              </form>

              {/* Inclusions List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {inclusions.map((item, idx) => (
                  <div 
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      item.included 
                        ? 'bg-white border-emerald-200 shadow-sm' 
                        : 'bg-slate-100/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={() => handleToggleInclusion(item.id)}
                      className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-emerald-700 shrink-0 mt-0.5">
                      •
                    </span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleEditInclusion(item.id, e.target.value)}
                      className="flex-1 text-xs text-slate-800 bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded p-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteInclusion(item.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
                      title="Remove bullet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EXCLUSIONS */}
          {activeTab === 'exclusions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-red-50/60 p-3 rounded-2xl border border-red-100">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="text-xs font-bold text-red-900">
                    Checked items will be printed as bullet points under "EXCLUSIONS" in the PDF.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectAllExclusions(true)}
                    className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllExclusions(false)}
                    className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Add Custom Exclusion */}
              <form onSubmit={handleAddExclusion} className="flex gap-2">
                <input
                  type="text"
                  value={newExclusionText}
                  onChange={(e) => setNewExclusionText(e.target.value)}
                  placeholder="Type a new exclusion bullet point and press Enter or Add..."
                  className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  disabled={!newExclusionText.trim()}
                  className="px-4 py-2.5 bg-[#E31E24] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Bullet
                </button>
              </form>

              {/* Exclusions List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {exclusions.map((item, idx) => (
                  <div 
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      item.included 
                        ? 'bg-white border-red-200 shadow-sm' 
                        : 'bg-slate-100/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={() => handleToggleExclusion(item.id)}
                      className="mt-1 w-4 h-4 rounded text-[#E31E24] focus:ring-red-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-[11px] font-black text-red-600 shrink-0 mt-0.5">
                      -
                    </span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleEditExclusion(item.id, e.target.value)}
                      className="flex-1 text-xs text-slate-800 bg-transparent border-0 focus:ring-1 focus:ring-red-500 rounded p-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteExclusion(item.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
                      title="Remove bullet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SPECIAL NOTES (BOLD / HIGHLIGHTED) */}
          {activeTab === 'notes' && (
            <div className="space-y-5">
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                        Highlight & Bold Special Notes Option
                      </h4>
                      <p className="text-[11px] text-amber-700">
                        When enabled, notes will appear with bold text inside a prominent colored callout box in the PDF.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm">
                    <input
                      type="checkbox"
                      checked={specialNotesBold}
                      onChange={(e) => {
                        setSpecialNotesBold(e.target.checked);
                        setSpecialNotesHighlighted(e.target.checked);
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="text-xs font-black text-amber-900">Make Notes Bold & Highlight</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Special Notes & Operational Conditions Text
                </label>
                <textarea
                  rows={6}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Enter important notes, vessel schedule notices, customs clearance requirements, ISPM 15 compliance, etc."
                  className={`w-full text-xs p-4 rounded-2xl border transition-all focus:outline-none focus:ring-2 ${
                    specialNotesBold 
                      ? 'font-bold bg-amber-50/30 border-amber-300 text-amber-950 focus:ring-amber-500' 
                      : 'font-normal bg-white border-slate-200 text-slate-800 focus:ring-slate-400'
                  }`}
                />
              </div>

              {/* Live Preview Box */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  PDF Visual Presentation Preview:
                </span>
                <div className={`p-4 rounded-2xl border transition-all ${
                  specialNotesBold 
                    ? 'bg-amber-100/70 border-amber-500 text-amber-950 font-bold border-l-4' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 font-normal'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                    {specialNotesBold ? 'CRITICAL NOTICE & SPECIAL FREIGHT CONDITIONS (BOLD CALLOUT)' : 'SPECIAL NOTES'}
                  </p>
                  <p className="text-xs leading-relaxed">
                    {specialNotes || 'No special notes entered.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLICKABLE LINKS & LOGO */}
          {activeTab === 'links' && (
            <div className="space-y-5">
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">
                      Interactive Hyperlinks in PDF
                    </h4>
                    <p className="text-[11px] text-blue-700">
                      Recipients clicking on the Writer Relocations logo or the Terms and Conditions text inside the PDF will open the web URLs below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Clickable Logo Destination URL
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://www.writerrelocations.com"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Clicking the Writer Relocations logo on any page of the PDF takes the client to this website.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    General Terms & Conditions Link URL
                  </label>
                  <input
                    type="url"
                    value={termsUrl}
                    onChange={(e) => setTermsUrl(e.target.value)}
                    placeholder="https://www.writerrelocations.com/terms-and-conditions"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Target website link for the "General Terms and Conditions" hyperlinked text in the PDF.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Terms & Conditions Display Text
                  </label>
                  <input
                    type="text"
                    value={termsText}
                    onChange={(e) => setTermsText(e.target.value)}
                    placeholder="Writer Relocations Standard Terms and Conditions"
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Status / Error Notifications */}
        {errorMessage && (
          <div className="mx-6 my-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {downloadSuccess && (
          <div className="mx-6 my-3 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                  Official Quotation PDF Ready!
                </p>
                <p className="text-[11px] text-emerald-800 font-medium">
                  {directFilename} &bull; Branded Writer Relocations Export Quote
                </p>
              </div>
            </div>

            {directBlobUrl && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={directBlobUrl}
                  download={directFilename}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  Save PDF File
                </a>
                <a
                  href={directBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-700" />
                  Open in New Tab
                </a>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-900">{includedCount}</span> inclusions &nbsp;•&nbsp;
            <span className="font-bold text-slate-900">{excludedCount}</span> exclusions &nbsp;•&nbsp;
            <span className={specialNotesBold ? 'text-amber-700 font-bold' : 'text-slate-500'}>
              {specialNotesBold ? 'Notes Bolded & Highlighted' : 'Notes Standard'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                downloadSuccess 
                  ? 'bg-emerald-600 shadow-emerald-500/20' 
                  : 'bg-[#E31E24] hover:bg-red-700 shadow-red-500/20'
              }`}
            >
              <Download className="w-4 h-4" />
              {isGenerating 
                ? 'Generating PDF...' 
                : downloadSuccess 
                ? 'PDF Downloaded!' 
                : 'Download Official PDF'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
