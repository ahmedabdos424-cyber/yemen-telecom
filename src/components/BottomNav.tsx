import { useState } from 'react';
import { ViewType } from '../types';
import AdminMoreDrawer from './AdminMoreDrawer';
import MobileBottomNav from './shared/MobileBottomNav';

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

  const navActiveId = isMoreOpen ? 'more' : currentView === 'add-agent' ? 'agents' : currentView;

  return (
    <>
      <MobileBottomNav
        items={primaryNavItems}
        activeId={navActiveId}
        onChange={handleNavClick}
        badgeCount={unresolvedAlertsCount}
        badgeOnId="reports"
      />
      <AdminMoreDrawer
        isMoreOpen={isMoreOpen}
        setIsMoreOpen={setIsMoreOpen}
        setView={setView}
        onLogout={onLogout}
      />
    </>
  );
}
