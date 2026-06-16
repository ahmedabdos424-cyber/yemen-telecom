import { useState, useEffect } from 'react';
import { SIM, Agent, Seller, SystemAlert, Transaction, SystemSettings, ViewType } from '../types';
import { api } from '../api/client';
import { captureError } from '../lib/monitor.ts';
import { useMountedRef } from './useMountedRef';

function loadFromStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* ignore */ }
  }
  return fallback;
}

const DEFAULT_SETTINGS: SystemSettings = {
  twoFAEnabled: false,
  email2FAEnabled: false,
  trustedDevicesEnabled: false,
  sessionTimeout: '15',
  passwordSpecialRequired: true,
  passwordExpiry90Days: false,
  passwordNoReuse5: true,
  maintenanceMode: false,
  language: 'ar',
  emailAlertsEnabled: true,
  smsAlertsEnabled: true,
  appNotificationsEnabled: true,
  stockShortageThreshold: 10,
  inactiveSimsThreshold: 30,
  maxFailedLoginsThreshold: 5,
  highRiskDuplicatesThreshold: 5,
  identityRemindersEnabled: true,
  identityRemindersFrequency: 'weekly',
};

export function useManagerState(role: string | null) {
  const mountedRef = useMountedRef();
  const [sims, setSims] = useState<SIM[]>(() => loadFromStorage('admin_sims', []));
  const [agents, setAgents] = useState<Agent[]>(() => loadFromStorage('admin_agents', []));
  const [sellers, setSellers] = useState<Seller[]>(() => loadFromStorage('admin_sellers', []));
  const [alerts, setAlerts] = useState<SystemAlert[]>(() => loadFromStorage('admin_alerts', []));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<any>({});
  const [settings, setSettings] = useState<SystemSettings>(() => loadFromStorage('admin_settings', DEFAULT_SETTINGS));
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    return (localStorage.getItem('tele_manager_view') as ViewType) || 'dashboard';
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; identityNo: string; duplicatesCount: number }>>([]);
  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // Persist
  useEffect(() => { localStorage.setItem('admin_sims', JSON.stringify(sims)); }, [sims]);
  useEffect(() => { localStorage.setItem('admin_agents', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem('admin_sellers', JSON.stringify(sellers)); }, [sellers]);
  useEffect(() => { localStorage.setItem('admin_alerts', JSON.stringify(alerts)); }, [alerts]);
  useEffect(() => { localStorage.setItem('admin_settings', JSON.stringify(settings)); }, [settings]);

  const setView = (view: ViewType) => {
    setCurrentView(view);
    localStorage.setItem('tele_manager_view', view);
  };

  const refreshData = () => Promise.all([
    api.getSims().then(data => { if (mountedRef.current) setSims(data ?? []); }).catch((err) => captureError(err, 'refresh:getSims')),
    api.getAgents().then(data => { if (mountedRef.current) setAgents(data ?? []); }).catch((err) => captureError(err, 'refresh:getAgents')),
    api.getSellers().then(data => { if (mountedRef.current) setSellers(data ?? []); }).catch((err) => captureError(err, 'refresh:getSellers')),
    api.getAlerts().then(data => { if (mountedRef.current) setAlerts(data ?? []); }).catch((err) => captureError(err, 'refresh:getAlerts')),
    api.getSettings().then(data => { if (mountedRef.current) setSettings(data ?? {}); }).catch((err) => captureError(err, 'refresh:getSettings')),
    api.getTransactions().then(data => { if (mountedRef.current) setTransactions(data ?? []); }).catch((err) => captureError(err, 'refresh:getTransactions')),
    api.getStats().then(data => { if (mountedRef.current) setStats(data ?? {}); }).catch((err) => captureError(err, 'refresh:getStats')),
  ]);

  useEffect(() => {
    if (role !== 'manager') return;
    setLoading(true);
    setApiError(null);
    refreshData()
      .then(() => { if (mountedRef.current) setLoading(false); })
      .catch(() => {
        if (mountedRef.current) {
          setApiError('تعذر الاتصال بالخادم. يتم استخدام البيانات المحلية.');
          setLoading(false);
        }
      });
  }, [role]);

  // Duplicate identity toasts
  useEffect(() => {
    if (role !== 'manager') return;
    const threshold = settings?.highRiskDuplicatesThreshold ?? 5;
    api.getDuplicateIdentities().then((identities: any[]) => {
      if (!mountedRef.current) return;
      const list = Array.isArray(identities) ? identities : [];
      const critical = list.filter((i: any) => i.duplicatesCount > threshold);
      setToasts(critical.map(item => ({
        id: `${item.idNo}-${threshold}`,
        title: '🚨 تنبيه: تسييل هوية مشبوهة',
        message: `تجاوزت الهوية رقم ${item.idNo} (${item.name}) عتبة الخطر (${threshold}) بـ ${item.duplicatesCount} مرات!`,
        identityNo: item.idNo,
        duplicatesCount: item.duplicatesCount
      })));
    }).catch((err) => { captureError(err, 'duplicate-identities'); if (mountedRef.current) setToasts([]); });
  }, [settings?.highRiskDuplicatesThreshold, role]);

  // Handlers
  const handleAddSIM = async (newSIM: Partial<SIM>) => {
    try {
      const created = await api.createSim(newSIM);
      if (mountedRef.current) setSims(prev => [created, ...prev]);
    } catch (err) {
      captureError(err, 'handleAddSIM');
    }
  };

  const handleAddAgent = async (newAgent: Partial<Agent>) => {
    try {
      const created = await api.createAgent(newAgent);
      if (mountedRef.current) setAgents(prev => [created, ...prev]);
    } catch (err) {
      captureError(err, 'handleAddAgent');
    }
  };

  const handleUpdateAgent = (id: string, fields: Partial<Agent>) => {
    api.updateAgent(Number(id), fields).then(() => {
      if (mountedRef.current) setAgents(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));
    }).catch((err) => captureError(err, 'handleUpdateAgent'));
  };

  const handleUpdateSeller = (id: string, fields: Partial<Seller>) => {
    api.updateSeller(Number(id), fields).then(() => {
      if (mountedRef.current) setSellers(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
    }).catch((err) => captureError(err, 'handleUpdateSeller'));
  };

  const handleAddBalance = (sellerId: string, amount: number) => {
    api.updateSellerBalance(Number(sellerId), amount).then(() => {
      if (mountedRef.current) setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, sales30Days: s.sales30Days + amount } : s));
    }).catch((err) => captureError(err, 'handleAddBalance'));
  };

  const handleResolveAlert = (id: string) => {
    api.resolveAlert(Number(id)).then(() => {
      if (mountedRef.current) setAlerts(prev => prev.filter(a => a.id !== id));
    }).catch((err) => captureError(err, 'handleResolveAlert'));
  };

  const handleUpdateSIM = (id: string, fields: Partial<SIM>) => {
    api.updateSim(Number(id), fields).then(() => {
      if (mountedRef.current) setSims(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
    }).catch((err) => captureError(err, 'handleUpdateSIM'));
  };

  return {
    sims, agents, sellers, alerts, transactions, stats, settings, currentView,
    loading, apiError, toasts,
    setView, setSettings, setSims, dismissToast,
    handleAddSIM, handleAddAgent, handleUpdateAgent,
    handleUpdateSeller, handleAddBalance, handleResolveAlert,
    handleUpdateSIM, refreshData,
  };
}
