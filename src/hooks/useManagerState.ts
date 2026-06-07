import { useState, useEffect } from 'react';
import { SIM, Agent, Seller, SystemAlert, Transaction, SystemSettings, ViewType } from '../types';
import { INITIAL_SELLERS as ADMIN_SELLERS, INITIAL_AGENTS, INITIAL_SIMS as ADMIN_SIMS } from '../data';
import { api } from '../api/client';
import { captureError } from '../lib/monitor.ts';

function loadFromStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* ignore */ }
  }
  return fallback;
}

export function useManagerState(role: string | null) {
  const [sims, setSims] = useState<SIM[]>(() => loadFromStorage('admin_sims', ADMIN_SIMS as SIM[]));
  const [agents, setAgents] = useState<Agent[]>(() => loadFromStorage('admin_agents', INITIAL_AGENTS));
  const [sellers, setSellers] = useState<Seller[]>(() => loadFromStorage('admin_sellers', ADMIN_SELLERS));
  const [alerts, setAlerts] = useState<SystemAlert[]>(() => loadFromStorage('admin_alerts', []));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<any>({});
  const [settings, setSettings] = useState<SystemSettings>(() => loadFromStorage('admin_settings', null as any));
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    return (localStorage.getItem('tele_manager_view') as ViewType) || 'dashboard';
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; identityNo: string; duplicatesCount: number }>>([]);

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
    api.getSims().then(setSims).catch((err) => captureError(err, 'refresh:getSims')),
    api.getAgents().then(setAgents).catch((err) => captureError(err, 'refresh:getAgents')),
    api.getSellers().then(setSellers).catch((err) => captureError(err, 'refresh:getSellers')),
    api.getAlerts().then(setAlerts).catch((err) => captureError(err, 'refresh:getAlerts')),
    api.getSettings().then(setSettings).catch((err) => captureError(err, 'refresh:getSettings')),
    api.getTransactions().then(setTransactions).catch((err) => captureError(err, 'refresh:getTransactions')),
    api.getStats().then(setStats).catch((err) => captureError(err, 'refresh:getStats')),
  ]);

  useEffect(() => {
    if (role !== 'manager') return;
    setLoading(true);
    setApiError(null);
    refreshData()
      .then(() => setLoading(false))
      .catch(() => {
        setApiError('تعذر الاتصال بالخادم. يتم استخدام البيانات المحلية.');
        setLoading(false);
      });
  }, [role]);

  // Duplicate identity toasts
  useEffect(() => {
    if (role !== 'manager') return;
    const threshold = settings?.highRiskDuplicatesThreshold ?? 5;
    api.getDuplicateIdentities().then((identities: any[]) => {
      const critical = identities.filter((i: any) => i.duplicatesCount > threshold);
      setToasts(critical.map(item => ({
        id: `${item.idNo}-${threshold}`,
        title: '🚨 تنبيه: تسييل هوية مشبوهة',
        message: `تجاوزت الهوية رقم ${item.idNo} (${item.name}) عتبة الخطر (${threshold}) بـ ${item.duplicatesCount} مرات!`,
        identityNo: item.idNo,
        duplicatesCount: item.duplicatesCount
      })));
    }).catch((err) => { captureError(err, 'duplicate-identities'); setToasts([]); });
  }, [settings?.highRiskDuplicatesThreshold, role]);

  // Handlers
  const handleAddSIM = async (newSIM: Partial<SIM>) => {
    try {
      const created = await api.createSim(newSIM);
      setSims(prev => [created, ...prev]);
    } catch (err) {
      captureError(err, 'handleAddSIM');
      setSims(prev => [{
        id: String(Date.now()),
        phone: newSIM.phone || '',
        iccid: newSIM.iccid || '',
        provider: newSIM.provider || 'Yemen Mobile',
        status: newSIM.status || 'available',
        owner: newSIM.owner || 'المركز الرئيسي',
        dateAdded: newSIM.dateAdded || new Date().toLocaleDateString('ar-YE'),
        packageType: newSIM.packageType || 'باقة مزايا الشهرية'
      } as SIM, ...prev]);
    }
  };

  const handleAddAgent = async (newAgent: Partial<Agent>) => {
    try {
      const created = await api.createAgent(newAgent);
      setAgents(prev => [created, ...prev]);
    } catch (err) {
      captureError(err, 'handleAddAgent');
      setAgents(prev => [{
        id: String(Date.now()),
        name: newAgent.name || '',
        region: newAgent.region || '',
        phone: newAgent.phone || '',
        sellersCount: newAgent.sellersCount || 0,
        simsCount: newAgent.simsCount || 0,
        status: newAgent.status || 'active'
      }, ...prev]);
    }
  };

  const handleUpdateAgent = (id: string, fields: Partial<Agent>) => {
    api.updateAgent(Number(id), fields).then(() => {
      setAgents(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));
    }).catch((err) => captureError(err, 'handleUpdateAgent'));
  };

  const handleUpdateSeller = (id: string, fields: Partial<Seller>) => {
    api.updateSeller(Number(id), fields).then(() => {
      setSellers(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
    }).catch((err) => captureError(err, 'handleUpdateSeller'));
  };

  const handleAddBalance = (sellerId: string, amount: number) => {
    api.updateSellerBalance(Number(sellerId), amount).then(() => {
      setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, sales30Days: s.sales30Days + amount } : s));
    }).catch((err) => captureError(err, 'handleAddBalance'));
  };

  const handleResolveAlert = (id: string) => {
    api.resolveAlert(Number(id)).then(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }).catch((err) => captureError(err, 'handleResolveAlert'));
  };

  return {
    sims, agents, sellers, alerts, transactions, stats, settings, currentView,
    loading, apiError, toasts,
    setView, setSettings, setSims,
    handleAddSIM, handleAddAgent, handleUpdateAgent,
    handleUpdateSeller, handleAddBalance, handleResolveAlert,
  };
}
