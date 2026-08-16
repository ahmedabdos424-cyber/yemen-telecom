import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ViewType, Role, Sim } from './types';

import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import LoadingScreen from './components/shared/LoadingScreen';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useToast, ToastContainer } from './hooks/useToast';
import { SESSION_EXPIRED_EVENT, ensureServerIsAwake } from './api/client';
import { initPushNotifications, removePushListeners } from './services/pushNotifications';
import { connectRealtime, disconnectRealtime, onRealtimeEvent } from './services/realtime';
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
const SystemHealthMonitor = lazy(() => import('./components/SystemHealthMonitor'));

import { useAuth } from './hooks/useAuth';
import { useManagerState } from './hooks/useManagerState';
import { useAgentSellerState } from './hooks/useAgentSellerState';
import { CameraProvider } from './context/CameraContext';


const AgentDashboard = lazy(() => import('./components/AgentDashboard'));
const AgentProfileView = lazy(() => import('./components/agent/AgentProfileView'));
const SellerDashboard = lazy(() => import('./components/SellerDashboard'));
const BottomNav = lazy(() => import('./components/BottomNav'));

import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Fingerprint, X } from 'lucide-react';

function AuthenticatedApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const mgr = useManagerState(auth.role);
  const agt = useAgentSellerState(auth.role, auth.username);

  const [dashboardSearch, setDashboardSearch] = useState('');
  const { role, username, darkMode, setDarkMode, isLoading, handleLogin, handleLogout, clearSession, biometricAvailable, biometricEnrolled, biometricEnabled, enableBiometricLogin, disableBiometricLogin, showBiometricPrompt, dismissBiometricPrompt } = auth;
  const isOnline = useNetworkStatus();
  const { toasts, dismissToast, toastWarning, toastInfo } = useToast();
  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);
  const mgrRef = useRef(mgr);
  useEffect(() => { mgrRef.current = mgr; });
  const agtRef = useRef(agt);
  useEffect(() => { agtRef.current = agt; });

  // Register this device for FCM push notifications once a user is logged in.
  // Foreground messages are surfaced as in-app toasts; background messages are
  // handled by the OS/service worker.
  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    initPushNotifications((payload) => {
      if (cancelled) return;
      if (payload.title || payload.body) {
        toastInfo(payload.title || 'إشعار جديد', payload.body);
      }
    }).then((ok) => {
      if (ok) toastInfo('الإشعارات مفعلة', 'ستصلك تنبيهات النظام المهمة فورياً');
    }).catch(() => {});
    return () => {
      cancelled = true;
      void removePushListeners();
    };
  }, [role, toastInfo]);

  // Realtime live updates: keep the WebSocket connected while logged in and
  // refresh role-scoped data whenever a remote change arrives (SIM activation
  // on another device, distribution approval, inventory edits…). New alerts
  // are surfaced immediately as in-app toasts.
  useEffect(() => {
    if (!role) return;
    connectRealtime();
    const unsub = onRealtimeEvent((event) => {
      const isSimChange = event.type.startsWith('sim.');
      const isSellerChange = event.type.startsWith('seller.');
      const isInventoryChange = event.type === 'inventory.updated';
      const isDistributionChange = event.type.startsWith('distribution.');
      const isAlertCreated = event.type === 'alert.created';
      const mgrState = mgrRef.current;
      const agtState = agtRef.current;
      if (role === 'manager') {
        if (isSimChange || isSellerChange || isInventoryChange || isDistributionChange || isAlertCreated) {
          mgrState.refreshData().catch(() => {});
        }
      } else {
        if (isSimChange || isSellerChange || isInventoryChange || isDistributionChange) {
          agtState.refreshRoleData().catch(() => {});
        }
      }
      if (isAlertCreated) {
        toastInfo(String(event.title ?? 'تنبيه جديد'), String(event.description ?? ''));
      }
    });
    return () => {
      unsub();
      disconnectRealtime();
    };
  }, [role, toastInfo]);

  useEffect(() => {
    const onSessionExpired = () => {
      if (!roleRef.current) return;
      toastWarning('انتهت الجلسة', 'تم تسجيل الخروج لانتهاء الجلسة أو دخول الحساب من جهاز آخر');
      clearSession();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [clearSession, toastWarning]);

  useEffect(() => {
    if (!role) return;
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      const defaultPath = role === 'manager' ? '/manager/dashboard' : role === 'agent' ? '/agent/home' : '/seller/home';
      navigate(defaultPath, { replace: true });
      return;
    }
    const viewFromUrl = pathParts[1].replace(/-/g, '_');
    if (role === 'manager') {
      const validViews: string[] = ['dashboard', 'sims', 'agents', 'sellers', 'alerts', 'duplicate-identities', 'duplicate_identities', 'reports', 'settings', 'add-agent', 'activate'];
      if (validViews.includes(viewFromUrl) && viewFromUrl !== mgr.currentView) {
        mgr.setView(viewFromUrl as ViewType);
      }
    } else if (role === 'agent' || role === 'seller') {
      const validTabs = role === 'agent'
        ? ['home', 'activate', 'add_seller', 'sellers', 'my_sims', 'account']
        : ['home', 'activate', 'my_sims', 'account'];
      if (validTabs.includes(viewFromUrl) && viewFromUrl !== agt.activeTab) {
        agt.handleSetRoleTab(viewFromUrl);
      }
    }
  }, [location.pathname]);

  if (!role) {
    return (
      <>
        <ErrorBoundary>
          <LoginScreen onLogin={handleLogin} onBiometricLogin={auth.handleBiometricLogin} biometricEnabled={auth.biometricEnabled} darkMode={darkMode} setDarkMode={setDarkMode} />
        </ErrorBoundary>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const SharedOfflineBanner = () => {
    const pendingTotal = (agt.offlinePending ?? 0) + (mgr.offlinePending ?? 0);
    return !isOnline ? (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-center py-1.5 text-[11px] font-bold shadow-lg flex items-center justify-center gap-2" role="alert" aria-live="assertive">
        <span className="material-symbols-outlined text-xs">wifi_off</span>
        لا يوجد اتصال بالإنترنت
        {pendingTotal > 0 ? (
          <span className="bg-white/20 rounded-full px-2 py-0.5">
            {pendingTotal} عملية بانتظار المزامنة
          </span>
        ) : null}
      </div>
    ) : (
      pendingTotal > 0 ? (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-center py-1.5 text-[11px] font-bold shadow-lg flex items-center justify-center gap-2" role="status" aria-live="polite">
          <span className="material-symbols-outlined text-xs">sync</span>
          {pendingTotal} عملية تنتظر المزامنة عند عودة الاتصال
        </div>
      ) : null
    );
  };

  const ToastNotifications = () => (
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
              <button onClick={() => mgr.dismissToast(toast.id)} className="text-slate-500 hover:text-slate-100 transition-colors cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{toast.message}</p>
            <div className="flex justify-end gap-2 mt-1">
              <button onClick={() => { navigate('/manager/duplicate-identities'); }} className="py-1 px-3 bg-secondary hover:bg-red-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer">
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
  );

  if (role === 'manager') {
    return (
      <div className="min-h-dvh bg-theme-background font-sans antialiased text-slate-100">
        <SharedOfflineBanner />
        <TopBar currentView={mgr.currentView} setView={(v) => { mgr.setView(v); navigate(`/manager/${v}`); }} unresolvedAlertsCount={mgr.alerts.length} alerts={mgr.alerts} displayName={username} role={role} onLogout={handleLogout} />
        <div className="flex pt-[calc(4rem+env(safe-area-inset-top))] min-h-dvh overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">
          <main className="flex-1 px-3 sm:px-4 md:px-8 py-4 md:py-8 lg:pt-10">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
              <ErrorBoundary>
                <Suspense fallback={<div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /></div>}>
                  <Routes>
                    <Route path="/manager/dashboard" element={<>
                      <SystemHealthMonitor role={role} />
                      <DashboardView stats={mgr.stats} alerts={mgr.alerts} transactions={mgr.transactions} sims={mgr.sims} setView={(v) => { mgr.setView(v); navigate(`/manager/${v}`); }} onSearch={(q) => { setDashboardSearch(q); navigate('/manager/sims'); }} onRefresh={mgr.refreshData} />
                    </>} />
                    <Route path="/manager/sims" element={<SIMsView sims={mgr.sims} onAddSIM={mgr.handleAddSIM} initialSearch={dashboardSearch} onUpdateSIM={mgr.handleUpdateSIM} onAddSimBatch={mgr.handleAddSimBatch} agents={mgr.agents} sellers={mgr.sellers} />} />
                    <Route path="/manager/agents" element={<AgentsView agents={mgr.agents} setView={(v) => { mgr.setView(v); navigate(`/manager/${v}`); }} onUpdateAgent={mgr.handleUpdateAgent} />} />
                    <Route path="/manager/sellers" element={<SellersView sellers={mgr.sellers} sims={mgr.sims} onUpdateSeller={mgr.handleUpdateSeller} onAddBalance={mgr.handleAddBalance} loading={mgr.loading} error={mgr.apiError} onRetry={mgr.refreshData} />} />
                    <Route path="/manager/alerts" element={<AlertsView alerts={mgr.alerts} onResolveAlert={mgr.handleResolveAlert} settings={mgr.settings} onUpdateSettings={mgr.handleUpdateSettings} />} />
                    <Route path="/manager/duplicate-identities" element={<GeographicRiskView />} />
                    <Route path="/manager/reports" element={<ReportsView />} />
                    <Route path="/manager/activate" element={<ActivateSimForm onSimActivated={agt.handleSimActivationForSeller} />} />
                    <Route path="/manager/settings" element={<SettingsView settings={mgr.settings} onUpdateSettings={mgr.handleUpdateSettings} biometricAvailable={biometricAvailable} biometricEnrolled={biometricEnrolled} biometricEnabled={biometricEnabled} onEnableBiometric={() => enableBiometricLogin(username)} onDisableBiometric={disableBiometricLogin} />} />
                    <Route path="/manager/add-agent" element={<AddAgentView onAddAgent={mgr.handleAddAgent} setView={(v) => { mgr.setView(v); navigate(`/manager/${v}`); }} />} />
                    <Route path="*" element={<Navigate to="/manager/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>
        <ToastNotifications />
        <Suspense fallback={null}>
          <BottomNav currentView={mgr.currentView} setView={(v) => { mgr.setView(v); navigate(`/manager/${v}`); }} unresolvedAlertsCount={(mgr.alerts ?? []).length} onLogout={handleLogout} />
        </Suspense>
      </div>
    );
  }

  const renderRoleView = () => {
    if (role === 'agent') {
      const agentSellers = (agt.sellers ?? []).filter(s => s.agent_name === username);
      const sharedProps = {
        role: role as Role, activeTab: agt.activeTab, sellers: agentSellers, sims: agt.sims,
        inventories: agt.inventories,
        onAddSeller: () => navigate('/agent/add-seller'),
        onActivateSim: () => navigate('/agent/activate'),
        onTransferSims: agt.handleTransferSimsForAgent,
        onUpdateSellerStatus: agt.handleUpdateSellerStatusForAgent,
        onResetSellerPassword: agt.handleResetSellerPasswordForAgent,
        onEditSeller: agt.handleEditSellerForAgent,
        onDeleteSeller: agt.handleDeleteSellerForAgent,
        onUpdateInventories: agt.handleUpdateInventories,
        operations: agt.operations,
        username, onLogout: handleLogout, onConfirmLogout: handleLogout,
        darkMode, setDarkMode,
      };
      return (
        <Routes>
          <Route path="/agent/home" element={<AgentDashboard {...sharedProps} />} />
          <Route path="/agent/sellers" element={<AgentDashboard {...sharedProps} />} />
          <Route path="/agent/my-sims" element={<AgentDashboard {...sharedProps} />} />
          <Route path="/agent/activate" element={<ActivateSimForm onSimActivated={agt.handleSimActivationForSeller} />} />
          <Route path="/agent/add-seller" element={<AddSellerForm onSellerAdded={agt.handleAddSellerForAgent} agentName={username} />} />
          <Route path="/agent/account" element={<AgentProfileView username={username} role={role} sellersCount={agentSellers.length} inventories={agt.inventories} onLogout={handleLogout} onConfirmLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} biometricAvailable={biometricAvailable} biometricEnabled={biometricEnabled} onEnableBiometric={() => enableBiometricLogin(username)} onDisableBiometric={disableBiometricLogin} />} />
          <Route path="*" element={<Navigate to="/agent/home" replace />} />
        </Routes>
      );
    } else if (role === 'seller') {
      const sellerOnUpdateSims = (updated: Sim[]) => agt.handleUpdateSimsForSeller(updated);
      return (
        <Routes>
          <Route path="/seller/home" element={<SellerDashboard sellerData={agt.selfSellerData} sims={(agt.sims ?? []).filter(s => s.status === 'available')} operations={(agt.operations ?? [])} activeTab={agt.activeTab} setActiveTab={agt.handleSetRoleTab} onLogout={handleLogout} onConfirmLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} onUpdateSims={sellerOnUpdateSims} biometricAvailable={biometricAvailable} biometricEnabled={biometricEnabled} onEnableBiometric={() => enableBiometricLogin(username)} onDisableBiometric={disableBiometricLogin} />} />
          <Route path="/seller/activate" element={<ActivateSimForm onSimActivated={agt.handleSimActivationForSeller} />} />
          <Route path="/seller/my-sims" element={<SellerDashboard sellerData={agt.selfSellerData} sims={(agt.sims ?? [])} operations={(agt.operations ?? [])} activeTab={agt.activeTab} setActiveTab={agt.handleSetRoleTab} onLogout={handleLogout} onConfirmLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} onUpdateSims={sellerOnUpdateSims} biometricAvailable={biometricAvailable} biometricEnabled={biometricEnabled} onEnableBiometric={() => enableBiometricLogin(username)} onDisableBiometric={disableBiometricLogin} />} />
          <Route path="/seller/account" element={<SellerDashboard sellerData={agt.selfSellerData} sims={(agt.sims ?? [])} operations={(agt.operations ?? [])} activeTab={agt.activeTab} setActiveTab={agt.handleSetRoleTab} onLogout={handleLogout} onConfirmLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} onUpdateSims={sellerOnUpdateSims} biometricAvailable={biometricAvailable} biometricEnabled={biometricEnabled} onEnableBiometric={() => enableBiometricLogin(username)} onDisableBiometric={disableBiometricLogin} />} />
          <Route path="*" element={<Navigate to="/seller/home" replace />} />
        </Routes>
      );
    }
    return null;
  };

  return (
    <div className="min-h-dvh transition-colors duration-300 font-sans bg-slate-950 text-slate-100">
      <SharedOfflineBanner />
      {isLoading && !role ? <LoadingScreen /> : (
      <>
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />
        <NavBar role={role} activeTab={agt.activeTab} setActiveTab={(tab) => { agt.handleSetRoleTab(tab); navigate(`/${role}/${tab.replace(/_/g, '-')}`); }} username={username} onLogout={handleLogout} />
        <main className="lg:pr-70 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] px-3 sm:px-4 md:px-8 max-w-5xl mx-auto relative z-10 transition-all overflow-y-auto">
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
                      <code className="text-sm font-mono text-amber-400 bg-slate-950 px-3 py-1.5 rounded-lg flex-1 text-left dir-ltr" dir="ltr">{agt.sellerCredentials.password}</code>
                      <button onClick={() => navigator.clipboard.writeText(agt.sellerCredentials!.password)} className="copy-btn" title="نسخ كلمة المرور"><Copy size={14} /></button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(
                    `حساب البائع: ${agt.sellerCredentials!.sellerName}\nاسم المستخدم: ${agt.sellerCredentials!.username}\nكلمة المرور: ${agt.sellerCredentials!.password}`
                  )}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer min-h-[48px] flex items-center justify-center gap-2 mb-2"
                >
                  <Copy size={16} /> نسخ جميع بيانات الدخول
                </button>
                <button onClick={() => agt.setSellerCredentials(null)} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer min-h-[48px]">إغلاق</button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBiometricPrompt && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={dismissBiometricPrompt} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 sm:relative sm:max-w-sm sm:mx-auto sm:my-auto sm:rounded-3xl card-enhanced rounded-t-3xl p-5 pb-8 max-h-[90dvh] overflow-y-auto">
                <div className="bottom-sheet-drag sm:hidden mx-auto mb-2" />
                <div className="flex flex-col items-center text-center pt-2 pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-4">
                    <Fingerprint size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">تفعيل الدخول بالبصمة</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2 max-w-[280px]">
                    هل تريد تفعيل تسجيل الدخول السريع باستخدام البصمة للمرات القادمة؟
                  </p>
                </div>
                <div className="space-y-2.5">
                  <button
                    onClick={async () => {
                      try {
                        const ok = await enableBiometricLogin(username);
                        if (ok) dismissBiometricPrompt();
                      } catch (err) {
                        toastWarning(err instanceof Error && err.message ? err.message : 'لم يتم التفعيل. تحقق من توفر مستشعر بصمة أو أعد المحاولة');
                      }
                    }}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer min-h-[48px] flex items-center justify-center gap-2"
                  >
                    <Fingerprint size={17} />
                    تفعيل الدخول بالبصمة
                  </button>
                  <button
                    onClick={dismissBiometricPrompt}
                    className="w-full py-3.5 bg-slate-800/70 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer min-h-[48px]"
                  >
                    ليس الآن
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
      )}
    </div>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [serverAwake, setServerAwake] = useState(false);

  useEffect(() => {
    // Blocking boot: wait until the Render free-tier service is awake (it
    // sleeps after ~15 minutes of idle and its cold start can exceed normal
    // request timeouts). The UI stays on a loading screen while we retry
    // /api/health with exponential backoff, so the first login request is
    // never the one that pays the cold-start cost.
    ensureServerIsAwake().finally(() => setServerAwake(true));
  }, []);

  if (!splashDone) {
    return (
      <ErrorBoundary>
        <SplashScreen onFinish={() => setSplashDone(true)} />
      </ErrorBoundary>
    );
  }

  if (!serverAwake) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 bg-theme-background font-sans text-slate-100 px-8" role="status" aria-live="polite">
        <div className="w-11 h-11 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-300 text-center leading-relaxed">
          الرجاء الانتظار قليلاً... يتم الآن تجهيز النظام للعمل...
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CameraProvider>
        <AuthenticatedApp />
      </CameraProvider>
    </ErrorBoundary>
  );
}