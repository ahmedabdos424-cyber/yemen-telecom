import { useState, useEffect, useCallback } from 'react';
import { Seller, Sim, Operation, OperatorInventory, Operator, SimStatus, simProvider } from '../types';
import { api } from '../api/client';
import type { CreateSellerResponse, SimRow } from '../api/types';
import { captureError } from '../lib/monitor.ts';
import { useMountedRef } from './useMountedRef';
import {
  enqueueOffline, getNetworkStatus, getQueueStats, onNetworkChange, onQueueChanged,
  registerSyncHandlers, syncNow, OfflineQueueItem,
} from '../services/offlineQueue';

function loadFromStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* ignore */ }
  }
  return fallback;
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(',');
  const mime = (meta.match(/data:(.*?)(;|$)/) || [])[1] || 'image/jpeg';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return m.includes('failed to fetch') || m.includes('network request failed') || m.includes('networkerror') || m.includes('load failed');
  }
  return false;
}

function toLocalSim(r: SimRow): Sim {
  return {
    id: String(r.id),
    iccid: r.iccid,
    provider: simProvider(r.provider as Operator),
    status: r.status as SimStatus,
    dateAdded: r.date_added,
    phone: r.phone,
    owner: r.owner,
    category: r.package_type,
    contract_image: r.contract_image ?? undefined,
    customer_name: r.customer_name ?? undefined,
    customer_id: r.customer_id ?? undefined,
    assigned_to: r.assigned_to,
  };
}

interface QueuedActivation {
  fullName: string;
  idNumber: string;
  iccid: string;
  phoneNumber: string;
  operator: Operator;
  contractImage?: string | null;
  role?: string | null;
}

async function syncActivationItem(item: OfflineQueueItem): Promise<void> {
  const q = item.payload as QueuedActivation;
  let contractImage = q.contractImage || null;
  if (contractImage && contractImage.startsWith('data:')) {
    const file = dataUrlToFile(contractImage, `contract_${Date.now()}.jpg`);
    const uploaded = await api.uploadFile(file, 'image');
    contractImage = uploaded.url;
  }
  if (q.role === 'agent') {
    await api.activateSim({ iccid: q.iccid, customerName: q.fullName, customerId: q.idNumber, contractImage: contractImage || undefined });
  }
  await api.createOperation({ type: 'activate', target: q.phoneNumber, operator: q.operator, status: 'success', customerName: q.fullName, customerId: q.idNumber, contractImage: contractImage || undefined, iccid: q.iccid });
  await api.createCustomer({ fullName: q.fullName, idNumber: q.idNumber, phone: q.phoneNumber }).catch(err => { captureError(err, 'createCustomerOnActivation'); });
  const allSims = (await api.getSims()) ?? [];
  const target = allSims.find(s => s.iccid === q.iccid);
  if (target) {
    await api.updateSim(target.id, { status: 'activated', customerName: q.fullName, customerId: q.idNumber, contractImage: contractImage || undefined });
  } else {
    try {
      await api.createSim({ iccid: q.iccid, phone: q.phoneNumber, provider: q.operator === 'yemen_mobile' ? 'Yemen Mobile' : q.operator === 'sabafon' ? 'Sabafon' : 'YOU', status: 'activated' });
    } catch { /* sim may already exist */ }
  }
}

