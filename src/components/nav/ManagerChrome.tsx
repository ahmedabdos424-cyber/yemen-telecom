import { ViewType } from '../../types';
import TopBar from '../TopBar';
import BottomNav from '../BottomNav';
import type { Alert } from '../TopBar';

interface ManagerChromeProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  unresolvedAlertsCount: number;
  alerts?: Alert[];
  displayName?: string;
  role?: string;
  onLogout?: () => void;
}

// هيكل التنقل الموحّد للمدير: يجمع الشريط العلوي (TopBar) وشريط التنقل السفلي
// (BottomNav) في مكوّن واحد، ويشارك نفس دالة setView بينهما لتجنّب تكرار الربط.
export default function ManagerChrome({
  currentView,
  setView,
  unresolvedAlertsCount,
  alerts,
  displayName,
  role,
  onLogout,
}: ManagerChromeProps) {
  return (
    <>
      <TopBar
        currentView={currentView}
        setView={setView}
        unresolvedAlertsCount={unresolvedAlertsCount}
        alerts={alerts}
        displayName={displayName}
        role={role}
        onLogout={onLogout}
      />
      <BottomNav
        currentView={currentView}
        setView={setView}
        unresolvedAlertsCount={unresolvedAlertsCount}
        onLogout={onLogout}
      />
    </>
  );
}
