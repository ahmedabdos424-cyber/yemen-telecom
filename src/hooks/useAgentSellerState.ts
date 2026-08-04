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

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(',');
  const mime = (meta.match(/data:(.*?)(;|$)/) || [])[1] || 'image/jpeg';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
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

  const handleAddSellerForAgent = async (data: any) => {
    try {
      const created = data?.seller || data;
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

  const handleTransferSimsForAgent = async (op: Operator, count: number, startSerial: string, endSerial: string, recipientName: string) => {
    try {
      await api.createOperation({
        type: 'recharge', target: `#TRSF-${Date.now()}`, operator: op, status: 'success',
      });
      const updatedInv: any = await api.updateInventories([
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

  const handleSimActivationForSeller = async (simData: { fullName: string; idNumber: string; iccid: string; phoneNumber: string; operator: Operator; contractImage?: string | null }) => {
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
      const target = allSims.find((s: any) => s.iccid === simData.iccid);
      if (target) {
        await api.updateSim(target.id, { status: 'activated', customerName: simData.fullName, customerId: simData.idNumber, contractImage: contractImage || undefined });
      } else {
        try {
          await api.createSim({ iccid: simData.iccid, phone: simData.phoneNumber, provider: simData.operator === 'yemen_mobile' ? 'Yemen Mobile' : simData.operator === 'sabafon' ? 'Sabafon' : 'YOU', status: 'activated' });
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
      if (match) return prev.map(s => s.iccid === simData.iccid ? { ...s, status: 'activated' as const } : s);
      return [{ id: `sim_act_${Date.now()}`, iccid: simData.iccid, provider: toProvider(simData.operator), category: 'Prepaid Mobile SIM', status: 'activated', dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/') }, ...prev];
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
      if (mountedRef.current) setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, ...(updated as any) } : s));
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
          await api.createSim(sim as any);
        } else if (before.status !== sim.status || before.iccid !== sim.iccid || before.phone !== sim.phone || before.category !== sim.category || before.operator !== sim.operator || before.owner !== (sim as any).owner) {
          await api.updateSim(Number(sim.id), {
            status: sim.status,
            iccid: sim.iccid,
            phone: sim.phone,
            category: sim.category,
            operator: sim.operator,
            owner: (sim as any).owner,
          } as any);
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
    handleUpdateSellerStatusForAgent, handleResetSellerPasswordForAgent, handleEditSellerForAgent, handleDeleteSellerForAgent, handleUpdateInventories, handleUpdateSimsForSeller,
  };
}