export function useAgentSellerState(role: string | null, username: string) {
  const mountedRef = useMountedRef();
  const [sellers, setSellers] = useState<Seller[]>(() => loadFromStorage('tele_sellers', []));
  const [sims, setSims] = useState<Sim[]>(() => loadFromStorage('tele_sims', []));
  const [operations, setOperations] = useState<Operation[]>(() => loadFromStorage('tele_operations', []));
  const [inventories, setInventories] = useState<OperatorInventory[]>(() => loadFromStorage('tele_inventories', []));
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('tele_role_tab') || 'home');
  const [sellerCredentials, setSellerCredentials] = useState<{ username: string; password: string; sellerName: string; mode?: 'create' | 'reset' } | null>(null);
  const [offlinePending, setOfflinePending] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Offline queue: register the activation sync handler and react to
  // connectivity changes so queued activations flush once the network returns.
  // Merged so the manager's createSim/updateSim handlers stay registered.
  useEffect(() => {
    registerSyncHandlers({ activate: syncActivationItem }, true);
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
      registerSyncHandlers({});
    };
  }, [mountedRef]);

  // Persist
  useEffect(() => { localStorage.setItem('tele_sellers', JSON.stringify(sellers)); }, [sellers]);
  useEffect(() => { localStorage.setItem('tele_sims', JSON.stringify(sims)); }, [sims]);
  useEffect(() => { localStorage.setItem('tele_operations', JSON.stringify(operations)); }, [operations]);
  useEffect(() => { localStorage.setItem('tele_inventories', JSON.stringify(inventories)); }, [inventories]);

  const handleSetRoleTab = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('tele_role_tab', tab);
  };

  const handleAddSellerForAgent = async (data: CreateSellerResponse) => {
    try {
      const created = data.seller as Seller;
      if (mountedRef.current) setSellers(prev => [created, ...prev]);
      if (data?.credentials) {
        if (mountedRef.current) setSellerCredentials({
          username: data.credentials.username,
          password: data.credentials.password || '',
          sellerName: created.name || '',
          mode: 'create'
        });
      }
      handleSetRoleTab('sellers');
    } catch (err) {
      captureError(err, 'handleAddSellerForAgent');
    }
  };

  const handleTransferSimsForAgent = async (_op: Operator, _count: number, startSerial: string, endSerial: string, recipientName: string) => {
    const recipient = sellers.find(s => s.name === recipientName);
    if (!recipient) {
      throw new Error('لم يتم العثور على البائع المستلم');
    }
    try {
      // Server-side strict transfer: ownership moves atomically with the
      // agent's and seller's stock counters.
      const res = await api.transferSims({
        seller_id: String(recipient.id),
        from_iccid: startSerial,
        to_iccid: endSerial,
      });
      await refreshRoleData();
      return res;
    } catch (err) {
      captureError(err, 'handleTransferSimsForAgent');
      throw err;
    }
  };

  const handleSimActivationForSeller = async (simData: { fullName: string; idNumber: string; iccid: string; phoneNumber: string; operator: Operator; contractImage?: string | null }) => {
    // Activation lock: a seller with an empty stock cannot activate SIMs.
    if (role === 'seller' && (selfSellerData.currentStock ?? 0) <= 0) {
      throw new Error('لا يمكن تفعيل الشرائح: مخزونك الحالي فارغ. اطلب من الوكيل تحويل شرائح إليك أولاً.');
    }
    // Fast path: when the device is known to be offline, queue the activation
    // immediately instead of letting the API client burn its retry budget.
    if (!(await getNetworkStatus())) {
      try {
        await enqueueOffline('activate', { ...simData, role } satisfies QueuedActivation);
      } catch (qe) {
        captureError(qe, 'enqueueActivationOffline');
      }
      if (mountedRef.current) {
        setOperations(prev => [{
          id: `op_act_${Date.now()}`, type: 'activate', target: simData.phoneNumber,
          operator: simData.operator, date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
          time: 'الآن', status: 'success'
        }, ...prev]);
        setSims(prev => {
          const match = prev.find(s => s.iccid === simData.iccid);
          if (match) return prev.map(s => s.iccid === simData.iccid ? { ...s, status: 'activated' as const } : s);
          const toProvider = (o: Operator): 'Yemen Mobile' | 'Sabafon' | 'YOU' =>
            o === 'yemen_mobile' ? 'Yemen Mobile' : o === 'sabafon' ? 'Sabafon' : 'YOU';
          return [{ id: `sim_act_${Date.now()}`, iccid: simData.iccid, provider: toProvider(simData.operator), category: 'Prepaid Mobile SIM', status: 'activated', dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/') }, ...prev];
        });
      }
      return;
    }
    try {
      // Upload the contract image (if captured) so it is persisted as
      // evidence and appears in the manager's activations report.
      let contractImage = simData.contractImage || null;
      if (contractImage && contractImage.startsWith('data:')) {
        try {
          const file = dataUrlToFile(contractImage, `contract_${Date.now()}.jpg`);
          const uploaded = await api.uploadFile(file, 'image');
          contractImage = uploaded.url;
        } catch (err) {
          if (isNetworkError(err)) throw err;
          captureError(err, 'uploadContractImage');
          contractImage = null;
        }
      }

      // Serial validation (agents): the SIM must exist in the agent's available
      // stock. The server returns 400 otherwise, creating a high-priority alert.
      if (role === 'agent') {
        await api.activateSim({ iccid: simData.iccid, customerName: simData.fullName, customerId: simData.idNumber, contractImage: contractImage || undefined });
      }

      await api.createOperation({ type: 'activate', target: simData.phoneNumber, operator: simData.operator, status: 'success', customerName: simData.fullName, customerId: simData.idNumber, contractImage: contractImage || undefined, iccid: simData.iccid });
      await api.createCustomer({
        fullName: simData.fullName,
        idNumber: simData.idNumber,
        phone: simData.phoneNumber,
      }).catch(err => { captureError(err, 'createCustomerOnActivation'); });
      const allSims = (await api.getSims()) ?? [];
      const target = allSims.find(s => s.iccid === simData.iccid);
      if (target) {
        await api.updateSim(target.id, { status: 'activated', customerName: simData.fullName, customerId: simData.idNumber, contractImage: contractImage || undefined });
      } else {
        try {
          await api.createSim({ iccid: simData.iccid, phone: simData.phoneNumber, provider: simData.operator === 'yemen_mobile' ? 'Yemen Mobile' : simData.operator === 'sabafon' ? 'Sabafon' : 'YOU', status: 'activated' });
        } catch { /* sim may already exist */ }
      }
    } catch (err) {
      if (isNetworkError(err)) {
        // Offline: persist the activation to the queue so it syncs when the
        // network returns. The optimistic local update below still runs, so
        // the seller sees the activation as done immediately.
        try {
          await enqueueOffline('activate', { ...simData, role } satisfies QueuedActivation);
        } catch (qe) {
          captureError(qe, 'enqueueActivationOffline');
        }
      } else {
        captureError(err, 'handleSimActivationForSeller');
        throw err;
      }
    }

    if (mountedRef.current) setOperations(prev => [{
      id: `op_act_${Date.now()}`, type: 'activate', target: simData.phoneNumber,
      operator: simData.operator, date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      time: 'الآن', status: 'success'
    }, ...prev]);

    const toProvider = (o: Operator): 'Yemen Mobile' | 'Sabafon' | 'YOU' =>
      o === 'yemen_mobile' ? 'Yemen Mobile' : o === 'sabafon' ? 'Sabafon' : 'YOU';
    if (mountedRef.current) setSims(prev => {
      const match = prev.find(s => s.iccid === simData.iccid);
      if (match) return prev.map(s => s.iccid === simData.iccid ? { ...s, status: 'activated' as const } : s);
      return [{ id: `sim_act_${Date.now()}`, iccid: simData.iccid, provider: toProvider(simData.operator), category: 'Prepaid Mobile SIM', status: 'activated', dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/') }, ...prev];
    });

    // Re-sync inventories/operations so the per-operator summary cards
    // (available decremented, sold incremented) refresh without a manual pull.
    try {
      await refreshRoleData();
    } catch (re) {
      captureError(re, 'refreshAfterActivation');
    }
  };

  const handleUpdateSellerStatusForAgent = (sellerId: string, status: 'active' | 'inactive') => {
    if (mountedRef.current) setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, status } : s));
    api.updateSeller(Number(sellerId), { status }).catch(err => {
      captureError(err, 'handleUpdateSellerStatusForAgent');
    });
  };

  const handleEditSellerForAgent = async (seller: Seller) => {
    try {
      const updated = (await api.updateSeller(Number(seller.id), { name: seller.name, phone: seller.phone, region: seller.region })) as Seller;
      if (mountedRef.current) setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, ...updated } : s));
    } catch (err) {
      captureError(err, 'handleEditSellerForAgent');
      throw err;
    }
  };

  const handleDeleteSellerForAgent = async (sellerId: string): Promise<void> => {
    try {
      await api.deleteSeller(Number(sellerId));
      if (mountedRef.current) setSellers(prev => prev.filter(s => s.id !== sellerId));
    } catch (err) {
      captureError(err, 'handleDeleteSellerForAgent');
      throw err;
    }
  };

  const handleResetSellerPasswordForAgent = async (sellerId: string) => {
    try {
      const seller = sellers.find(s => s.id === sellerId);
      const result = await api.resetSellerPassword(Number(sellerId));
      if (mountedRef.current && result?.credentials) setSellerCredentials({
        username: result.credentials.username,
        password: result.credentials.password,
        sellerName: seller?.name || sellerId,
        mode: 'reset'
      });
    } catch (err) {
      captureError(err, 'handleResetSellerPasswordForAgent');
    }
  };

  const handleUpdateInventories = (updated: OperatorInventory[]) => {
    setInventories(updated);
  };

  // Persist SIM changes made by the seller (sell / reserve / edit / transfer / delete).
  // Receives the full updated list and reconciles it against the local list,
  // pushing inserts/updates/deletes to the server.
  const handleUpdateSimsForSeller = async (updated: Sim[]) => {
    const prev = sims;
    const prevById = new Map(prev.map(s => [s.id, s]));
    const updatedById = new Map(updated.map(s => [s.id, s]));
    try {
      for (const sim of updated) {
        const before = prevById.get(sim.id);
        if (!before) {
          await api.createSim(sim);
        } else if (before.status !== sim.status || before.iccid !== sim.iccid || before.phone !== sim.phone || before.category !== sim.category || before.operator !== sim.operator || before.owner !== sim.owner) {
          await api.updateSim(Number(sim.id), {
            status: sim.status,
            iccid: sim.iccid,
            phone: sim.phone,
            owner: sim.owner,
          });
        }
      }
      for (const old of prev) {
        if (!updatedById.has(old.id)) {
          await api.deleteSim(Number(old.id));
        }
      }
      if (mountedRef.current) setSims(updated);
    } catch (err) {
      captureError(err, 'handleUpdateSimsForSeller');
      // Roll back to the server-faithful local list on failure
      if (mountedRef.current) setSims(prev);
      throw err;
    }
  };

  // Realtime refresh: re-pull the role-scoped lists after a remote change
  // (activation on another device, distribution approval, inventory edits…).
  const refreshRoleData = useCallback(async () => {
    const results = await Promise.allSettled([
      api.getSellers(),
      api.getSims(),
      api.getInventories(),
      api.getOperations(),
    ]);
    if (!mountedRef.current) return;
    if (results[0].status === 'fulfilled') setSellers((results[0].value ?? []) as Seller[]);
    if (results[1].status === 'fulfilled') setSims((results[1].value ?? []).map(toLocalSim));
    if (results[2].status === 'fulfilled') setInventories((results[2].value ?? []) as OperatorInventory[]);
    if (results[3].status === 'fulfilled') setOperations((results[3].value ?? []) as Operation[]);
  }, [mountedRef]);

  // Self seller data for seller role — starts empty for new accounts
  const selfSellerData: Seller = sellers.find(s => s.username === username || s.name === username) || {
    id: '', name: username, storeName: '', idNumber: '',
    phone: '', region: '', regionCode: '', status: 'active',
    totalSales: 0, currentStock: 0, efficiency: 0, creationDate: '',
    lastLogin: '', simsCount: 0, sales30Days: 0, salesGrowth: 0, activityRate: 0
  };

  return {
    sellers, sims, operations, inventories, activeTab, sellerCredentials, selfSellerData,
    offlinePending, isOnline,
    handleSetRoleTab, setSellerCredentials, setSims, setSellers,
    handleAddSellerForAgent, handleTransferSimsForAgent, handleSimActivationForSeller,
    handleUpdateSellerStatusForAgent, handleResetSellerPasswordForAgent, handleEditSellerForAgent, handleDeleteSellerForAgent, handleUpdateInventories, handleUpdateSimsForSeller,
    refreshRoleData,
  };
}
