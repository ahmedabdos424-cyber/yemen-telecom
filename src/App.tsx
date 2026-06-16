import React, { Suspense, lazy, useState, useCallback } from 'react';
import { ViewType, Role, Operator } from './types';

import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import LoadingScreen from './components/shared/LoadingScreen';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { useNetworkStatus } from './hooks/useNetworkStatus';
const DashboardView = lazy(() => import('./components/DashboardView'));
const SIMsView = lazy(() => import('./components/SIMsView'));
const AgentsView = lazy(() => import('./components/AgentsView'));
const SellersView = lazy(() => import('./components/SellersView'));
const AlertsView = lazy(() => import('./components/AlertsView'));
const GeographicRiskView = lazy(() => import('./components/GeographicRiskView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AddAgentView = lazy(() => import('./components/AddAgentView'));
const AddSellerForm = lazy(() => import('./components/AddSellerForm'));
const ActivateSimForm = lazy(() => import('./components/ActivateSimForm'));

import { useAuth } from './hooks/useAuth';
import { useManagerState } from './hooks/useManagerState';
import { useAgentSellerState } from './hooks/useAgentSellerState';

const AgentDashboard = lazy(() => import('./components/AgentDashboard'));
const AgentProfileView = lazy(() => import('./components/agent/AgentProfileView'));
const SellerDashboard = lazy(() => import('./components/SellerDashboard'));
const BottomNav = lazy(() => import('./components/BottomNav'));

import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Check, Copy, X } from 'lucide-react';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const auth = useAuth();
  const mgr = useManagerState(auth.role);
  const agt = useAgentSellerState(auth.role, auth.username);

  const [dashboardSearch, setDashboardSearch] = useState('');
  const { role, username, darkMode, setDarkMode, isLoading, handleLogin, handleLogout, clearSession } = auth;
  const { setTokenWrapper } = auth;
  const isOnline = useNetworkStatus();

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  if (!role) {
    return <LoginScreen onLogin={handleLogin} darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  // ===== MANAGER VIEW =====
  if (role === 'manager') {
    const renderAdminView = () => {
      switch (mgr.currentView) {
        case 'dashboard':
          return <DashboardView stats={mgr.stats} alerts={mgr.alerts} transactions={mgr.transactions} sims={mgr.sims} setView={mgr.setView} onSearch={(q) => { setDashboardSearch(q); mgr.setView('sims'); }} onRefresh={mgr.refreshData} />;
        case 'sims':
          return <SIMsView sims={mgr.sims} onAddSIM={mgr.handleAddSIM} initialSearch={dashboardSearch} onUpdateSIM={mgr.handleUpdateSIM} />;
        case 'agents':
          return <AgentsView agents={mgr.agents} setView={mgr.setView} onUpdateAgent={mgr.handleUpdateAgent} />;
        case 'sellers':
          return <SellersView sellers={mgr.sellers} sims={mgr.sims} onUpdateSeller={mgr.handleUpdateSeller} onAddBalance={mgr.handleAddBalance} loading={mgr.loading} error={mgr.apiError} onRetry={mgr.refreshData} />;
        case 'alerts':
          return <AlertsView alerts={mgr.alerts} onResolveAlert={mgr.handleResolveAlert} settings={mgr.settings} onUpdateSettings={mgr.setSettings} />;
        case 'duplicate-identities':
          return <GeographicRiskView />;
        case 'reports':
          return <ReportsView />;
        case 'settings':
          return <SettingsView settings={mgr.settings} onUpdateSettings={mgr.setSettings} />;
        case 'add-agent':
          return <AddAgentView onAddAgent={mgr.handleAddAgent} setView={mgr.setView} />;
        default:
          return <DashboardView stats={mgr.stats} alerts={mgr.alerts} transactions={mgr.transactions} sims={mgr.sims} setView={mgr.setView} />;
      }
    };

    return (
      <div className="min-h-dvh bg-theme-background font-sans antialiased text-slate-100 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-center py-1.5 text-[11px] font-bold shadow-lg flex items-center justify-center gap-2" role="alert" aria-live="assertive">
            <span className="material-symbols-outlined text-xs">wifi_off</span>
            لا يوجد اتصال بالإنترنت
          </div>
        )}
        <TopBar currentView={mgr.currentView} setView={mgr.setView} onMenuToggle={() => {}} unresolvedAlertsCount={mgr.alerts.length} displayName={username} role={role} />
        <div className="flex pt-[calc(4rem+env(safe-area-inset-top))] min-h-dvh">
          <main className="flex-1 px-3 sm:px-4 md:px-8 py-4 md:py-8 lg:pt-10">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
              <ErrorBoundary>
                <Suspense fallback={<div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /></div>}>
                  {renderAdminView()}
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Toast notifications */}
        <div className="fixed top-20 left-4 z-40 w-full max-w-sm flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {(mgr.toasts ?? []).map((toast) => (
              <motion.div key={toast.id} initial={{ opacity: 0, x: -100, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -100, scale: 0.95 }} transition={{ duration: 0.3 }}
                className="bg-slate-900/95 backdrop-blur border border-red-500/30 text-slate-100 rounded-xl p-4 shadow-xl pointer-events-auto flex flex-col gap-2 text-right">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{toast.title}</span>
                  </div>
                  <button onClick={() => mgr.dismissToast(toast.id)} className="text-slate-500 hover:text-slate-100 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{toast.message}</p>
                <div className="flex justify-end gap-2 mt-1">
                  <button onClick={() => { mgr.setView('duplicate-identities'); }} className="py-1 px-3 bg-secondary hover:bg-red-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer">
                    شاشة مراقبة الهويات للتحقيق
                  </button>
                  <button onClick={() => mgr.dismissToast(toast.id)} className="py-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-[10px] rounded-lg transition-colors cursor-pointer">
                    تجاهل
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Suspense fallback={null}>
          <BottomNav currentView={mgr.currentView} setView={mgr.setView} unresolvedAlertsCount={(mgr.alerts ?? []).length} onLogout={handleLogout} />
        </Suspense>
      </div>
    );
  }

  // ===== AGENT / SELLER VIEW =====
  const renderRoleView = () => {
    if (role === 'agent') {
      const agentSellers = (agt.sellers ?? []).filter(s => s.agent_name === username);
      const sharedProps = {
        role: role as Role, activeTab: agt.activeTab, sellers: agentSellers, sims: agt.sims,
        inventories: agt.inventories,
        onAddSeller: () => agt.handleSetRoleTab('add_seller'),
        onActivateSim: () => agt.handleSetRoleTab('activate'),
        onTransferSims: agt.handleTransferSimsForAgent,
        onUpdateSellerStatus: agt.handleUpdateSellerStatusForAgent,
        onResetSellerPassword: agt.handleResetSellerPasswordForAgent,
        onEditSeller: agt.handleEditSellerForAgent,
        onDeleteSeller: agt.handleDeleteSellerForAgent,
        onUpdateInventories: agt.handleUpdateInventories,
        username, onLogout: () => {}, onConfirmLogout: handleLogout,
        darkMode, setDarkMode,
      };
      switch (agt.activeTab) {
        case 'home': case 'sellers': case 'my_sims':
          return <AgentDashboard {...sharedProps} />;
        case 'activate':
          return <ActivateSimForm onSimActivated={agt.handleSimActivationForSeller} />;
        case 'add_seller':
          return <AddSellerForm onSellerAdded={agt.handleAddSellerForAgent} agentName={username} />;
        case 'account':
          return <AgentProfileView username={username} role={role} sellersCount={agentSellers.length} inventories={agt.inventories} onLogout={() => {}} onConfirmLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} />;
        default:
          return null;
      }
    } else if (role === 'seller') {
      switch (agt.activeTab) {
        case 'home':
          return <SellerDashboard sellerData={agt.selfSellerData} sims={(agt.sims ?? []).filter(s => s.status === 'available')} operations={(agt.operations ?? [])} activeTab={agt.activeTab} setActiveTab={agt.handleSetRoleTab} onLogout={() => {}} onConfirmLogout={handleLogout} onPasswordChanged={() => {}} darkMode={darkMode} setDarkMode={setDarkMode} />;
        case 'activate':
          return <ActivateSimForm onSimActivated={agt.handleSimActivationForSeller} />;
        case 'my_sims':
          return <SellerDashboard sellerData={agt.selfSellerData} sims={(agt.sims ?? [])} operations={(agt.operations ?? [])} activeTab={agt.activeTab} setActiveTab={agt.handleSetRoleTab} onLogout={() => {}} onConfirmLogout={handleLogout} onPasswordChanged={() => {}} darkMode={darkMode} setDarkMode={setDarkMode} />;
        case 'account':
          return <SellerDashboard sellerData={agt.selfSellerData} sims={(agt.sims ?? [])} operations={(agt.operations ?? [])} activeTab={agt.activeTab} setActiveTab={agt.handleSetRoleTab} onLogout={() => {}} onConfirmLogout={handleLogout} onPasswordChanged={() => {}} darkMode={darkMode} setDarkMode={setDarkMode} />;
        default:
          return null;
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans bg-slate-950 text-slate-100">
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-center py-1.5 text-[11px] font-bold shadow-lg flex items-center justify-center gap-2" role="alert" aria-live="assertive">
          <span className="material-symbols-outlined text-xs">wifi_off</span>
          لا يوجد اتصال بالإنترنت
        </div>
      )}
      {isLoading && !role ? <LoadingScreen /> : (
      <>
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />
        <NavBar role={role} activeTab={agt.activeTab} setActiveTab={agt.handleSetRoleTab} username={username} onLogout={() => {}} />
        <main className="lg:pr-70 pt-6 pb-[4.5rem] px-3 sm:px-4 md:px-8 max-w-5xl mx-auto relative z-10 transition-all">
          <AnimatePresence mode="wait">
            <motion.div key={agt.activeTab + '_' + role} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
              <ErrorBoundary>
                <Suspense fallback={<div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /></div>}>
                  {renderRoleView()}
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Seller credentials modal */}
        <AnimatePresence>
          {agt.sellerCredentials && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => agt.setSellerCredentials(null)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 sm:relative sm:max-w-sm sm:mx-auto sm:my-auto sm:rounded-3xl card-enhanced rounded-t-3xl p-5 pb-8 max-h-[90dvh] overflow-y-auto">
                <div className="bottom-sheet-drag sm:hidden mx-auto mb-2" />
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                  <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2"><Check size={18} /> {agt.sellerCredentials.mode === 'reset' ? 'تم إعادة تعيين كلمة المرور' : 'تم إنشاء البائع بنجاح'}</h3>
                  <button onClick={() => agt.setSellerCredentials(null)} className="touch-target flex items-center justify-center p-2 text-slate-500 hover:text-slate-100 rounded-xl transition-colors cursor-pointer"><X size={18} /></button>
                </div>
                <p className="text-xs text-slate-400 mb-4">{agt.sellerCredentials.mode === 'reset' ? 'تم إعادة تعيين كلمة المرور للبائع' : 'تم إنشاء حساب البائع'} <strong className="text-slate-100">{agt.sellerCredentials.sellerName}</strong>. بيانات تسجيل الدخول:</p>
                <div className="space-y-3 mb-5">
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                    <span className="input-label">اسم المستخدم</span>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-slate-100 bg-slate-900 px-3 py-1.5 rounded-lg flex-1 text-left dir-ltr" dir="ltr">{agt.sellerCredentials.username}</code>
                      <button onClick={() => navigator.clipboard.writeText(agt.sellerCredentials!.username)} className="copy-btn" title="نسخ اسم المستخدم"><Copy size={14} /></button>
                    </div>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                    <span className="input-label">كلمة المرور</span>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-amber-400 bg-slate-900 px-3 py-1.5 rounded-lg flex-1 text-left dir-ltr" dir="ltr">{agt.sellerCredentials.password}</code>
                      <button onClick={() => navigator.clipboard.writeText(agt.sellerCredentials!.password)} className="copy-btn" title="نسخ كلمة المرور"><Copy size={14} /></button>
                    </div>
                  </div>
                </div>
                <button onClick={() => agt.setSellerCredentials(null)} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer min-h-[48px]">إغلاق</button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Logout modal */}
        <AnimatePresence>
          {false && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 z-50 sm:relative sm:max-w-sm sm:mx-auto sm:my-auto sm:rounded-3xl card-enhanced rounded-t-3xl p-5 pb-8">
              <button onClick={handleLogout} className="flex-1 py-3.5 bg-ym hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer text-center min-h-[48px]">تسجيل الخروج</button>
            </motion.div>
          )}
        </AnimatePresence>
      </>
      )}
    </div>
  );
}


