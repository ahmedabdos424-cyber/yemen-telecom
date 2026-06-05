import React, { useState } from 'react';
import { ViewType } from '../types';
import AdminMoreDrawer from './AdminMoreDrawer';

interface BottomNavProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  unresolvedAlertsCount: number;
  onLogout?: () => void;
}

export default function BottomNav({ currentView, setView, unresolvedAlertsCount, onLogout }: BottomNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primaryNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: 'home' },
    { id: 'agents', label: 'الوكلاء', icon: 'groups' },
    { id: 'sims', label: 'شرائحي', icon: 'sim_card' },
    { id: 'reports', label: 'التقارير', icon: 'analytics' },
    { id: 'settings', label: 'الإعدادات', icon: 'settings' },
    { id: 'more', label: 'المزيد', icon: 'apps' },
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === 'more') {
      setIsMoreOpen(true);
    } else {
      setView(itemId as ViewType);
      setIsMoreOpen(false);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-300/90 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] z-50 transition-all duration-200 nav-safe-bottom">
        <div className="max-w-7xl mx-auto h-14 md:h-16 px-2 md:px-8 flex justify-between items-center" dir="rtl">
          {primaryNavItems.map((item) => {
            const isSelected = currentView === item.id ||
              (item.id === 'agents' && currentView === 'add-agent') ||
              (item.id === 'more' && isMoreOpen);
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative cursor-pointer active:scale-95 transition-all select-none group focus:outline-none focus:ring-2 focus:ring-secondary/35 rounded-xl min-w-0 ${isSelected ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {isSelected && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 md:w-10 h-0.5 bg-red-600 rounded-b-md"></span>}
                <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-150 ${isSelected ? 'bg-red-600/10 text-red-600' : 'text-slate-400'}`}>
                  <span className={`material-symbols-outlined text-xl md:text-2xl transition-transform ${isSelected ? 'font-bold' : ''}`}>{item.icon}</span>
                </div>
                <span className={`text-[9px] md:text-[10px] mt-0.5 font-medium tracking-tight transition-colors truncate w-full text-center ${isSelected ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>{item.label}</span>
                {item.id === 'reports' && unresolvedAlertsCount > 0 && (
                  <span className="absolute top-0.5 right-1/2 translate-x-3 md:translate-x-4 bg-red-600 text-white font-mono text-[7px] md:text-[8px] font-bold w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center border border-white">!</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <AdminMoreDrawer
        isMoreOpen={isMoreOpen}
        setIsMoreOpen={setIsMoreOpen}
        setView={setView}
        onLogout={onLogout}
      />
    </>
  );
}
