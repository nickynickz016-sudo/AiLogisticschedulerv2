
import React from 'react';
import { Palmtree, X } from 'lucide-react';

interface HolidayAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HolidayAlertModal: React.FC<HolidayAlertModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
      aria-modal="true"
      role="alertdialog"
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-center p-10"
        role="document"
      >
        <div className="mx-auto w-16 h-16 bg-rose-50 border-4 border-rose-100 rounded-full flex items-center justify-center mb-6">
          <Palmtree className="w-8 h-8 text-rose-500" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-800">Scheduling Blocked</h3>
        
        <p className="text-slate-600 mt-4 mb-2 font-medium">
          Holiday! No Job Can Be Scheduled on This Date.
        </p>
        <p className="text-sm text-slate-500">
          Please contact Administrator.
        </p>
        
        <button 
          onClick={onClose}
          className="w-full mt-8 py-3 font-semibold text-white bg-rose-500 rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        >
          Understood
        </button>
      </div>
    </div>
  );
};
