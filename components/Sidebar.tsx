
import React, { useState } from 'react';
import { LayoutDashboard, Calendar, CheckSquare, Zap, Box, Users, SlidersHorizontal, UserCog, FileCheck, ChevronLeft, ChevronRight, ClipboardList, X, FileText, Clipboard, Map } from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: UserProfile; // Passed full user profile instead of just isAdmin
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobileOpen?: boolean; 
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  isCollapsed, 
  setIsCollapsed,
  isMobileOpen,
  onCloseMobile
}) => {
  
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'schedule', label: 'Job Schedule', icon: Calendar, permission: 'schedule' },
    { id: 'job-board', label: 'Simple Board', icon: ClipboardList, permission: 'jobBoard' },
    { id: 'warehouse', label: 'Warehouse Area', icon: Box, permission: 'warehouse' },
    { id: 'import-clearance', label: 'Import Clearance', icon: FileCheck, permission: 'importClearance' },
    { id: 'approvals', label: 'Approval Pool', icon: CheckSquare, permission: 'approvals' },
    { id: 'writer-docs', label: 'Writer Docs', icon: FileText, permission: 'writerDocs' },
    { id: 'inventory', label: 'Inventory', icon: Clipboard, permission: 'inventory' },
    { id: 'tracking', label: 'Tracking', icon: Map, permission: 'tracking' }, // New Tracking Module
    { id: 'resources', label: 'Fleet & Crew', icon: Users, permission: 'resources' },
    { id: 'capacity', label: 'Capacity Settings', icon: SlidersHorizontal, permission: 'capacity' },
    { id: 'users', label: 'User Access', icon: UserCog, permission: 'users' },
    { id: 'ai', label: 'AI Optimizer', icon: Zap, permission: 'ai' },
  ];

  // Filter items based on permissions or ADMIN role
  const menuItems = allMenuItems.filter(item => {
    if (currentUser.role === UserRole.ADMIN) return true;
    return currentUser.permissions[item.permission as keyof typeof currentUser.permissions];
  });

  // Base classes for sidebar
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 bg-white shadow-2xl lg:shadow-xl border-r border-slate-200 
    transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:flex lg:flex-col
    ${isMobileOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0'}
    ${isCollapsed ? 'lg:w-24' : 'lg:w-80'}
  `;

  return (
    <aside className={sidebarClasses}>
      <div className={`p-6 md:p-10 border-b border-slate-100 bg-white shrink-0 flex items-center justify-between ${isCollapsed ? 'lg:justify-center lg:px-4' : 'items-start'}`}>
        <div className="flex flex-col select-none">
          {!isCollapsed ? (
            <>
              <span className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none">WRITER</span>
              <div className="flex flex-col mt-1">
                <span className="text-[10px] md:text-[11px] font-black text-[#E31E24] tracking-[0.4em] uppercase leading-none">Relocations</span>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mt-1">United Arab Emirates</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900 leading-none">W</span>
              <span className="text-[8px] font-black text-[#E31E24] uppercase mt-0.5">UAE</span>
            </div>
          )}
        </div>
        {/* Mobile Close Button */}
        <button onClick={onCloseMobile} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className={`flex-1 px-4 py-6 md:py-8 space-y-2 overflow-y-auto custom-scrollbar ${isCollapsed ? 'lg:px-2' : ''}`}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 py-3 md:py-4 rounded-2xl transition-all duration-300 group relative ${
              isCollapsed ? 'lg:justify-center lg:px-0 px-5' : 'px-5'
            } ${
              activeTab === item.id
                ? 'bg-slate-900 text-white shadow-lg translate-x-1'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
            <span className={`font-bold text-[11px] uppercase tracking-widest leading-none truncate whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>
              {item.label}
            </span>
            {activeTab === item.id && (
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full`}></div>
            )}
          </button>
        ))}
      </nav>

      <div className={`p-6 bg-slate-50/50 shrink-0 ${isCollapsed ? 'lg:px-2' : ''}`}>
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${isCollapsed ? 'lg:p-2 p-4' : 'p-4'}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center gap-3' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <div className={isCollapsed ? 'lg:hidden' : ''}>
              <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">System Live</p>
              <p className="text-slate-400 font-bold tracking-tight text-[9px]">Cloud sync active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Collapse Toggle Overlay - only visible on desktop hover */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute bottom-32 -right-3 w-6 h-6 bg-slate-900 text-white rounded-full items-center justify-center shadow-lg border-2 border-white hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100 z-50"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
};
