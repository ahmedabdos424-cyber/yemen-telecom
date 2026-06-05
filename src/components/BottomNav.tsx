import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
      <nav className="bottom-nav transition-all duration-200">
        <div className="max-w-7xl mx-auto h-14 md:h-16 px-1 md:px-4 flex justify-around items-center" dir="rtl">
          {primaryNavItems.map((item) => {
            const isSelected = currentView === item.id ||
              (item.id === 'agents' && currentView === 'add-agent') ||
              (item.id === 'more' && isMoreOpen);
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)}
                className={`bottom-nav-btn flex-col px-1 min-w-0 ${isSelected ? 'active' : ''}`}
                aria-label={item.label}
                aria-current={isSelected ? 'page' : undefined}>
                {isSelected && (
                  <motion.span layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-ym rounded-b-md" />
                )}
                <div className={`bottom-nav-icon ${isSelected ? 'bg-ym/10' : ''}`}>
                  <span className={`material-symbols-outlined text-2xl transition-transform duration-200 ${isSelected ? 'scale-110 font-bold' : ''}`}>{item.icon}</span>
                </div>
                <span className="bottom-nav-label">{item.label}</span>
                {item.id === 'reports' && unresolvedAlertsCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute top-0.5 right-1/2 translate-x-3 translate-y-0.5 bg-red-600 text-white font-mono text-[8px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {unresolvedAlertsCount > 9 ? '9+' : unresolvedAlertsCount}
                  </motion.span>
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
