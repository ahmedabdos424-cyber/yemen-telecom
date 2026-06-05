import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Role, Seller, Sim, Operation, OperatorInventory, Operator } from './types';
import { 
  INITIAL_SELLERS, 
  INITIAL_SIMS, 
  INITIAL_OPERATIONS, 
  INITIAL_INVENTORIES 
} from './mockData';

// Component Imports
import LoginScreen from './components/LoginScreen';
import NavBar from './components/NavBar';
import AddSellerForm from './components/AddSellerForm';
import ActivateSimForm from './components/ActivateSimForm';
import AgentDashboard from './components/AgentDashboard';
import SellerDashboard from './components/SellerDashboard';

import { LogOut, Sun, Moon, Info, ArrowLeftRight, HelpCircle, Shield } from 'lucide-react';

export default function App() {
  // Authentication & Global state
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

  // Local state initialized with Mock Data, falling back to LocalStorage
  const [sellers, setSellers] = useState<Seller[]>(() => {
    const saved = localStorage.getItem('tele_sellers');
    return saved ? JSON.parse(saved) : INITIAL_SELLERS;
  });

  const [sims, setSims] = useState<Sim[]>(() => {
    const saved = localStorage.getItem('tele_sims');
    return saved ? JSON.parse(saved) : INITIAL_SIMS;
  });

  const [operations, setOperations] = useState<Operation[]>(() => {
    const saved = localStorage.getItem('tele_operations');
    return saved ? JSON.parse(saved) : INITIAL_OPERATIONS;
  });

  const [inventories, setInventories] = useState<OperatorInventory[]>(() => {
    const saved = localStorage.getItem('tele_inventories');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORIES;
  });

  const [activeTab, setActiveTab] = useState('home');

  // Trigger cache writes on state updates
  useEffect(() => {
    localStorage.setItem('tele_sellers', JSON.stringify(sellers));
  }, [sellers]);

  useEffect(() => {
    localStorage.setItem('tele_sims', JSON.stringify(sims));
  }, [sims]);

  useEffect(() => {
    localStorage.setItem('tele_operations', JSON.stringify(operations));
  }, [operations]);

  useEffect(() => {
    localStorage.setItem('tele_inventories', JSON.stringify(inventories));
  }, [inventories]);

  useEffect(() => {
    localStorage.setItem('tele_dark', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth Handlers
  const handleLogin = (selectedRole: Role, loggedUser: string) => {
    setRole(selectedRole);
    setUsername(loggedUser || (selectedRole === 'agent' ? 'أحمد محمد' : 'عبدالرحمن العتيبي'));
    setActiveTab('home');
    localStorage.setItem('tele_role', selectedRole);
    localStorage.setItem('tele_username', loggedUser);
  };

  const handleLogout = () => {
    setRole(null);
    setUsername('');
    localStorage.removeItem('tele_role');
    localStorage.removeItem('tele_username');
  };

  // State mutators triggered by child actions
  const handleAddSeller = (newSellerData: Omit<Seller, 'id' | 'creationDate' | 'lastLogin'>) => {
    const id = String(Math.floor(10000 + Math.random() * 90000));
    const now = new Date();
    const creationDate = now.toISOString().split('T')[0].replace(/-/g, '/');
    const lastLogin = 'لم يسجل دخول بعد';

    const newSeller: Seller = {
      ...newSellerData,
      id,
      creationDate,
      lastLogin
    };

    setSellers(prev => [newSeller, ...prev]);
    // Redirect Agent to 'sellers' tab so they can see their newly created agent
    setActiveTab('sellers');
  };

  const handleTransferSims = (
    op: Operator, 
    count: number, 
    startSerial: string, 
    endSerial: string, 
    recipientName: string
  ) => {
    // 1. Subtract count from specified Operator Inventory
    setInventories(prev => prev.map(inv => {
      if (inv.operator === op) {
        return {
          ...inv,
          available: Math.max(0, inv.available - count),
          remaining: inv.remaining + count
        };
      }
      return inv;
    }));

    // 2. Increase recipient seller's stock indicator in sellers list
    setSellers(prev => prev.map(s => {
      if (s.name === recipientName) {
        return {
          ...s,
          currentStock: s.currentStock + count,
          efficiency: Math.min(100, s.efficiency + 3) // simulate slight efficiency boost
        };
      }
      return s;
    }));

    // 3. Create simulated sims and append to SIM list
    const newSims: Sim[] = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const offsetId = String(Math.floor(Math.random() * 1000));
      newSims.push({
        id: `sim_gen_${Date.now()}_${i}`,
        iccid: `${startSerial.slice(0, 5)}...${offsetId}`,
        operator: op,
        category: 'Prepaid Secondary Range',
        status: 'available',
        dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/')
      });
    }
    if (newSims.length > 0) {
      setSims(prev => [...newSims, ...prev]);
    }

    // 4. Create action operation transaction and prepend
    const newOp: Operation = {
      id: `op_${Date.now()}`,
      type: 'recharge',
      target: `#TRSF-${Math.floor(1000 + Math.random() * 9000)}`,
      operator: op,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      time: 'الآن',
      status: 'success'
    };
    setOperations(prev => [newOp, ...prev]);
  };

  const handleSimActivation = (simData: {
    fullName: string;
    idNumber: string;
    iccid: string;
    phoneNumber: string;
    operator: Operator;
  }) => {
    // 1. Prepend activation to the Operations list
    const isYm = simData.operator === 'yemen_mobile';
    const randomStatus: 'success' | 'failed' = Math.random() > 0.15 ? 'success' : 'failed';

    const newOp: Operation = {
      id: `op_act_${Date.now()}`,
      type: 'activate',
      target: simData.phoneNumber,
      operator: simData.operator,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      time: 'الآن',
      status: randomStatus
    };
    setOperations(prev => [newOp, ...prev]);

    // 2. Add or update SIM record status to 'sold' if it matches the ICCID
    setSims(prev => {
      const match = prev.find(s => s.iccid === simData.iccid);
      if (match) {
        return prev.map(s => s.iccid === simData.iccid ? { ...s, status: 'sold' as const } : s);
      } else {
        // Create new sold SIM card record
        const newSimSeed: Sim = {
          id: `sim_act_${Date.now()}`,
          iccid: simData.iccid,
          operator: simData.operator,
          category: 'Prepaid Mobile SIM',
          status: 'sold',
          dateAdded: new Date().toISOString().split('T')[0].replace(/-/g, '/')
        };
        return [newSimSeed, ...prev];
      }
    });

    // 3. Deduct from seller stock if matched
    if (role === 'seller') {
      // Stub update metrics
    }
  };

  const handleUpdateSellerStatus = (sellerId: string, status: 'active' | 'inactive') => {
    setSellers(prev => prev.map(s => {
      if (s.id === sellerId) {
        return {
          ...s,
          status: status === 'active' ? 'active' : 'inactive'
        };
      }
      return s;
    }));
  };

  const handleResetSellerPassword = (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (seller) {
      alert(`تمت إعادة تعيين كلمة مرور البائع "${seller.name}" بنجاح، وإرسال الرمز المؤقت الجديد للجوال المقترن.`);
    }
  };

  const handlePasswordChanged = (newPass: string) => {
    // Mock handler
    console.log("Password changed:", newPass);
  };

  // If not logged in, show the login experience
  if (!role) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Find logged-in seller config
  const selfSellerData: Seller = sellers.find(s => s.id === '99283') || {
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
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${darkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Dynamic Background Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-15 pointer-events-none" />

      {/* Secure Isolated Session Status Line */}
      <div className="bg-slate-950/70 border-b border-slate-800 text-slate-300 text-xs py-2 px-4 flex justify-between items-center relative z-40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] text-slate-400 font-medium">اتصال مشفر وآمن • تم فصل وصيانة الصلاحيات للواجهة والبيانات تلقائياً</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold ${
            role === 'manager' ? 'bg-red-950 text-red-400 border border-red-900/30' :
            role === 'agent' ? 'bg-blue-950 text-blue-400 border border-blue-900/30' :
            'bg-emerald-950 text-emerald-400 border border-emerald-950/30'
          }`}>
            صلاحية: {role === 'manager' ? 'مدير النظام العام' : role === 'agent' ? 'الوكيل الإقليمي للشرائح' : 'بوابة البائع المعتمد'}
          </span>
        </div>
      </div>

      {/* Navigation (Persistent on desktop, bottom-fixed on mobile) */}
      <NavBar 
        role={role} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        username={username}
        onLogout={handleLogout} 
      />

      {/* Main Content Pane */}
      {/* Sidebar is 280px (w-70) - so on high resolution we set RTL padding-right dynamically to mirror right-to-left */}
      <main className="lg:pr-70 pt-8 pb-28 px-4 md:px-8 max-w-5xl mx-auto relative z-10 transition-all">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + '_' + role}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            
            {/* 1. HOME TAB */}
            {activeTab === 'home' && (
              role === 'seller' ? (
                <SellerDashboard
                  sellerData={selfSellerData}
                  sims={sims.filter(s => s.status === 'available')}
                  operations={operations}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onLogout={handleLogout}
                  onPasswordChanged={handlePasswordChanged}
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                />
              ) : (
                <AgentDashboard
                  role={role}
                  sellers={sellers}
                  sims={sims}
                  inventories={inventories}
                  onAddSeller={() => setActiveTab('add_seller')}
                  onTransferSims={handleTransferSims}
                  onUpdateSellerStatus={handleUpdateSellerStatus}
                  onResetSellerPassword={handleResetSellerPassword}
                />
              )
            )}

            {/* 2. ACTIVATE SIM TAB */}
            {activeTab === 'activate' && (
              <ActivateSimForm onSimActivated={handleSimActivation} />
            )}

            {/* 3. ADD SELLER TAB (Only visible / actionable for Agents) */}
            {activeTab === 'add_seller' && (
              <AddSellerForm onSellerAdded={handleAddSeller} />
            )}

            {/* 4. SELLERS LIST TAB */}
            {activeTab === 'sellers' && (
              <AgentDashboard
                role={role}
                sellers={sellers}
                sims={sims}
                inventories={inventories}
                onAddSeller={() => setActiveTab('add_seller')}
                onTransferSims={handleTransferSims}
                onUpdateSellerStatus={handleUpdateSellerStatus}
                onResetSellerPassword={handleResetSellerPassword}
              />
            )}

            {/* 5. MY SIMS / INVENTORY TAB  */}
            {activeTab === 'my_sims' && (
              role === 'seller' ? (
                <SellerDashboard
                  sellerData={selfSellerData}
                  sims={sims}
                  operations={operations}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onLogout={handleLogout}
                  onPasswordChanged={handlePasswordChanged}
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                />
              ) : (
                <AgentDashboard
                  role={role}
                  sellers={sellers}
                  sims={sims}
                  inventories={inventories}
                  onAddSeller={() => setActiveTab('add_seller')}
                  onTransferSims={handleTransferSims}
                  onUpdateSellerStatus={handleUpdateSellerStatus}
                  onResetSellerPassword={handleResetSellerPassword}
                />
              )
            )}

            {/* 6. STATS & PROFILE TAB */}
            {activeTab === 'account' && (
              <SellerDashboard
                sellerData={selfSellerData}
                sims={sims}
                operations={operations}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onLogout={handleLogout}
                onPasswordChanged={handlePasswordChanged}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            )}

          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
