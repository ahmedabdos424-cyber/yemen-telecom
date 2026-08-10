import { useState, useEffect, useCallback } from 'react';
import { SIM, Agent, Seller, SystemAlert, Transaction, SystemSettings, ViewType } from '../types';
import { api } from '../api/client';
import type { CreateSimBatchRequest, SimBatchResult } from '../api/types';
import { captureError } from '../lib/monitor.ts';
import { useMountedRef } from './useMountedRef';
import {
  enqueueOffline, getNetworkStatus, getQueueStats, onNetworkChange, onQueueChanged,
  registerSyncHandlers, syncNow, OfflineQueueItem,
} from '../services/offlineQueue';

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return m.includes('failed to fetch') || m.includes('network request failed') || m.includes('networkerror') || m.includes('load failed');
  }
  return false;
}

interface QueuedSimWrite {
  batch?: boolean;
  payload?: CreateSimBatchRequest;
  sim?: Partial<SIM>;
  id?: number;
  fields?: Partial<SIM>;
}

async function syncManagerSimItem(item: OfflineQueueItem): Promise<void> {
  const q = item.payload as QueuedSimWrite;
  if (item.kind === 'createSim') {
    if (q.batch && q.payload) {
      await api.createSimBatch(q.payload);
    } else if (q.sim) {
      await api.createSim(q.sim as any);
    }
  } else if (item.kind === 'updateSim' && q.id != null && q.fields) {
    await api.updateSim(q.id, q.fields);
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* ignore */ }
  }
  return fallback;
}

