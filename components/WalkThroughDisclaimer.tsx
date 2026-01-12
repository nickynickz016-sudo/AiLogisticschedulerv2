
import React, { useState, useRef, useEffect } from 'react';
import { Save, Eraser, CheckSquare, PenTool, Printer } from 'lucide-react';
import jsPDF from 'jspdf';

export const WalkThroughDisclaimer: React.FC = () => {
  const [formData, setFormData] = useState({
    clientName: '',
    jobId: '',
    date: new Date().toISOString().split('T')[0],
    address: '',
    crewLeader: '',
  });

  const [checklist, setChecklist] = useState({
    allGoodsPacked: false,
    noItemsLeftBehind: false,
    residenceCondition: false,
    cabinetsChecked: false,
    debrisRemoved: false,
  });

  // Canvas Logic for Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    // Initialize canvas context
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas size to parent width for responsiveness
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 200;
      }
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, []);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on touch
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const endDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
      }
    }
  };

  const generatePDF = () => {
    if (!formData.clientName) {
      alert("Please enter client name.");
      return;
    }
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("WRITER RELOCATIONS", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.text("WALK THROUGH DISCLAIMER", 105, 30, { align: "center" });
    
    // Job Details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Date: ${formData.date}`, 20, 50);
    doc.text(`Job Reference: ${formData.jobId}`, 140, 50);
    doc.text(`Client Name: ${formData.clientName}`, 20, 60);
    doc.text(`Address: ${formData.address}`, 20, 70);
    
    doc.line(20, 75, 190, 75);
    
    // Checklist
    let yPos = 90;
    doc.setFont("helvetica", "bold");
    doc.text("Checklist Acknowledgement:", 20, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    
    const checkItem = (text: string, checked: boolean) => {
      const status = checked ? "[ X ]" : "[   ]";
      doc.text(`${status} ${text}`, 25, yPos);
      yPos += 8;
    };

    checkItem("I acknowledge a final walk-through was conducted.", true); // Assuming signing means yes
    checkItem("All goods & personal effects have been packed/loaded.", checklist.allGoodsPacked);
    checkItem("No items were left behind in the residence/facility.", checklist.noItemsLeftBehind);
    checkItem("I confirm the condition of the premises is satisfactory.", checklist.residenceCondition);
    checkItem("All cupboards, cabinets, and storage areas were checked.", checklist.cabinetsChecked);
    checkItem("All packing debris has been removed.", checklist.debrisRemoved);
    
    yPos += 10;
    doc.line(20, yPos, 190, yPos);
    yPos += 15;
    
    // Disclaimer Text
    doc.setFontSize(9);
    const disclaimer = "By signing below, the client confirms that the crew has performed the services to satisfaction. The client releases Writer Relocations from liability for any items claimed missing after the crew has departed the premises, provided that the client has had the opportunity to inspect the premises.";
    const splitText = doc.splitTextToSize(disclaimer, 170);
    doc.text(splitText, 20, yPos);
    
    yPos += 30;
    
    // Signature
    if (hasSignature && canvasRef.current) {
        const imgData = canvasRef.current.toDataURL("image/png");
        doc.text("Client Signature:", 20, yPos - 5);
        doc.addImage(imgData, 'PNG', 20, yPos, 60, 30);
        
        doc.text("Crew Leader Signature:", 120, yPos - 5);
        // Placeholder line for crew
        doc.line(120, yPos + 25, 180, yPos + 25);
    }
    
    doc.save(`Disclaimer_${formData.clientName}_${formData.jobId}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Walk Through Disclaimer</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Digital sign-off for job completion and premises inspection</p>
        </div>
        <button 
          onClick={generatePDF}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-slate-200"
        >
          <Printer className="w-5 h-5" />
          Save & Print PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        {/* Form Header */}
        <div className="bg-slate-50 p-8 border-b border-slate-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label>
                 <input 
                   type="text" 
                   value={formData.clientName}
                   onChange={e => setFormData({...formData, clientName: e.target.value})}
                   className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                   placeholder="e.g. John Doe"
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Reference</label>
                 <input 
                   type="text" 
                   value={formData.jobId}
                   onChange={e => setFormData({...formData, jobId: e.target.value})}
                   className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                   placeholder="e.g. AE-10234"
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Service Address</label>
                 <input 
                   type="text" 
                   value={formData.address}
                   onChange={e => setFormData({...formData, address: e.target.value})}
                   className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                   placeholder="Villa 12, Springs 4, Dubai"
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                 <input 
                   type="date" 
                   value={formData.date}
                   onChange={e => setFormData({...formData, date: e.target.value})}
                   className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                 />
              </div>
           </div>
        </div>

        {/* Checklist */}
        <div className="p-8 border-b border-slate-200">
           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              Final Inspection Checklist
           </h3>
           <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'All goods & personal effects have been packed/loaded.', key: 'allGoodsPacked' },
                { label: 'No items were left behind in the residence/facility.', key: 'noItemsLeftBehind' },
                { label: 'I confirm the condition of the premises is satisfactory.', key: 'residenceCondition' },
                { label: 'All cupboards, cabinets, and storage areas were checked.', key: 'cabinetsChecked' },
                { label: 'All packing debris has been removed from the site.', key: 'debrisRemoved' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    (checklist as any)[item.key] ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'
                  }`}>
                    {(checklist as any)[item.key] && <CheckSquare className="w-4 h-4 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={(checklist as any)[item.key]}
                    onChange={(e) => setChecklist({...checklist, [item.key]: e.target.checked})}
                  />
                  <span className={`font-bold text-sm ${(checklist as any)[item.key] ? 'text-slate-800' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
           </div>
        </div>

        {/* Signature Area */}
        <div className="p-8 bg-slate-50/50">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-blue-600" />
                  Client Signature
              </h3>
              <button 
                onClick={clearSignature}
                className="text-xs font-bold text-rose-500 flex items-center gap-1 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Eraser className="w-4 h-4" /> Clear
              </button>
           </div>
           
           <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden shadow-sm relative">
              <canvas
                 ref={canvasRef}
                 className="w-full h-[200px] cursor-crosshair touch-none"
                 onMouseDown={startDrawing}
                 onMouseMove={draw}
                 onMouseUp={endDrawing}
                 onMouseLeave={endDrawing}
                 onTouchStart={startDrawing}
                 onTouchMove={draw}
                 onTouchEnd={endDrawing}
              />
              {!hasSignature && !isDrawing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-300 font-bold uppercase tracking-widest text-sm">Sign Here</p>
                </div>
              )}
           </div>
           <p className="text-[10px] text-slate-400 font-medium mt-3 text-center">
              By signing above, I confirm that a final walk-through has been completed and I agree to the checklist items marked above.
           </p>
        </div>
        
        {/* Footer Actions */}
        <div className="p-8 bg-white border-t border-slate-200 flex flex-col md:flex-row gap-4 justify-end">
           <div className="flex-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Crew Leader Name</label>
             <input 
                type="text" 
                value={formData.crewLeader}
                onChange={e => setFormData({...formData, crewLeader: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Staff Name"
             />
           </div>
           <button 
             onClick={generatePDF}
             className="md:w-auto w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all self-end"
           >
             <Save className="w-4 h-4" />
             Complete & Save
           </button>
        </div>
      </div>
    </div>
  );
};
