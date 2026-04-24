
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Upload, Printer, AlertTriangle, CheckCircle2, 
  Search, Package, Plus, Trash2, Edit3, Loader2, FileUp, Info, ChevronRight, Hash, X, Users, MessageSquare, ListTodo, Save, Lock, Unlock
} from 'lucide-react';
import { PackingList, PackingListItem, PackageDetail, UserProfile } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';

interface DigitalPackingListProps {
  currentUser: UserProfile;
}

interface PackageEditState {
  itemId: string;
  pkgNumber: string;
  contents: string;
  comments: string;
}

interface SignaturePadState {
  type: 'writer' | 'client' | 'company' | 'client2';
  label: string;
}

export const DigitalPackingList: React.FC<DigitalPackingListProps> = ({ currentUser }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentList, setCurrentList] = useState<PackingList | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPackage, setEditingPackage] = useState<PackageEditState | null>(null);
  const [activeSignature, setActiveSignature] = useState<SignaturePadState | null>(null);
  const [sigName, setSigName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  // Initialize signatures if needed
  useEffect(() => {
    if (currentList && !currentList.signatures) {
      setCurrentList({
        ...currentList,
        signatures: {
          writerSupervisorName: '',
          writerSupervisorSig: '',
          clientName: '',
          clientSig: '',
          companySupervisorName: '',
          companySupervisorSig: '',
          secondClientName: '',
          secondClientSig: ''
        }
      });
    }
  }, [currentList]);

  const checkDuplicateAcrossAll = (pkgNumber: string, items: PackingListItem[]): boolean => {
    return items.some(item => item.packages.some(p => p.number.toLowerCase() === pkgNumber.toLowerCase()));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image') && file.type !== 'application/pdf') {
      setUploadError('Please upload an image or PDF of the survey sheet.');
      return;
    }

    setUploadError(null);
    setIsExtracting(true);

    try {
      const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const base64Data = await readFileAsBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Extract the inventory details from this survey summary sheet. Return a JSON object matching the following schema." },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              client: { type: Type.STRING },
              ref_no: { type: Type.STRING },
              shipment_id: { type: Type.STRING },
              mode: { type: Type.STRING },
              origin_city: { type: Type.STRING },
              destination_city: { type: Type.STRING },
              survey_date: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    article: { type: Type.STRING },
                    qty: { type: Type.NUMBER },
                    vol_cft: { type: Type.NUMBER },
                    vol_cbm: { type: Type.NUMBER },
                    room: { type: Type.STRING },
                    pbo: { type: Type.BOOLEAN },
                    dismantle_assemble: { type: Type.BOOLEAN }
                  },
                  required: ["article", "qty"]
                }
              }
            }
          }
        }
      });

      const extractedData = JSON.parse(response.text);
      
      const newList: PackingList = {
        id: `PL-${Date.now()}`,
        client: extractedData.client || 'Unknown Client',
        ref_no: extractedData.ref_no || 'TBD',
        shipment_id: extractedData.shipment_id || '001',
        mode: extractedData.mode || 'Sea',
        origin_city: extractedData.origin_city || '',
        destination_city: extractedData.destination_city || '',
        survey_date: extractedData.survey_date || new Date().toLocaleDateString(),
        items: (extractedData.items || []).map((item: any, idx: number) => ({
          ...item,
          id: `item-${idx}`,
          packages: []
        })),
        created_at: Date.now()
      };

      setCurrentList(newList);
    } catch (error) {
      console.error('AI Extraction failed:', error);
      setUploadError('Failed to extract data. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddPackage = (itemId: string, value: string) => {
    if (!currentList) return;
    const item = currentList.items.find(i => i.id === itemId);
    if (!item) return;

    let formattedValue = value.trim();
    if (/^\d+$/.test(formattedValue)) {
      formattedValue = `Pkgs ${formattedValue}`;
    }

    if (checkDuplicateAcrossAll(formattedValue, currentList.items)) {
      setDuplicateWarning(`Error: Package number "${formattedValue}" already exists in this packing list.`);
      setTimeout(() => setDuplicateWarning(null), 3000);
      return;
    }

    const newPackage: PackageDetail = {
      number: formattedValue,
      contents: '',
      comments: ''
    };

    const updatedItems = currentList.items.map(i => {
      if (i.id === itemId) {
        return { ...i, packages: [...i.packages, newPackage] };
      }
      return i;
    });

    setCurrentList({ ...currentList, items: updatedItems });
  };

  const removePackage = (itemId: string, pkgNumber: string) => {
    if (!currentList) return;
    const updatedItems = currentList.items.map(item => {
      if (item.id === itemId) {
        return { ...item, packages: item.packages.filter(p => p.number !== pkgNumber) };
      }
      return item;
    });
    setCurrentList({ ...currentList, items: updatedItems });
  };

  const updatePackageDetails = () => {
    if (!currentList || !editingPackage) return;

    const updatedItems = currentList.items.map(item => {
      if (item.id === editingPackage.itemId) {
        const updatedPkgs = item.packages.map(p => {
          if (p.number === editingPackage.pkgNumber) {
            return {
              ...p,
              contents: editingPackage.contents,
              comments: editingPackage.comments
            };
          }
          return p;
        });
        return { ...item, packages: updatedPkgs };
      }
      return item;
    });

    setCurrentList({ ...currentList, items: updatedItems });
    setEditingPackage(null);
  };

  const handleSaveSignature = () => {
    if (!currentList || !activeSignature || !sigCanvasRef.current) return;
    
    const sigData = sigCanvasRef.current.toDataURL();
    const updatedSigs = { ...(currentList.signatures || {}) };

    if (activeSignature.type === 'writer') {
      updatedSigs.writerSupervisorName = sigName;
      updatedSigs.writerSupervisorSig = sigData;
    } else if (activeSignature.type === 'client') {
      updatedSigs.clientName = sigName;
      updatedSigs.clientSig = sigData;
    } else if (activeSignature.type === 'company') {
      updatedSigs.companySupervisorName = sigName;
      updatedSigs.companySupervisorSig = sigData;
    } else if (activeSignature.type === 'client2') {
      updatedSigs.secondClientName = sigName;
      updatedSigs.secondClientSig = sigData;
    }

    setCurrentList({ ...currentList, signatures: updatedSigs as any });
    setActiveSignature(null);
    setSigName('');
  };

  const generatePDF = () => {
    if (!currentList) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('WRITER', 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(227, 30, 36);
    doc.text('RELOCATIONS', 15, 25, { charSpace: 2 });
    
    doc.setTextColor(64, 64, 64);
    doc.setFontSize(16);
    doc.text('DIGITAL PACKING LIST', 148, 22, { align: 'center' });

    // Info Section
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 35, 267, 30, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT & SHIPMENT DETAILS', 20, 42);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${currentList.client}`, 20, 50);
    doc.text(`Origin: ${currentList.origin_city}`, 100, 50);
    doc.text(`Shipment ID: ${currentList.shipment_id}`, 180, 50);
    
    doc.text(`Ref#: ${currentList.ref_no}`, 20, 57);
    doc.text(`Dest: ${currentList.destination_city}`, 100, 57);
    doc.text(`Survey Date: ${currentList.survey_date}`, 180, 57);

    // Table
    const tableData = currentList.items.flatMap((item, idx) => {
      if (item.packages.length === 0) {
        return [[idx + 1, item.room || '-', item.article, item.qty, '-', '-', '-']];
      }
      return item.packages.map((pkg, pIdx) => [
        pIdx === 0 ? idx + 1 : '',
        pIdx === 0 ? (item.room || '-') : '',
        pIdx === 0 ? item.article : '',
        pIdx === 0 ? item.qty : '',
        pkg.number,
        pkg.contents || '-',
        pkg.comments || '-'
      ]);
    });

    autoTable(doc, {
      startY: 75,
      head: [['#', 'Room', 'Article Description', 'Qty', 'Package #', 'Contents', 'Comments']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 60 },
        3: { cellWidth: 10 },
        4: { cellWidth: 25 },
        5: { cellWidth: 65 },
        6: { cellWidth: 65 }
      }
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    const signatureWidth = 60;
    const spacing = 15;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    // Helper to add signature
    const addSignatureToPdf = (label: string, name: string, base64Sig: string, x: number, y: number) => {
      doc.text(label, x, y);
      if (base64Sig) {
        doc.addImage(base64Sig, 'PNG', x, y + 2, signatureWidth, 12);
      }
      doc.line(x, y + 15, x + signatureWidth, y + 15);
      doc.text(name || 'Print Name & Sign', x, y + 20);
    };

    // Row 1
    addSignatureToPdf('Supervisor (Writer Relocations)', currentList.signatures?.writerSupervisorName || '', currentList.signatures?.writerSupervisorSig || '', 15, finalY);
    addSignatureToPdf('Client', currentList.signatures?.clientName || '', currentList.signatures?.clientSig || '', 15 + signatureWidth + spacing, finalY);

    // Row 2
    addSignatureToPdf('Supervisor (Company Name)', currentList.signatures?.companySupervisorName || '', currentList.signatures?.companySupervisorSig || '', 15 + 2 * signatureWidth + 2 * spacing, finalY);
    addSignatureToPdf('Client (Confirmation)', currentList.signatures?.secondClientName || '', currentList.signatures?.secondClientSig || '', 15 + 3 * signatureWidth + 3 * spacing, finalY);

    doc.save(`PackingList_${currentList.client.replace(/\s+/g, '_')}.pdf`);
  };

  const filteredItems = currentList?.items.filter(i => 
    i.article.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.room && i.room.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="bg-white border-b border-slate-200 px-6 py-8 md:px-10 sticky top-0 z-40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Digital Packing List</h1>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] ml-1">Inventory Management & Export</p>
          </div>

          <div className="flex items-center gap-3">
             <input 
               type="file" 
               ref={fileInputRef}
               onChange={handleFileUpload}
               className="hidden"
               accept="image/*,application/pdf"
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={isExtracting}
               className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
             >
               {isExtracting ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <FileUp className="w-4 h-4" />}
               Upload Survey
             </button>
             
             {currentList && (
                <button 
                  onClick={generatePDF}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Export Landscape PDF
                </button>
             )}
          </div>
        </div>

        {duplicateWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 shadow-sm"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">Error: Duplicate Prevention</p>
              <p className="text-xs font-bold opacity-80">{duplicateWarning}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        {!currentList ? (
          <div className="max-w-xl mx-auto mt-20 text-center">
            <div className="w-24 h-24 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200/50">
               <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Initial Export Setup</h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-10">
              Process your survey summary to begin assigning packages. Each package can have its own contents and comments.
            </p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {[
                 { label: 'Client', value: currentList.client, icon: Users },
                 { label: 'Ref #', value: currentList.ref_no, icon: FileText },
                 { label: 'Shipment ID', value: currentList.shipment_id, icon: Hash },
                 { label: 'Total Items', value: currentList.items.length, icon: Package }
               ].map((card, i) => (
                 <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                       <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                          <card.icon className="w-4 h-4 text-slate-400" />
                       </div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 truncate">{card.value}</p>
                 </div>
               ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    Packing List Assignments
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase">Security Enabled</span>
                  </h3>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 pr-6 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-400 outline-none rounded-xl text-xs font-bold transition-all w-full md:w-80"
                    />
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[300px]">Package Assignments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-800">{item.article}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 italic">{item.room || 'General Room'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-slate-100 text-slate-600 text-xs font-black rounded-lg">
                              {item.qty}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-wrap gap-2 items-center">
                               {item.packages.map((pkg) => (
                                 <button 
                                   key={pkg.number} 
                                   onClick={() => setEditingPackage({
                                     itemId: item.id,
                                     pkgNumber: pkg.number,
                                     contents: pkg.contents,
                                     comments: pkg.comments
                                   })}
                                   className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                 >
                                   <Package className="w-3 h-3" />
                                   {pkg.number}
                                   <span className="ml-1 opacity-50">•</span>
                                   <X 
                                     className="w-3 h-3 hover:text-rose-400 ml-1" 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       removePackage(item.id, pkg.number);
                                     }} 
                                   />
                                 </button>
                               ))}
                               <div className="relative">
                                  <input 
                                    type="text" 
                                    placeholder="Add Pkgs..."
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleAddPackage(item.id, e.currentTarget.value);
                                        e.currentTarget.value = '';
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 border-none outline-none rounded-xl text-[10px] font-black uppercase tracking-wider w-24 focus:w-40 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                                  />
                               </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>

            {/* Signature Section */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10">
               <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
                 Authorization & Signatures
                 <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase">Official Verification</span>
               </h3>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { type: 'writer' as const, label: 'Writer Supervisor', name: currentList.signatures?.writerSupervisorName, sig: currentList.signatures?.writerSupervisorSig },
                    { type: 'client' as const, label: 'Client Signature', name: currentList.signatures?.clientName, sig: currentList.signatures?.clientSig },
                    { type: 'company' as const, label: 'Company Supervisor', name: currentList.signatures?.companySupervisorName, sig: currentList.signatures?.companySupervisorSig },
                    { type: 'client2' as const, label: 'Client Confirmation', name: currentList.signatures?.secondClientName, sig: currentList.signatures?.secondClientSig }
                  ].map((field) => (
                    <div key={field.type} className="flex flex-col">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{field.label}</label>
                       <div 
                         onClick={() => {
                           setActiveSignature({ type: field.type, label: field.label });
                           setSigName(field.name || '');
                         }}
                         className="h-40 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all group relative overflow-hidden"
                       >
                         {field.sig ? (
                           <>
                             <img src={field.sig} alt={field.label} className="max-h-24 object-contain" />
                             <p className="mt-2 text-xs font-black text-slate-900">{field.name}</p>
                           </>
                         ) : (
                           <div className="flex flex-col items-center gap-2 text-slate-300 group-hover:text-blue-600">
                             <Edit3 className="w-6 h-6" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Click to Sign</span>
                           </div>
                         )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Package Edit Modal */}
      <AnimatePresence>
        {editingPackage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingPackage(null)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                   <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">Package Details</h3>
                   <p className="text-xs font-black text-blue-600 uppercase tracking-widest">{editingPackage.pkgNumber}</p>
                </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <ListTodo className="w-3.5 h-3.5" />
                       Contents Included
                    </label>
                    <textarea 
                      value={editingPackage.contents}
                      onChange={(e) => setEditingPackage({...editingPackage, contents: e.target.value})}
                      placeholder="List of items inside this package..."
                      className="w-full h-32 px-5 py-4 bg-slate-50 border-none outline-none rounded-2xl text-sm font-bold resize-none focus:ring-4 focus:ring-blue-50 transition-all"
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <MessageSquare className="w-3.5 h-3.5" />
                       Additional Comments
                    </label>
                    <textarea 
                      value={editingPackage.comments}
                      onChange={(e) => setEditingPackage({...editingPackage, comments: e.target.value})}
                      placeholder="Special handling instructions or notes..."
                      className="w-full h-24 px-5 py-4 bg-slate-50 border-none outline-none rounded-2xl text-sm font-bold resize-none focus:ring-4 focus:ring-blue-50 transition-all"
                    />
                 </div>

                 <button 
                   onClick={updatePackageDetails}
                   className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                 >
                   <Save className="w-4 h-4" />
                   Save Changes
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signature Modal */}
      <AnimatePresence>
        {activeSignature && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setActiveSignature(null)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                   <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">Add Digital Signature</h3>
                   <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">{activeSignature.label}</p>
                </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Users className="w-3.5 h-3.5" />
                       Full Name
                    </label>
                    <input 
                      type="text" 
                      value={sigName}
                      onChange={(e) => setSigName(e.target.value)}
                      placeholder="Enter signer's full name..."
                      className="w-full px-5 py-4 bg-slate-50 border-none outline-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-50 transition-all"
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Package className="w-3.5 h-3.5" />
                       Signature Pad
                    </label>
                    <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden">
                       <SignatureCanvas 
                         ref={sigCanvasRef}
                         penColor="black"
                         canvasProps={{
                           className: "w-full h-48",
                           style: { width: '100%', height: '192px' }
                         }}
                       />
                    </div>
                    <div className="flex justify-between mt-2">
                       <p className="text-[10px] font-bold text-slate-400 italic">Please sign within the box above</p>
                       <button 
                         onClick={() => sigCanvasRef.current?.clear()}
                         className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600"
                       >
                         Clear Pad
                       </button>
                    </div>
                 </div>

                 <button 
                   onClick={handleSaveSignature}
                   disabled={!sigName.trim()}
                   className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   <CheckCircle2 className="w-4 h-4" />
                   Confirm & Save Signature
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExtracting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl">
               <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-6" />
               <h3 className="text-xl font-black text-slate-900 mb-2">Processing Survey...</h3>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Converting to Digitial Inventory</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
