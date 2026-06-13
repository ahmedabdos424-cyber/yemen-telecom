import { useState, useEffect } from 'react';
import { Seller, Sim, Operation, OperatorInventory, Operator } from '../types';
import { api } from '../api/client';
import { captureError } from '../lib/monitor.ts';

function loadFromStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* ignore */ }
  }
  return fallback;
}

export function useAgentSellerState(role: string | null, username: string) {
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
      const created = result.seller || result;
      setSellers(prev => [created, ...prev]);
      if (result.credentials) {
        credUsername = result.credentials.username;
      }
      setSellerCredentials({ username: credUsername, password: credPassword, sellerName, mode: 'create' });
      handleSetRoleTab('sellers');
    } catch (err) {
      captureError(err, 'handleAddSellerForAgent');
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      alert(`فشل إنشاء البائع: ${message}\n\nيرجى التحقق من اتصال الخادم والمحاولة مرة أخرى.`);
    }
  };

  const handleTransferSimsForAgent = async (op: Operator, count: number, startSerial: string, endSerial: string, recipientName: string) => {
    try {
      await api.createOperation({
        type: 'recharge', target: `#TRSF-${Math.floor(1000 + Math.random() * 9000)}`, operator: op, status: 'success',
      });
    } catch (err) { captureError(err, 'handleTransferSimsForAgent'); }

    setInventories(prev => prev.map(inv => {
      if (inv.operator === op) {
        return { ...inv, available: Math.max(0, inv.available - count), remaining: inv.remaining + count };
      }
      return inv;
    }));

    setSellers(prev => prev.map(s => {
      if (s.name === recipientName) {
        return { ...s, currentStock: (s.currentStock || 0) + count, simsCount: s.simsCount + count, efficiency: Math.min(100, (s.efficiency || 0) + 3) };
      }
      return s;
    }));

    const newSims: Sim[] = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      newSims.push({
        id: `sim_gen_${Date.now()}_${i}`, iccid: `${startSerial.slice(0, 5)}...${String(Math.floor(Math.random() * 1000))}`,
        provider: op === 'yemen_mobile' ? 'Yemen Mobile' : op === 'sabafon' ? 'Sabafon' : 'YOU',
        category: 'Prepaid Secondary Range', status: 'available',
        dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/')
      });
    }
    if (newSims.length > 0) setSims(prev => [...newSims, ...prev]);
  };

  const handleSimActivationForSeller = async (simData: { fullName: string; idNumber: string; iccid: string; phoneNumber: string; operator: Operator }) => {
    const randomStatus: 'success' | 'failed' = Math.random() > 0.15 ? 'success' : 'failed';
    try {
      await api.createOperation({ type: 'activate', target: simData.phoneNumber, operator: simData.operator, status: randomStatus });
      const allSims = await api.getSims();
      const target = allSims.find((s: any) => s.iccid === simData.iccid);
      if (target) await api.updateSim(target.id, { status: 'sold' });
    } catch (err) { captureError(err, 'handleSimActivationForSeller'); }

    setOperations(prev => [{
      id: `op_act_${Date.now()}`, type: 'activate', target: simData.phoneNumber,
      operator: simData.operator as any, date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      time: 'الآن', status: randomStatus
    }, ...prev]);

    const toProvider = (o: Operator): 'Yemen Mobile' | 'Sabafon' | 'YOU' =>
      o === 'yemen_mobile' ? 'Yemen Mobile' : o === 'sabafon' ? 'Sabafon' : 'YOU';
    setSims(prev => {
      const match = prev.find(s => s.iccid === simData.iccid);
      if (match) return prev.map(s => s.iccid === simData.iccid ? { ...s, status: 'sold' as const } : s);
      return [{ id: `sim_act_${Date.now()}`, iccid: simData.iccid, provider: toProvider(simData.operator), category: 'Prepaid Mobile SIM', status: 'sold', dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/') }, ...prev];
    });
  };

  const handleUpdateSellerStatusForAgent = (sellerId: string, status: 'active' | 'inactive') => {
    setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, status } : s));
    api.updateSeller(Number(sellerId), { status }).catch(err => {
      captureError(err, 'handleUpdateSellerStatusForAgent');
      alert('فشل تحديث حالة البائع. تحقق من اتصال الخادم.');
    });
  };

  const handleEditSellerForAgent = async (seller: Seller) => {
    setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, name: seller.name, phone: seller.phone, region: seller.region } : s));
  };

  const handleDeleteSellerForAgent = async (sellerId: string): Promise<void> => {
    try {
      await api.deleteSeller(Number(sellerId));
      setSellers(prev => prev.filter(s => s.id !== sellerId));
    } catch (err) {
      captureError(err, 'handleDeleteSellerForAgent');
      throw err;
    }
  };

  const handleResetSellerPasswordForAgent = async (sellerId: string) => {
    try {
      const seller = sellers.find(s => s.id === sellerId);
      const result = await api.resetSellerPassword(Number(sellerId));
      setSellerCredentials({
        username: result.credentials.username,
        password: result.credentials.password,
        sellerName: seller?.name || sellerId,
        mode: 'reset'
      });
    } catch (err) {
      captureError(err, 'handleResetSellerPasswordForAgent');
      const seller = sellers.find(s => s.id === sellerId);
      alert(`تعذر إعادة تعيين كلمة المرور للبائع "${seller?.name}". تحقق من اتصال الخادم.`);
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
