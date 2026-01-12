
import React, { useState } from 'react';
import { Job } from '../types';
import { FileText, Search, File, Download, Trash2, CheckCircle2 } from 'lucide-react';

interface DocumentsViewProps {
  jobs: Job[];
}

interface MockDocument {
  id: string;
  name: string;
  type: 'Invoice' | 'BOL' | 'Packing List' | 'Customs' | 'Other';
  jobId: string;
  date: string;
  size: string;
  status: 'Verified' | 'Pending';
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ jobs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [documents, setDocuments] = useState<MockDocument[]>([]);

  const filteredDocs = documents.filter(doc => 
    (filterType === 'All' || doc.type === filterType) &&
    (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     doc.jobId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Documents Repository</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Centralized file management for logistics operations</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
         <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search by Job ID or File Name..." 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                {['All', 'Invoice', 'BOL', 'Packing List', 'Customs'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
                            filterType === type 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
                <div key={doc.id} className="group relative bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:border-slate-200 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${
                            doc.type === 'Invoice' ? 'bg-emerald-50 text-emerald-600' :
                            doc.type === 'BOL' ? 'bg-blue-50 text-blue-600' :
                            doc.type === 'Customs' ? 'bg-purple-50 text-purple-600' :
                            'bg-slate-50 text-slate-600'
                        }`}>
                           <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors">
                                <Download className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 text-sm mb-1 truncate" title={doc.name}>{doc.name}</h4>
                    <p className="text-xs text-slate-400 font-medium mb-4">{doc.size} • {doc.date}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                         <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                            {doc.jobId}
                         </span>
                         <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide ${
                             doc.status === 'Verified' ? 'text-emerald-600' : 'text-amber-500'
                         }`}>
                             {doc.status === 'Verified' && <CheckCircle2 className="w-3 h-3" />}
                             {doc.status}
                         </span>
                    </div>
                </div>
            ))}
            
            {filteredDocs.length === 0 && (
                <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4">
                        <File className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No documents found</p>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};
