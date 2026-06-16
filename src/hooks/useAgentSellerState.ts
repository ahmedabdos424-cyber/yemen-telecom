import { useState, useEffect } from 'react';
import { Seller, Sim, Operation, OperatorInventory, Operator } from '../types';
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

export function useAgentSellerState(role: string | null, username: string) {
  const mountedRef = useMountedRef();
  const [sellers, setSellers] = useState<Seller[]>(() => loadFromStorage('tele_sellers', []));
  const [sims, setSims] = useState<Sim[]>(() => loadFromStorage('tele_sims', []));
  const [operations, setOperations] = useState<Operation[]>(() => loadFromStorage('tele_operations', []));
  const [inventories, setInventories] = useState<OperatorInventory[]>(() => loadFromStorage('tele_inventories', []));
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('tele_role_tab') || 'home');
  const [sellerCredentials, setSellerCredentials] = useState<{ username: string; password: string; sellerName: string; mode?: 'create' | 'reset' } | null>(null);

  // Persist
  useEffect(() => { localStorage.setItem('tele_sellers', JSON.stringify(sellers)); }, [sellers]);
  useEffect(() => { localStorage.setItem('tele_sims', JSON.stringify(sims)); }, [sims]);
  useEffect(() => { localStorage.setItem('tele_operations', JSON.stringify(operations)); }, [operations]);
  useEffect(() => { localStorage.setItem('tele_inventories', JSON.stringify(inventories)); }, [inventories]);

  const handleSetRoleTab = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('tele_role_tab', tab);
  };

  const handleAddSellerForAgent = async (data: Omit<Seller, 'id' | 'creationDate' | 'lastLogin'>) => {
    let credUsername = (data.username || data.phone || `seller_${Date.now()}`).trim().toLowerCase();
    const credPassword = data.password || Math.random().toString(36).substring(2, 8);
    const sellerName = data.name;

    try {
      const result = await api.createSeller({ ...data, agent_name: username });
      const created = result?.seller || result;
      if (mountedRef.current) setSellers(prev => [created, ...prev]);
      if (result?.credentials) {
        credUsername = result.credentials.username;
      }
      if (mountedRef.current) setSellerCredentials({ username: credUsername, password: credPassword, sellerName, mode: 'create' });
      handleSetRoleTab('sellers');
    } catch (err) {
      captureError(err, 'handleAddSellerForAgent');
    }
  };

  const handleTransferSimsForAgent = async (op: Operator, count: number, startSerial: string, endSerial: string, recipientName: string) => {
    try {
      await api.createOperation({
        type: 'recharge', target: `#TRSF-${Date.now()}`, operator: op, status: 'success',
      });
      const updatedInv = await api.updateInventories([
        { operator: op, available: 0, remaining: 0 }
      ]);
      if (mountedRef.current) setInventories(updatedInv);
    } catch (err) { captureError(err, 'handleTransferSimsForAgent'); }

    if (mountedRef.current) setSellers(prev => prev.map(s => {
      if (s.name === recipientName) {
        return { ...s, currentStock: (s.currentStock ?? 0) + count, simsCount: (s.simsCount ?? 0) + count, efficiency: Math.min(100, (s.efficiency ?? 0) + 3) };
      }
      return s;
    }));
  };

  const handleSimActivationForSeller = async (simData: { fullName: string; idNumber: string; iccid: string; phoneNumber: string; operator: Operator }) => {
    try {
      await api.createOperation({ type: 'activate', target: simData.phoneNumber, operator: simData.operator, status: 'success' });
      const allSims = (await api.getSims()) ?? [];
      const target = allSims.find((s: any) => s.iccid === simData.iccid);
      if (target) {
        await api.updateSim(target.id, { status: 'sold' });
      } else {
        try {
          await api.createSim({ iccid: simData.iccid, phone: simData.phoneNumber, provider: simData.operator === 'yemen_mobile' ? 'Yemen Mobile' : simData.operator === 'sabafon' ? 'Sabafon' : 'YOU', status: 'sold' });
        } catch { /* sim may already exist */ }
      }
    } catch (err) {
      captureError(err, 'handleSimActivationForSeller');
      throw err;
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
      if (match) return prev.map(s => s.iccid === simData.iccid ? { ...s, status: 'sold' as const } : s);
      return [{ id: `sim_act_${Date.now()}`, iccid: simData.iccid, provider: toProvider(simData.operator), category: 'Prepaid Mobile SIM', status: 'sold', dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/') }, ...prev];
    });
  };

  const handleUpdateSellerStatusForAgent = (sellerId: string, status: 'active' | 'inactive') => {
    if (mountedRef.current) setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, status } : s));
    api.updateSeller(Number(sellerId), { status }).catch(err => {
      captureError(err, 'handleUpdateSellerStatusForAgent');
    });
  };

  const handleEditSellerForAgent = async (seller: Seller) => {
    try {
      const updated = await api.updateSeller(Number(seller.id), { name: seller.name, phone: seller.phone, region: seller.region });
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

  // Self seller data for seller role — starts empty for new accounts
  const selfSellerData: Seller = sellers.find(s => s.username === username || s.name === username || s.id === '99283') || {
    id: '', name: username, storeName: '', idNumber: '',
    phone: '', region: '', regionCode: '', status: 'active',
    totalSales: 0, currentStock: 0, efficiency: 0, creationDate: '',
    lastLogin: '', simsCount: 0, sales30Days: 0, salesGrowth: 0, activityRate: 0
  };

  return {
    sellers, sims, operations, inventories, activeTab, sellerCredentials, selfSellerData,
    handleSetRoleTab, setSellerCredentials, setSims, setSellers,
    handleAddSellerForAgent, handleTransferSimsForAgent, handleSimActivationForSeller,
    handleUpdateSellerStatusForAgent, handleResetSellerPasswordForAgent, handleEditSellerForAgent, handleDeleteSellerForAgent, handleUpdateInventories,
  };
}
