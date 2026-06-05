/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewType, SIM, Agent, Seller, SystemAlert, Transaction, SystemSettings, Sim, Operation, OperatorInventory, Operator, Role } from './types';

// Simple SHA-256 hash for client-side password obfuscation (not bcrypt-level, but prevents plain-text exposure)
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':' + salt);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Shared / Imported Components (always loaded)
import LoginScreen from './components/LoginScreen';
import { INITIAL_SELLERS, INITIAL_SIMS, INITIAL_INVENTORIES, INITIAL_OPERATIONS } from './mockData';
import { INITIAL_SELLERS as ADMIN_SELLERS, INITIAL_AGENTS, INITIAL_SIMS as ADMIN_SIMS } from './data';
import TopBar from './components/TopBar';
import NavBar from './components/NavBar';
import LoadingScreen from './components/shared/LoadingScreen';
import ErrorBoundary from './components/shared/ErrorBoundary';

// System Admin specific views (code-split)
import DashboardView from './components/DashboardView';
import SIMsView from './components/SIMsView';
import AgentsView from './components/AgentsView';
import SellersView from './components/SellersView';
import AlertsView from './components/AlertsView';
import GeographicRiskView from './components/GeographicRiskView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import AddAgentView from './components/AddAgentView';

// Agent & Seller specific views and forms (code-split)
import AddSellerForm from './components/AddSellerForm';
import ActivateSimForm from './components/ActivateSimForm';
const AgentDashboard = lazy(() => import('./components/AgentDashboard'));
const AgentProfileView = lazy(() => import('./components/agent/AgentProfileView'));
const SellerDashboard = lazy(() => import('./components/SellerDashboard'));
const BottomNav = lazy(() => import('./components/BottomNav'));

import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Check, Copy, X } from 'lucide-react';
import { api, setToken, fetchCsrfToken } from './api/client';

