
import React from 'react';
import { AlertTriangle, Info, ShieldAlert, Wrench, X } from 'lucide-react';

interface SystemAlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'maintenance';
  onClose: () => void;
}

export const SystemAlertModal: React.FC<SystemAlertModalProps> = ({ isOpen, title, message, type, onClose }) => {
  if (!isOpen) return null;

  const getStyle = () => {
    switch (type) {
      case 'maintenance':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-100',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          btn: 'bg-amber-600 hover:bg-amber-700',
          icon: Wrench
        };
      case 'error':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-100',
          iconBg: 'bg-rose-100',
          iconColor: 'text-rose-600',
          btn: 'bg-rose-600 hover:bg-rose-700',
          icon: ShieldAlert
        };
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-100',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          btn: 'bg-orange-600 hover:bg-orange-700',
          icon: AlertTriangle
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          btn: 'bg-blue-600 hover:bg-blue-700',
          icon: Info
        };
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-white`}>
        <div className={`p-8 text-center border-b-4 ${type === 'error' ? 'border-rose-500' : type === 'maintenance' ? 'border-amber-500' : 'border-blue-500'}`}>
          <div className={`mx-auto w-20 h-20 ${style.iconBg} rounded-full flex items-center justify-center mb-6 shadow-inner`}>
            <Icon className={`w-10 h-10 ${style.iconColor}`} />
          </div>
          
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">
            {title}
          </h3>
          
          <div className={`p-4 rounded-xl ${style.bg} border ${style.border}`}>
            <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>

          <div className="mt-8">
            <button 
              onClick={onClose}
              className={`w-full py-4 rounded-xl text-white font-bold uppercase tracking-widest shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${style.btn}`}
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