const DEFAULT_SETTINGS: SystemSettings = {
  twoFAEnabled: true,
  email2FAEnabled: false,
  trustedDevicesEnabled: true,
  sessionTimeout: '30 دقيقة',
  passwordSpecialRequired: true,
  passwordExpiry90Days: true,
  passwordNoReuse5: false,
  maintenanceMode: false,
  language: 'العربية (المملكة العربية السعودية)',
  emailAlertsEnabled: true,
  smsAlertsEnabled: true,
  appNotificationsEnabled: false,
  stockShortageThreshold: 5,
  inactiveSimsThreshold: 90,
  maxFailedLoginsThreshold: 3,
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
  const [offlinePending, setOfflinePending] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Offline queue: register the manager's SIM write handlers (createSim /
  // updateSim — batch or single) and flush queued writes once connectivity
  // returns. Merged so the agent/seller activation handler stays registered.
  useEffect(() => {
    registerSyncHandlers({ createSim: syncManagerSimItem, updateSim: syncManagerSimItem }, true);
    const refreshStats = async () => {
      const stats = await getQueueStats();
      if (!mountedRef.current) return;
      setOfflinePending(stats.pending + stats.failed);
      setIsOnline(stats.online);
    };
    refreshStats();
    const offQueue = onQueueChanged(refreshStats);
    const offNet = onNetworkChange((online) => {
      if (!mountedRef.current) return;
      setIsOnline(online);
      if (online) {
        syncNow().catch(err => captureError(err, 'syncNowOnReconnect'));
      }
    });
    return () => {
      offQueue();
      offNet();
    };
  }, [mountedRef]);

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

  const refreshData = useCallback(() => Promise.all([
    api.getSims().then((data: any) => { if (mountedRef.current) setSims(data ?? []); }).catch((err) => captureError(err, 'refresh:getSims')),
    api.getAgents().then((data: any) => { if (mountedRef.current) setAgents(data ?? []); }).catch((err) => captureError(err, 'refresh:getAgents')),
    api.getSellers().then((data: any) => { if (mountedRef.current) setSellers(data ?? []); }).catch((err) => captureError(err, 'refresh:getSellers')),
    api.getAlerts().then((data: any) => { if (mountedRef.current) setAlerts(data ?? []); }).catch((err) => captureError(err, 'refresh:getAlerts')),
    api.getSettings().then((data: any) => { if (mountedRef.current) setSettings(data ?? {}); }).catch((err) => captureError(err, 'refresh:getSettings')),
    api.getTransactions().then((data: any) => { if (mountedRef.current) setTransactions(data ?? []); }).catch((err) => captureError(err, 'refresh:getTransactions')),
    api.getStats().then((data: any) => { if (mountedRef.current) setStats(data ?? {}); }).catch((err) => captureError(err, 'refresh:getStats')),
  ]), [mountedRef]);

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
  }, [role, refreshData]);

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
    if (!(await getNetworkStatus())) {
      try {
        await enqueueOffline('createSim', { sim: newSIM } satisfies QueuedSimWrite);
      } catch (qe) {
        captureError(qe, 'enqueueCreateSimOffline');
      }
      if (mountedRef.current) setSims(prev => [newSIM as SIM, ...prev]);
      return;
    }
    try {
      const created: any = await api.createSim(newSIM as any);
      if (mountedRef.current) setSims(prev => [created, ...prev]);
    } catch (err) {
      if (isNetworkError(err)) {
        try {
          await enqueueOffline('createSim', { sim: newSIM } satisfies QueuedSimWrite);
        } catch (qe) {
          captureError(qe, 'enqueueCreateSimOffline');
        }
        if (mountedRef.current) setSims(prev => [newSIM as SIM, ...prev]);
      } else {
        captureError(err, 'handleAddSIM');
      }
    }
  };

  const handleAddSimBatch = async (payload: CreateSimBatchRequest): Promise<SimBatchResult | void> => {
    if (!(await getNetworkStatus())) {
      try {
        await enqueueOffline('createSim', { batch: true, payload } satisfies QueuedSimWrite);
      } catch (qe) {
        captureError(qe, 'enqueueBatchOffline');
      }
      return;
    }
    try {
      const created: any = await api.createSimBatch(payload);
      if (mountedRef.current) {
        api.getSims()
          .then((data: any) => { if (mountedRef.current) setSims(data ?? []); })
          .catch((err) => captureError(err, 'handleAddSimBatch:refresh'));
        // Realtime stock: the batch may have been assigned to an agent/seller,
        // so their counters must reflect the new allocation immediately.
        if (payload.owner_role && payload.owner_role !== 'admin') {
          api.getAgents()
            .then((data: any) => { if (mountedRef.current) setAgents(data ?? []); })
            .catch((err) => captureError(err, 'handleAddSimBatch:refreshAgents'));
          api.getSellers()
            .then((data: any) => { if (mountedRef.current) setSellers(data ?? []); })
            .catch((err) => captureError(err, 'handleAddSimBatch:refreshSellers'));
        }
      }
      return created;
    } catch (err) {
      if (isNetworkError(err)) {
        try {
          await enqueueOffline('createSim', { batch: true, payload } satisfies QueuedSimWrite);
        } catch (qe) {
          captureError(qe, 'enqueueBatchOffline');
        }
        return;
      }
      throw err;
    }
  };

  const handleAddAgent = async (newAgent: Partial<Agent> & { username?: string; password?: string }) => {
    try {
      const created: any = await api.createAgent({
        name: newAgent.name ?? '',
        full_name: newAgent.fullName,
        region: newAgent.region,
        phone: newAgent.phone,
        sellers_count: newAgent.sellersCount,
        sims_count: newAgent.simsCount,
        status: newAgent.status,
        username: newAgent.username,
        password: newAgent.password,
      });
      if (mountedRef.current) setAgents(prev => [created?.agent ?? created, ...prev]);
      return created;
    } catch (err) {
      captureError(err, 'handleAddAgent');
      throw err;
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

  const handleAddBalance = (sellerId: string, amount: number, invoiceImage?: string) => {
    api.updateSellerBalance(Number(sellerId), amount, invoiceImage).then(() => {
      if (mountedRef.current) setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, sales30Days: s.sales30Days + amount } : s));
    }).catch((err) => captureError(err, 'handleAddBalance'));
  };

  const handleResolveAlert = (id: string) => {
    api.resolveAlert(Number(id)).then(() => {
      if (mountedRef.current) setAlerts(prev => prev.filter(a => a.id !== id));
    }).catch((err) => captureError(err, 'handleResolveAlert'));
  };

  const handleUpdateSIM = async (id: string, fields: Partial<SIM>) => {
    if (!(await getNetworkStatus())) {
      try {
        await enqueueOffline('updateSim', { id: Number(id), fields } satisfies QueuedSimWrite);
      } catch (qe) {
        captureError(qe, 'enqueueUpdateSimOffline');
      }
      if (mountedRef.current) setSims(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
      return;
    }
    try {
      await api.updateSim(Number(id), fields);
      if (mountedRef.current) setSims(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
    } catch (err) {
      if (isNetworkError(err)) {
        try {
          await enqueueOffline('updateSim', { id: Number(id), fields } satisfies QueuedSimWrite);
        } catch (qe) {
          captureError(qe, 'enqueueUpdateSimOffline');
        }
        if (mountedRef.current) setSims(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
      } else {
        captureError(err, 'handleUpdateSIM');
      }
    }
  };

  return {
    sims, agents, sellers, alerts, transactions, stats, settings, currentView,
    loading, apiError, toasts, offlinePending, isOnline,
    setView, setSettings, setSims, dismissToast,
    handleAddSIM, handleAddAgent, handleUpdateAgent,
    handleUpdateSeller, handleAddBalance, handleResolveAlert,
    handleUpdateSIM, handleAddSimBatch, refreshData,
  };
}
