import { useState } from 'react';
import { ViewType } from '../types';
import AdminMoreDrawer from './AdminMoreDrawer';
import MobileBottomNav from './shared/MobileBottomNav';
import { managerNavItems } from './nav/navItems';

interface BottomNavProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  unresolvedAlertsCount: number;
  onLogout?: () => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export default function BottomNav({ currentView, setView, unresolvedAlertsCount, onLogout, mobileMenuOpen, setMobileMenuOpen }: BottomNavProps) {
  const [isMoreOpenInternal, setIsMoreOpenInternal] = useState(false);
  const isMoreOpen = mobileMenuOpen ?? isMoreOpenInternal;
  const setIsMoreOpen = setMobileMenuOpen ?? setIsMoreOpenInternal;

  const primaryNavItems = managerNavItems;

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