export default function App() {
  // Global Authentication States & Session Management
  const [role, setRole] = useState<Role | null>(() => {
    const saved = localStorage.getItem('tele_role');
    return saved ? (saved as Role) : null;
  });

  const [username, setUsername] = useState(() => {
    return localStorage.getItem('tele_username') || '';
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('tele_dark') === 'true';
  });

  const [token, setAppToken] = useState<string | null>(() => {
    return localStorage.getItem('auth_token');
  });
  const setTokenWrapper = (t: string | null) => {
    setAppToken(t);
    setToken(t);
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Verify JWT on mount — if token is invalid, force logout
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedRole = localStorage.getItem('tele_role');
    if (savedToken && savedRole) {
      api.getMe()
        .then((user) => {
          if (user.role !== savedRole) {
            console.warn('Role mismatch between JWT and localStorage — clearing session');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('tele_role');
            localStorage.removeItem('tele_username');
            localStorage.removeItem('tele_role_tab');
            localStorage.removeItem('tele_manager_view');
            setRole(null);
            setUsername('');
            setTokenWrapper(null);
          }
          fetchCsrfToken();
        })
        .catch(() => {
          // Token expired or invalid — clear auth state silently
          localStorage.removeItem('auth_token');
          localStorage.removeItem('tele_role');
          localStorage.removeItem('tele_username');
          setRole(null);
          setUsername('');
          setTokenWrapper(null);
        });
    }
  }, []);

  // SYSTEM ADMIN (Manager) MODULE STATES
  const [adminSims, setAdminSims] = useState<SIM[]>(() => {
    const saved = localStorage.getItem('admin_sims');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && parsed.length > 0 ? parsed : ADMIN_SIMS;
  });

  const [adminAgents, setAdminAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('admin_agents');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && parsed.length > 0 ? parsed : INITIAL_AGENTS;
  });

  const [adminSellers, setAdminSellers] = useState<Seller[]>(() => {
    const saved = localStorage.getItem('admin_sellers');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && parsed.length > 0 ? parsed : ADMIN_SELLERS;
  });

  const [adminAlerts, setAdminAlerts] = useState<SystemAlert[]>(() => {
    const saved = localStorage.getItem('admin_alerts');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && parsed.length > 0 ? parsed : [];
  });

  const [adminTransactions, setAdminTransactions] = useState<Transaction[]>([]);
  const [adminStats, setAdminStats] = useState<any>({});
  const [adminSettings, setAdminSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('admin_settings');
    return saved ? JSON.parse(saved) : null as any;
  });

  useEffect(() => {
    localStorage.setItem('admin_settings', JSON.stringify(adminSettings));
  }, [adminSettings]);

  // Active view for Manager/System Admin routing
  const [currentView, setAdminView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('tele_manager_view');
    return saved ? (saved as ViewType) : 'dashboard';
  });

  // AGENT & SELLER MODULE STATES
  const [teleSellers, setTeleSellers] = useState<Seller[]>(() => {
    const saved = localStorage.getItem('tele_sellers');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && parsed.length > 0 ? parsed : INITIAL_SELLERS;
  });

  const [teleSims, setTeleSims] = useState<Sim[]>(() => {
    const saved = localStorage.getItem('tele_sims');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && parsed.length > 0 ? parsed : INITIAL_SIMS;
  });

  const [teleOperations, setTeleOperations] = useState<Operation[]>(() => {
    const saved = localStorage.getItem('tele_operations');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && parsed.length > 0 ? parsed : INITIAL_OPERATIONS;
  });

  const [teleInventories, setTeleInventories] = useState<OperatorInventory[]>(() => {
    const saved = localStorage.getItem('tele_inventories');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed && parsed.length > 0 ? parsed : INITIAL_INVENTORIES;
  });

  // Active view for Agent & Seller routing
  const [activeTab, setRoleTab] = useState(() => {
    const saved = localStorage.getItem('tele_role_tab');
    return saved ? saved : 'home';
  });

  // PERSIST STATE DATA ENGINE (Caches writes on local states changes)
  useEffect(() => {
    localStorage.setItem('admin_sims', JSON.stringify(adminSims));
  }, [adminSims]);

  useEffect(() => {
    localStorage.setItem('admin_agents', JSON.stringify(adminAgents));
  }, [adminAgents]);

  useEffect(() => {
    localStorage.setItem('admin_sellers', JSON.stringify(adminSellers));
  }, [adminSellers]);

  useEffect(() => {
    localStorage.setItem('admin_alerts', JSON.stringify(adminAlerts));
  }, [adminAlerts]);

  useEffect(() => {
    localStorage.setItem('tele_sellers', JSON.stringify(teleSellers));
  }, [teleSellers]);

  useEffect(() => {
    localStorage.setItem('tele_sims', JSON.stringify(teleSims));
  }, [teleSims]);

  useEffect(() => {
    localStorage.setItem('tele_operations', JSON.stringify(teleOperations));
  }, [teleOperations]);

  useEffect(() => {
    localStorage.setItem('tele_inventories', JSON.stringify(teleInventories));
  }, [teleInventories]);

  useEffect(() => {
    localStorage.setItem('tele_dark', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Prevent back button actions after logging out
  useEffect(() => {
    if (!role) {
      const preventBack = () => {
        window.history.pushState(null, '', window.location.href);
      };
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', preventBack);
      return () => {
        window.removeEventListener('popstate', preventBack);
      };
    }
  }, [role]);

  // AUTH HANDLERS & SESSION PRESERVATION
  const handleLogin = async (selectedRole: Role, loggedUser: string, password: string) => {
    try {
      // Try JWT auth against backend first
      const result = await api.login(loggedUser, password);
      setTokenWrapper(result.token);
      const userRole = result.user.role as Role;
      setRole(userRole);
      setUsername(result.user.displayName);
      localStorage.setItem('tele_role', userRole);
      localStorage.setItem('tele_username', result.user.displayName);

      // Auto-route by JWT role
      if (userRole === 'manager') {
        const savedView = localStorage.getItem('tele_manager_view') || 'dashboard';
        setAdminView(savedView as ViewType);
      } else {
        const savedTab = localStorage.getItem('tele_role_tab') || 'home';
        setRoleTab(savedTab);
      }
      fetchCsrfToken();
      return;
    } catch {
      // Backend unavailable - fall back to localStorage auth
    }

    // Offline fallback: check seller accounts registry (hashed comparison)
    const cleanUser = loggedUser.trim().toLowerCase();
    const accounts = JSON.parse(localStorage.getItem('tele_seller_accounts') || '[]');
    const passwordHash = await hashPassword(password, cleanUser);
    const sellerAccount = accounts.find(
      (a: any) => a.username === cleanUser && a.passwordHash === passwordHash
    );

    if (sellerAccount) {
      setTokenWrapper(null);
      setRole('seller');
      setUsername(sellerAccount.name);
      localStorage.setItem('tele_role', 'seller');
      localStorage.setItem('tele_username', sellerAccount.name);
      const savedTab = localStorage.getItem('tele_role_tab') || 'home';
      setRoleTab(savedTab);
      return;
    }

    // Offline fallback: fixed demo accounts
    const demoAccounts: Record<string, { role: Role; name: string }> = {
      'manager': { role: 'manager', name: 'أحمد محمد' },
      'agent': { role: 'agent', name: 'الوكيل أحمد محمد' },
    };
    if (demoAccounts[cleanUser]) {
      const demo = demoAccounts[cleanUser];
      setTokenWrapper(null);
      setRole(demo.role);
      setUsername(demo.name);
      localStorage.setItem('tele_role', demo.role);
      localStorage.setItem('tele_username', demo.name);
      if (demo.role === 'manager') {
        const savedView = localStorage.getItem('tele_manager_view') || 'dashboard';
        setAdminView(savedView as ViewType);
      } else {
        const savedTab = localStorage.getItem('tele_role_tab') || 'home';
        setRoleTab(savedTab);
      }
      return;
    }
  };

  // API data fetcher: load all data from backend on mount/role change
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const refreshData = () => Promise.all([
    api.getSims().then(setAdminSims).catch(() => {}),
    api.getAgents().then(setAdminAgents).catch(() => {}),
    api.getSellers().then((data) => { setAdminSellers(data); setTeleSellers(data); }).catch(() => {}),
    api.getAlerts().then(setAdminAlerts).catch(() => {}),
    api.getSettings().then(setAdminSettings).catch(() => {}),
    api.getTransactions().then(setAdminTransactions).catch(() => {}),
    api.getInventories().then(setTeleInventories).catch(() => {}),
    api.getOperations().then(setTeleOperations).catch(() => {}),
    api.getStats().then(setAdminStats).catch(() => {}),
  ]);

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    setApiError(null);
    refreshData()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error('API fetch error:', err);
        setApiError('تعذر الاتصال بالخادم. يتم استخدام البيانات المحلية.');
        setLoading(false);
      });
  }, [role]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Seller credentials modal (shown after creating a new seller)
  const [sellerCredentials, setSellerCredentials] = useState<{
    username: string;
    password: string;
    sellerName: string;
  } | null>(null);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    api.logout().catch(() => {});
    setRole(null);
    setUsername('');
    setTokenWrapper(null);
    localStorage.removeItem('tele_role');
    localStorage.removeItem('tele_username');
    localStorage.removeItem('tele_role_tab');
    localStorage.removeItem('tele_manager_view');
    sessionStorage.clear();
    window.history.pushState(null, '', window.location.href);
  };

  const handleSetManagerView = (view: ViewType) => {
    setAdminView(view);
    localStorage.setItem('tele_manager_view', view);
  };

  // Toast notifications state for high-risk duplicates
  const [toasts, setToasts] = useState<Array<{
    id: string;
    title: string;
    message: string;
    identityNo: string;
    duplicatesCount: number;
  }>>([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Run automatically when admin settings change to trigger toasts
  useEffect(() => {
    if (role !== 'manager') return;
    const threshold = adminSettings?.highRiskDuplicatesThreshold ?? 5;
    api.getDuplicateIdentities().then((identities) => {
      const criticalNo = identities.filter((i: any) => i.duplicatesCount > threshold);
      if (criticalNo.length > 0) {
        const newToasts = criticalNo.map(item => ({
          id: `${item.idNo}-${threshold}`,
          title: '🚨 تنبيه: تسييل هوية مشبوهة',
          message: `تجاوزت الهوية رقم ${item.idNo} (${item.name}) عتبة الخطر المحددة (${threshold}) بتكرار قدره ${item.duplicatesCount} مرات!`,
          identityNo: item.idNo,
          duplicatesCount: item.duplicatesCount
        }));
        setToasts(newToasts);
      } else {
        setToasts([]);
      }
    }).catch(() => setToasts([]));
  }, [adminSettings?.highRiskDuplicatesThreshold, role]);

  const handleSetRoleTab = (tab: string) => {
    setRoleTab(tab);
    localStorage.setItem('tele_role_tab', tab);
  };

  // SYSTEM ADMIN HANDLERS
  const handleAddSIM = async (newSIM: Partial<SIM>) => {
    try {
      const created = await api.createSim(newSIM);
      setAdminSims((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to create SIM via API, using local fallback:', err);
      const simRecord: SIM = {
        id: String(Date.now()),
        phone: newSIM.phone || '',
        iccid: newSIM.iccid || '',
        provider: newSIM.provider || 'Yemen Mobile',
        status: newSIM.status || 'available',
        owner: newSIM.owner || 'المركز الرئيسي',
        dateAdded: newSIM.dateAdded || new Date().toLocaleDateString('ar-YE'),
        packageType: newSIM.packageType || 'باقة مزايا الشهرية'
      };
      setAdminSims((prev) => [simRecord, ...prev]);
    }
  };

  const handleAddAgent = async (newAgent: Partial<Agent>) => {
    try {
      const created = await api.createAgent(newAgent);
      setAdminAgents((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to create agent via API:', err);
      const agentRecord: Agent = {
        id: String(Date.now()),
        name: newAgent.name || '',
        region: newAgent.region || '',
        phone: newAgent.phone || '',
        sellersCount: newAgent.sellersCount || 0,
        simsCount: newAgent.simsCount || 0,
        status: newAgent.status || 'active'
      };
      setAdminAgents((prev) => [agentRecord, ...prev]);
    }
  };

  const handleUpdateAgent = (id: string, updatedFields: Partial<Agent>) => {
    api.updateAgent(Number(id), updatedFields).then(() => {
      setAdminAgents((prev) =>
        prev.map((agent) => (agent.id === id ? { ...agent, ...updatedFields } : agent))
      );
    }).catch(console.error);
  };

  const handleUpdateSeller = (id: string, updatedFields: Partial<Seller>) => {
    api.updateSeller(Number(id), updatedFields).then(() => {
      setAdminSellers((prev) =>
        prev.map((seller) => (seller.id === id ? { ...seller, ...updatedFields } : seller))
      );
    }).catch(console.error);
  };

  const handleAddBalance = (sellerId: string, amount: number) => {
    api.updateSellerBalance(Number(sellerId), amount).then(() => {
      setAdminSellers((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, sales30Days: s.sales30Days + amount } : s))
      );
    }).catch(console.error);
  };

  const handleResolveAlert = (id: string) => {
    api.resolveAlert(Number(id)).then(() => {
      setAdminAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }).catch(console.error);
  };


  // AGENT WORKFLOW HANDLERS
  const handleAddSellerForAgent = async (newSellerData: Omit<Seller, 'id' | 'creationDate' | 'lastLogin'>) => {
    let sellerId: string;
    let credUsername = (newSellerData.username || newSellerData.phone || `seller_${Date.now()}`).trim().toLowerCase();
    const credPassword = newSellerData.password || '123456';
    const sellerName = newSellerData.name;

    try {
      // Include agent_name so backend can link seller to agent
      const result = await api.createSeller({ ...newSellerData, agent_name: username });
      // Backend returns { seller, credentials: { username, password } }
      const created = result.seller || result;
      setTeleSellers(prev => [created, ...prev]);
      sellerId = created.id;
      if (result.credentials) {
        credUsername = result.credentials.username;
      }
    } catch (err) {
      console.error('Failed to create seller via API:', err);
      sellerId = String(Math.floor(10000 + Math.random() * 90000));
      const now = new Date();
      const creationDate = now.toISOString().split('T')[0].replace(/-/g, '/');
      const lastLogin = 'لم يسجل دخول بعد';
      setTeleSellers(prev => [{ ...newSellerData, id: sellerId, creationDate, lastLogin } as Seller, ...prev]);
    }

    // Save seller login credentials to persistent registry (SHA-256 hashed, never plain text)
    const accounts = JSON.parse(localStorage.getItem('tele_seller_accounts') || '[]');
    const existingIdx = accounts.findIndex((a: any) => a.username === credUsername);
    const passwordHash = await hashPassword(credPassword, credUsername);
    const credEntry = {
      username: credUsername,
      passwordHash,
      name: sellerName,
      id: sellerId,
      storeName: newSellerData.storeName || '',
      region: newSellerData.region || '',
      phone: newSellerData.phone || ''
    };
    if (existingIdx >= 0) {
      accounts[existingIdx] = credEntry;
    } else {
      accounts.push(credEntry);
    }
    localStorage.setItem('tele_seller_accounts', JSON.stringify(accounts));

    // Show credentials modal
    setSellerCredentials({ username: credUsername, password: credPassword, sellerName });

    handleSetRoleTab('sellers');
  };

  const handleTransferSimsForAgent = async (
    op: Operator, 
    count: number, 
    startSerial: string, 
    endSerial: string, 
    recipientName: string
  ) => {
    try {
      await api.createOperation({
        type: 'recharge',
        target: `#TRSF-${Math.floor(1000 + Math.random() * 9000)}`,
        operator: op,
        status: 'success',
      });
      refreshData();
    } catch (err) {
      console.error('Failed to log operation via API:', err);
    }

    setTeleInventories(prev => prev.map(inv => {
      if (inv.operator === op) {
        return { ...inv, available: Math.max(0, inv.available - count), remaining: inv.remaining + count };
      }
      return inv;
    }));

    setTeleSellers(prev => prev.map(s => {
      if (s.name === recipientName) {
        return {
          ...s,
          currentStock: (s.currentStock || 0) + count,
          simsCount: s.simsCount + count,
          efficiency: Math.min(100, (s.efficiency || 0) + 3)
        };
      }
      return s;
    }));

    const newSims: Sim[] = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      newSims.push({
        id: `sim_gen_${Date.now()}_${i}`,
        iccid: `${startSerial.slice(0, 5)}...${String(Math.floor(Math.random() * 1000))}`,
        operator: op,
        category: 'Prepaid Secondary Range',
        status: 'available',
        dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/')
      });
    }
    if (newSims.length > 0) setTeleSims(prev => [...newSims, ...prev]);
  };

  const handleSimActivationForSeller = async (simData: {
    fullName: string;
    idNumber: string;
    iccid: string;
    phoneNumber: string;
    operator: Operator;
  }) => {
    const randomStatus: 'success' | 'failed' = Math.random() > 0.15 ? 'success' : 'failed';

    try {
      await api.createOperation({
        type: 'activate',
        target: simData.phoneNumber,
        operator: simData.operator,
        status: randomStatus,
      });
      const allSims = await api.getSims();
      const target = allSims.find((s: any) => s.iccid === simData.iccid);
      if (target) {
        await api.updateSim(target.id, { status: 'sold' });
      }
      refreshData();
    } catch (err) {
      console.error('Failed to update SIM via API:', err);
    }

    const newOp: Operation = {
      id: `op_act_${Date.now()}`,
      type: 'activate',
      target: simData.phoneNumber,
      operator: simData.operator,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      time: 'الآن',
      status: randomStatus
    };
    setTeleOperations(prev => [newOp, ...prev]);

    setTeleSims(prev => {
      const match = prev.find(s => s.iccid === simData.iccid);
      if (match) {
        return prev.map(s => s.iccid === simData.iccid ? { ...s, status: 'sold' as const } : s);
      } else {
        return [{
          id: `sim_act_${Date.now()}`,
          iccid: simData.iccid,
          operator: simData.operator,
          category: 'Prepaid Mobile SIM',
          status: 'sold',
          dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/')
        }, ...prev];
      }
    });
  };

  const handleUpdateSellerStatusForAgent = (sellerId: string, status: 'active' | 'inactive') => {
    setTeleSellers(prev => prev.map(s => {
      if (s.id === sellerId) {
        return {
          ...s,
          status: status === 'active' ? 'active' : 'inactive'
        };
      }
      return s;
    }));
  };

  const handleResetSellerPasswordForAgent = (sellerId: string) => {
    const seller = teleSellers.find(s => s.id === sellerId);
    if (seller) {
      alert(`تمت إعادة تعيين كلمة مرور البائع "${seller.name}" بنجاح، وإرسال الرمز المؤقت الجديد للجوال المقترن.`);
    }
  };

  const handleActivateSimWithStatus = async (simId: number) => {
    try {
      await api.updateSim(simId, { status: 'sold' });
    } catch (err) {
      console.error('Failed to update SIM status:', err);
    }
  };

  const handleUpdateInventories = (updated: OperatorInventory[]) => {
    setTeleInventories(updated);
  };


  // CONDITIONAL RENDER BY USER ROLE (Strictly isolated routing prevents unauthorized screen access)
  if (!role) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 1. SYSTEM ADMIN (manager) VIEW
  if (role === 'manager') {
    const renderAdminView = () => {
      switch (currentView) {
        case 'dashboard':
          return (
            <DashboardView
              stats={adminStats}
              alerts={adminAlerts}
              transactions={adminTransactions}
              sims={adminSims}
              setView={handleSetManagerView}
            />
          );
        case 'sims':
          return <SIMsView sims={adminSims} onAddSIM={handleAddSIM} />;
        case 'agents':
          return (
            <AgentsView
              agents={adminAgents}
              setView={handleSetManagerView}
              onUpdateAgent={handleUpdateAgent}
            />
          );
        case 'sellers':
          return (
            <SellersView
              sellers={adminSellers}
              sims={adminSims}
              onUpdateSeller={handleUpdateSeller}
              onAddBalance={handleAddBalance}
            />
          );
        case 'alerts':
          return (
            <AlertsView
              alerts={adminAlerts}
              onResolveAlert={handleResolveAlert}
              settings={adminSettings}
              onUpdateSettings={setAdminSettings}
            />
          );
        case 'duplicate-identities':
          return <GeographicRiskView />;
        case 'reports':
          return <ReportsView />;
        case 'settings':
          return <SettingsView settings={adminSettings} onUpdateSettings={setAdminSettings} />;
        case 'add-agent':
          return <AddAgentView onAddAgent={handleAddAgent} setView={handleSetManagerView} />;
        default:
          return (
            <DashboardView
              stats={adminStats}
              alerts={adminAlerts}
              transactions={adminTransactions}
              sims={adminSims}
              setView={handleSetManagerView}
            />
          );
      }
    };

    return (
      <div className="min-h-dvh bg-theme-background font-sans antialiased text-slate-100 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {/* Top Header */}
        <TopBar
          currentView={currentView}
          setView={handleSetManagerView}
          onMenuToggle={() => {}}
          unresolvedAlertsCount={adminAlerts.length}
        />

        {/* Main Admin Content Pane */}
        <div className="flex pt-[calc(4rem+env(safe-area-inset-top))] min-h-dvh">
          <main className="flex-1 px-3 sm:px-4 md:px-8 py-4 md:py-8 lg:pt-10">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
              <ErrorBoundary>
                {renderAdminView()}
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Toast Notification Container */}
        <div className="fixed top-20 left-4 z-40 w-full max-w-sm flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: -100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-900/95 backdrop-blur border border-red-500/30 text-slate-100 rounded-xl p-4 shadow-xl pointer-events-auto flex flex-col gap-2 text-right"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{toast.title}</span>
                  </div>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="text-slate-500 hover:text-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {toast.message}
                </p>
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => {
                      handleSetManagerView('duplicate-identities');
                      removeToast(toast.id);
                    }}
                    className="py-1 px-3 bg-[#b90e1a] hover:bg-red-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                  >
                    شاشة مراقبة الهويات للتحقيق
                  </button>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="py-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-[10px] rounded-lg transition-colors cursor-pointer"
                  >
                    تجاهل
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Universal Fixed Bottom Navigation Bar */}
        <Suspense fallback={null}>
          <BottomNav
            currentView={currentView}
            setView={handleSetManagerView}
            unresolvedAlertsCount={adminAlerts.length}
            onLogout={handleConfirmLogout}
          />
        </Suspense>
      </div>
    );
  }

  // 2. AGENT (Wholesaler) & 3. SELLER (Retailer) VIEW
  const selfSellerData: Seller = teleSellers.find(s => s.username === username || s.name === username || s.id === '99283') || {
    id: '99283',
    name: username,
    storeName: 'معرض الجزيرة للاتصالات',
    idNumber: '1092837465',
    phone: '0501234512',
    region: 'الرياض، العليا',
    regionCode: 'riyadh',
    status: 'active',
    totalSales: 1248,
    currentStock: 252,
    efficiency: 85,
    creationDate: '2023/10/12',
    lastLogin: 'الآن',
    simsCount: 252,
    sales30Days: 1248,
    salesGrowth: 15,
    activityRate: 85
  };

  const renderRoleView = () => {
    // Role-based route protection
    if (role === 'agent') {
      // Filter sellers that belong to this agent
      const agentSellers = teleSellers.filter(s => s.agent_name === username);
      const agentSims = teleSims;

      switch (activeTab) {
        case 'home':
          return (
            <AgentDashboard
              role={role}
              activeTab={activeTab}
              sellers={agentSellers}
              sims={agentSims}
              inventories={teleInventories}
              onAddSeller={() => handleSetRoleTab('add_seller')}
              onActivateSim={() => handleSetRoleTab('activate')}
              onTransferSims={handleTransferSimsForAgent}
              onUpdateSellerStatus={handleUpdateSellerStatusForAgent}
              onResetSellerPassword={handleResetSellerPasswordForAgent}
              onUpdateInventories={handleUpdateInventories}
              username={username}
              onLogout={handleLogout}
              onConfirmLogout={handleConfirmLogout}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          );
        case 'activate':
          return <ActivateSimForm onSimActivated={handleSimActivationForSeller} />;
        case 'add_seller':
          return <AddSellerForm onSellerAdded={handleAddSellerForAgent} agentName={username} />;
        case 'sellers':
          return (
            <AgentDashboard
              role={role}
              activeTab={activeTab}
              sellers={agentSellers}
              sims={agentSims}
              inventories={teleInventories}
              onAddSeller={() => handleSetRoleTab('add_seller')}
              onActivateSim={() => handleSetRoleTab('activate')}
              onTransferSims={handleTransferSimsForAgent}
              onUpdateSellerStatus={handleUpdateSellerStatusForAgent}
              onResetSellerPassword={handleResetSellerPasswordForAgent}
              onUpdateInventories={handleUpdateInventories}
              username={username}
              onLogout={handleLogout}
              onConfirmLogout={handleConfirmLogout}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          );
        case 'my_sims':
          return (
            <AgentDashboard
              role={role}
              activeTab={activeTab}
              sellers={agentSellers}
              sims={agentSims}
              inventories={teleInventories}
              onAddSeller={() => handleSetRoleTab('add_seller')}
              onActivateSim={() => handleSetRoleTab('activate')}
              onTransferSims={handleTransferSimsForAgent}
              onUpdateSellerStatus={handleUpdateSellerStatusForAgent}
              onResetSellerPassword={handleResetSellerPasswordForAgent}
              onUpdateInventories={handleUpdateInventories}
              username={username}
              onLogout={handleLogout}
              onConfirmLogout={handleConfirmLogout}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          );
        case 'account':
          return (
            <AgentProfileView
              username={username}
              role={role}
              sellersCount={agentSellers.length}
              inventories={teleInventories}
              onLogout={handleLogout}
              onConfirmLogout={handleConfirmLogout}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          );
        default:
          return null;
      }
    } else if (role === 'seller') {
      switch (activeTab) {
        case 'home':
          return (
            <SellerDashboard
              sellerData={selfSellerData}
              sims={teleSims.filter(s => s.status === 'available')}
              operations={teleOperations}
              activeTab={activeTab}
              setActiveTab={handleSetRoleTab}
              onLogout={handleLogout}
              onConfirmLogout={handleConfirmLogout}
              onPasswordChanged={() => {}}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          );
        case 'activate':
          return <ActivateSimForm onSimActivated={handleSimActivationForSeller} />;
        case 'my_sims':
          return (
            <SellerDashboard
              sellerData={selfSellerData}
              sims={teleSims}
              operations={teleOperations}
              activeTab={activeTab}
              setActiveTab={handleSetRoleTab}
              onLogout={handleLogout}
              onConfirmLogout={handleConfirmLogout}
              onPasswordChanged={() => {}}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          );
        case 'account':
          return (
            <SellerDashboard
              sellerData={selfSellerData}
              sims={teleSims}
              operations={teleOperations}
              activeTab={activeTab}
              setActiveTab={handleSetRoleTab}
              onLogout={handleLogout}
              onConfirmLogout={handleConfirmLogout}
              onPasswordChanged={() => {}}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          );
        default:
          return null;
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans bg-slate-950 text-slate-100">
      {isLoading && !role ? (
        <LoadingScreen />
      ) : (
      <>
      {/* Background Matrix */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />



      {/* persistent sidebar navigation (handles responsiveness itself) */}
      <NavBar 
        role={role} 
        activeTab={activeTab} 
        setActiveTab={handleSetRoleTab} 
        username={username}
        onLogout={handleLogout} 
      />

      {/* Core content grid */}
      <main className="lg:pr-70 pt-6 pb-[4.5rem] px-3 sm:px-4 md:px-8 max-w-5xl mx-auto relative z-10 transition-all">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + '_' + role}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            <ErrorBoundary>
              <Suspense fallback={<div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /></div>}>
                {renderRoleView()}
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Seller Credentials Modal */}
      <AnimatePresence>
        {sellerCredentials && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-right"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                  <Check size={18} />
                  تم إنشاء البائع بنجاح
                </h3>
                <button
                  onClick={() => setSellerCredentials(null)}
                  className="p-1 text-slate-500 hover:text-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                تم إنشاء حساب البائع <strong className="text-slate-100">{sellerCredentials.sellerName}</strong> بنجاح. بيانات تسجيل الدخول:
              </p>
              <div className="space-y-3 mb-5">
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                  <label className="text-[10px] text-slate-500 block mb-1">اسم المستخدم</label>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-slate-100 bg-slate-900 px-3 py-1.5 rounded-lg flex-1 text-left" dir="ltr">{sellerCredentials.username}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(sellerCredentials.username); }}
                      className="btn-icon bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100"
                      title="نسخ اسم المستخدم"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                  <label className="text-[10px] text-slate-500 block mb-1">كلمة المرور</label>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-amber-400 bg-slate-900 px-3 py-1.5 rounded-lg flex-1 text-left" dir="ltr">{sellerCredentials.password}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(sellerCredentials.password); }}
                      className="btn-icon bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100"
                      title="نسخ كلمة المرور"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSellerCredentials(null)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 100 }}
              className="relative w-full sm:max-w-sm bg-slate-900 sm:border border-slate-800 sm:rounded-3xl rounded-t-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-slate-200 z-10 text-right safe-bottom"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/60">
                <h3 className="text-sm font-bold text-slate-100">تسجيل الخروج</h3>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-100 rounded-full transition-colors cursor-pointer touch-target"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 py-3.5 bg-[#b90e1a] hover:bg-red-750 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer text-center min-h-[44px]"
                >
                  تسجيل الخروج
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-[#c0c6d1] rounded-xl border border-slate-700 transition-all cursor-pointer text-center min-h-[44px]"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
}
