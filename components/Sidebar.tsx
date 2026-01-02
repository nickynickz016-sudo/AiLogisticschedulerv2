
import React from 'react';
import { LayoutDashboard, Calendar, CheckSquare, Zap, Box, Users, SlidersHorizontal, UserCog, FileCheck, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isAdmin: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isAdmin, isCollapsed, setIsCollapsed }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Job Schedule', icon: Calendar },
    { id: 'job-board', label: 'Simple Board', icon: ClipboardList },
    { id: 'warehouse', label: 'Warehouse Area', icon: Box },
    { id: 'import-clearance', label: 'Import Clearance', icon: FileCheck },
    { id: 'approvals', label: 'Approval Pool', icon: CheckSquare },
    { id: 'resources', label: 'Fleet & Crew', icon: Users },
    { id: 'users', label: 'User Access', icon: UserCog },
    ...(isAdmin ? [{ id: 'capacity', label: 'Capacity Settings', icon: SlidersHorizontal }] : []),
    { id: 'ai', label: 'AI Optimizer', icon: Zap },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-24' : 'w-80'} bg-white flex flex-col shadow-xl z-40 border-r border-slate-200 transition-all duration-300 overflow-hidden relative group`}>
      <div className={`p-10 border-b border-slate-100 bg-white shrink-0 ${isCollapsed ? 'items-center px-4' : 'items-start'}`}>
        <div className="flex flex-col select-none">
          {!isCollapsed ? (
            <>
              <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">WRITER</span>
              <div className="flex flex-col mt-1">
                <span className="text-[11px] font-black text-[#E31E24] tracking-[0.4em] uppercase leading-none">Relocations</span>
                <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mt-1">United Arab Emirates</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900 leading-none">W</span>
              <span className="text-[8px] font-black text-[#E31E24] uppercase mt-0.5">UAE</span>
            </div>
          )}
        </div>
      </div>

      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-8 space-y-2 overflow-y-auto custom-scrollbar`}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 py-4 rounded-2xl transition-all duration-300 group relative ${
              isCollapsed ? 'justify-center px-0' : 'px-5'
            } ${
              activeTab === item.id
                ? 'bg-slate-900 text-white shadow-lg translate-x-1'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
            {!isCollapsed && (
              <span className="font-bold text-[11px] uppercase tracking-widest leading-none truncate whitespace-nowrap">{item.label}</span>
            )}
            {activeTab === item.id && (
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full`}></div>
            )}
          </button>
        ))}
      </nav>

      <div className={`p-6 bg-slate-50/50 shrink-0 ${isCollapsed ? 'px-2' : 'p-6'}`}>
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">System Live</p>
                <p className="text-[9px] text-slate-400 font-bold tracking-tight">Cloud sync active</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapse Toggle Overlay - only visible on sidebar hover for a cleaner look or persistent if desired */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute bottom-32 -right-3 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100 z-50"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
};
