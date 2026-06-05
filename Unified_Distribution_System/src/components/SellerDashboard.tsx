import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller, Operation, Sim, Operator } from '../types';
import { Settings, ShieldAlert, Award, TrendingUp, Info, Smartphone, Layers, PlusCircle, Eye, RefreshCw, Check, X, Shield, Lock, Moon, Sun, LogOut } from 'lucide-react';

interface SellerDashboardProps {
  sellerData: Seller;
  sims: Sim[];
  operations: Operation[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onPasswordChanged: (newPass: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function SellerDashboard({
  sellerData,
  sims,
  operations,
  activeTab,
  setActiveTab,
  onLogout,
  onPasswordChanged,
  darkMode,
  setDarkMode
}: SellerDashboardProps) {
  
  // Settings & Change Password modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  
  // Change password attributes
  const [idNumberEntry, setIdNumberEntry] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumberEntry) return alert('الرجاء إدخال رقم الهوية الخاصة بك للتحقق');
    if (!newPassword || !confirmPassword) return alert('الرجاء تعبئة حقول كلمة المرور الجديدة');
    if (newPassword !== confirmPassword) return alert('كلمتا المرور غير متطابقتين، الرجاء التحقق');
    if (idNumberEntry !== sellerData.idNumber) return alert('رقم الهوية المدخل غير مطابق لهويتك المسجلة بالنظام');

    setIsChangingPass(true);
    setTimeout(() => {
      setIsChangingPass(false);
      onPasswordChanged(newPassword);
      
      // Reset & exit
      setIdNumberEntry('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      
      alert('تم تحديث كلمة المرور الخاصة بك بنجاح!');
    }, 1500);
  };

  return (
    <div className="space-y-6 lg:space-y-8 font-sans">
      
      {/* 1. Header Top AppBar inside main content (mirrors mockup 5/6) */}
      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-slate-800 overflow-hidden bg-slate-950">
            <img 
              alt={sellerData.name}
              src={sellerData.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgz0srZX-fPTwrxphx6G-akOy2GKiaTrQYzHnp-47B3NYt2mOSmwRFetXfAXjkf47AGQwrVI7G6DK9bUagM6bRnQSANx7qimdKsdaA0EN8E6LCNHGgA8yQyx52j35ju6Koq_DAbeLPyKtMyX_V7FrARDH8pKlnSxB2D9iI7kriW-BylMZGFWZ513V_p0b7hFvnMxxpB13I9qjAgvyTY428duG4S_kNTi8m7wsUh-pcXE3VvCSRGQC5tXx87uBlg8XxFTURrPDKtKc'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-right">
            <h4 className="font-bold text-xs text-white pb-0.5">{sellerData.name}</h4>
            <p className="text-[9px] text-[#2c72f1] font-semibold">بائع تجزئة معتمد • فئة أ</p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Quick Stats action button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 flex items-center justify-center bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="إعدادات الحساب"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* ==================================== */}
      {/* TAB A: HOME DASHBOARD SECTION VIEWS */}
      {/* ==================================== */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          
          {/* Welcome User Panel */}
          <div className="flex justify-between items-center text-right">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">مرحباً، {sellerData.name.split(' ')[0]} 👋</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-light mt-0.5">إليك ملخص أداء ومبيعات شريحة SIM الخاصة بك لليوم.</p>
            </div>
            <span className="text-[10px] text-slate-500 font-sans" dir="ltr">2026-05-31</span>
          </div>

          {/* Quick simulated Action trigger button */}
          <div>
            <button
              onClick={() => setActiveTab('activate')}
              className="w-full py-4 bg-[#0151d5] hover:bg-[#0047be] text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-blue-950/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>تفعيل شريحة جديدة للمشتركين</span>
            </button>
          </div>

          {/* Quick Metrics counters Grid (matching images) */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Metric A: Total sims sold */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <span className="p-2 bg-blue-500/10 rounded-xl text-[#0151d5]">
                  <Smartphone size={16} />
                </span>
                <span className="text-emerald-400 bg-emerald-950/30 text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp size={10} /> +12%
                </span>
              </div>
              <div className="text-right">
                <h4 className="text-[10px] text-slate-400 font-medium">اجمالي الشرائح المباعة</h4>
                <p className="text-2xl font-bold tracking-tight text-white mt-1">42 <span className="text-[11px] text-slate-500">شريحة</span></p>
              </div>
            </div>

            {/* Metric B: Total sims remaining points */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <span className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                  <Layers size={16} />
                </span>
                <span className="text-[8px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full">مزامنة تامة</span>
              </div>
              <div className="text-right">
                <h4 className="text-[10px] text-slate-400 font-medium">إجمالي الشرائح المتبقية</h4>
                <p className="text-2xl font-bold tracking-tight text-white mt-1">1,250 <span className="text-[11px] text-slate-500">نقطة</span></p>
              </div>
            </div>

            {/* Metric C: Account status and class type tier */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between h-32 col-span-2 lg:col-span-1 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <span className="p-2 bg-red-500/10 rounded-xl text-red-500 animate-pulse">
                  <Award size={16} />
                </span>
                <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold">نشط معتمد</span>
              </div>
              <div className="text-right">
                <h4 className="text-[10px] text-slate-400 font-medium">حالة الحساب والعمولات الممتازة</h4>
                <p className="text-sm font-bold tracking-tight text-white mt-1">ممتاز (فئة أ)</p>
              </div>
            </div>

          </div>

          {/* Recent Operations log list card block */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">العمليات والطلبات الأخيرة بالفرع</h3>
              <button 
                onClick={() => setActiveTab('my_sims')}
                className="text-xs text-[#0151d5] hover:text-[#0047be] font-bold transition-all"
              >
                عرض كل الشرائح
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400">
                    <th className="p-4 font-bold text-slate-400">نوع العملية ومقدم الخدمة</th>
                    <th className="p-4 font-bold text-slate-400">الرقم/المرجع</th>
                    <th className="p-4 font-bold text-slate-400">توقيت العملية</th>
                    <th className="p-4 font-bold text-slate-400 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {operations.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-950/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            op.status === 'success' 
                              ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30' 
                              : 'bg-red-950/30 text-red-500 border border-red-900/30'
                          }`}>
                            <span className="material-symbols-outlined text-[18px]">
                              {op.type === 'activate' ? 'person_add' : 'payments'}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-200">
                              {op.type === 'activate' ? 'تفعيل شريحة' : 'شحن رصيد'}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              {op.operator === 'yemen_mobile' ? 'يمن موبايل' : op.operator === 'you' ? 'YOU' : 'سبأفون'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-300 font-semibold select-all">
                        {op.target}
                      </td>
                      <td className="p-4 text-slate-400">
                        {op.time}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          op.status === 'success'
                            ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                            : 'bg-red-950/30 text-red-500 border border-red-900/30'
                        }`}>
                          {op.status === 'success' ? 'ناجحة' : 'فشلت'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================= */}
      {/* TAB B: MY ACCOUNT / SETTINGS DETAIL VIEW (mimics mockup 5) */}
      {/* ======================================================= */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
            {/* Profile Banner */}
            <div className="flex flex-col items-center border-b border-slate-800 pb-6 mb-6">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-850 shadow-md mb-4 bg-slate-950">
                <img 
                  alt={sellerData.name}
                  src={sellerData.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgz0srZX-fPTwrxphx6G-akOy2GKiaTrQYzHnp-47B3NYt2mOSmwRFetXfAXjkf47AGQwrVI7G6DK9bUagM6bRnQSANx7qimdKsdaA0EN8E6LCNHGgA8yQyx52j35ju6Koq_DAbeLPyKtMyX_V7FrARDH8pKlnSxB2D9iI7kriW-BylMZGFWZ513V_p0b7hFvnMxxpB13I9qjAgvyTY428duG4S_kNTi8m7wsUh-pcXE3VvCSRGQC5tXx87uBlg8XxFTURrPDKtKc'}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-bold text-base text-white">{sellerData.name}</h3>
              <p className="text-[10px] text-slate-400 mt-1">تاريخ الانضمام: مايو 2022</p>
            </div>

            {/* Profile Detail list cards grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/85">
                <p className="text-[9px] text-[#2c72f1] font-bold mb-1">الوكيل المسؤول</p>
                <p className="text-xs font-bold text-white">عمر خالد</p>
              </div>
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/85">
                <p className="text-[9px] text-[#2c72f1] font-bold mb-1">معرف البائع</p>
                <p className="text-xs font-bold text-white">#99283-DXB</p>
              </div>
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/85 col-span-2">
                <p className="text-[9px] text-[#2c72f1] font-bold mb-1">المنطقة والتغطية</p>
                <p className="text-xs font-bold text-white">الرياض - العليا</p>
              </div>
            </div>

          </div>

          {/* Goal achieving layout widget card (Renders the Monthly target achievement in mockup 4) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-extrabold text-slate-300 tracking-wider mb-4 flex items-center gap-1.5">
              <Award size={15} className="text-[#2c72f1]" />
              الهدف التنافسي والشهري للبائع
            </h3>
            
            <div className="mb-2 flex justify-between items-end">
              <span className="text-xs font-bold text-[#2c72f1]">85% تم الإنجاز بنجاح</span>
              <span className="text-[10px] text-slate-400">1,248 / 1,500 شريحة</span>
            </div>

            <div className="w-full bg-slate-950 rounded-full h-3 mb-6 overflow-hidden">
              <div className="bg-gradient-to-l from-[#2c72f1] to-blue-500 h-3 rounded-full transition-all" style={{ width: '85%' }}></div>
            </div>

            {/* Achievement tip box */}
            <div className="bg-[#2c72f1]/5 border border-blue-900/30 p-4 rounded-2xl flex items-start gap-3">
              <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <div className="text-xs leading-relaxed text-slate-300 text-right">
                بقي لك <strong className="text-white">252 شريحة</strong> فقط للوصول إلى المستهدف الشهري الشامل والحصول على مكافأة الـ <strong className="text-emerald-400">500 ريال</strong> الإضافية التقديرية!
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ===================================================== */}
      {/* TAB C: SIM CARD INVENTORY LIST VIEW FOR SELLER */}
      {/* ===================================================== */}
      {activeTab === 'my_sims' && (
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white">إدارة مخزون البائع الفرعي</h2>
            <p className="text-xs text-slate-400 mt-1">تتبع الشرائح والخطوط المتوفرة بمحلك والمسندة من الوكيل عمر خالد</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sims.map(sim => (
              <div key={sim.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center hover:border-slate-750 transition-colors">
                <div className="text-right space-y-1.5 flex-1 pr-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-mono font-bold text-slate-100" dir="ltr">{sim.iccid}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      sim.status === 'available' 
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                        : 'bg-blue-950/40 text-blue-400 border border-blue-900/40'
                    }`}>
                      {sim.status === 'available' ? 'متوفر' : 'مباع'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-light">
                    <span>النوع: {sim.category}</span>
                    <span>شبكة: {sim.operator === 'yemen_mobile' ? 'يمن موبايل' : sim.operator === 'you' ? 'YOU' : 'سبأفون'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 9. SUB-MODALS AND SETTINGS SYSTEM OVERLAYS */}
      {/* ========================================== */}
      
      {/* Settings Modal ("إعدادات الحساب") */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-hidden text-slate-200 z-10"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white">إعدادات الحساب</h3>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className="p-1 text-slate-500 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Settings links */}
              <div className="space-y-4">
                
                {/* Dark Mode toggle item */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-850/80 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                      {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">الوضع الداكن</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">التبديل لمظهر واقي للعين</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Change Password option */}
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    setPasswordOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-600/10 border border-blue-900/30 text-blue-400 hover:bg-blue-600/20 active:scale-98 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-950 flex items-center justify-center">
                      <Lock size={16} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">تغيير كلمة المرور</p>
                      <p className="text-[9px] text-blue-500/80 mt-0.5">حماية الخصوصية والأمن</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                {/* Simulated Logout and Sign-out button */}
                <div className="pt-4 border-t border-slate-800/40 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      onLogout();
                    }}
                    className="w-full py-3 bg-red-650 hover:bg-red-500/10 text-red-500 border border-red-900/30 hover:border-red-500/45 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-xs rounded-xl hover:bg-slate-950 transition-colors cursor-pointer"
                  >
                    إغلاق الإعدادات
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Form Modal ("تغيير كلمة المرور") */}
      <AnimatePresence>
        {passwordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPasswordOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-hidden text-slate-200 z-10"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white">تغيير كلمة المرور</h3>
                <button 
                  onClick={() => setPasswordOpen(false)}
                  className="p-1 text-slate-500 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Password credentials change Form */}
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 text-right">
                
                <div className="space-y-1.5">
                  <label htmlFor="pass_id" className="block text-xs font-semibold text-slate-350 pr-1">رقم الهوية الوطنية</label>
                  <input
                    type="text"
                    id="pass_id"
                    value={idNumberEntry}
                    onChange={(e) => setIdNumberEntry(e.target.value)}
                    placeholder="أدخل رقم هويتك لتأكيد الحساب"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-600 transition-colors font-sans"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new_pass_val" className="block text-xs font-semibold text-slate-350 pr-1">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    id="new_pass_val"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-600 transition-colors font-sans"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm_pass_val" className="block text-xs font-semibold text-slate-350 pr-1">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    id="confirm_pass_val"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-600 transition-colors font-sans"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isChangingPass ? (
                      <RefreshCw className="animate-spin text-white" size={14} />
                    ) : (
                      <>
                        <Check size={14} />
                        <span>تأكيد التغيير وتحديث النظام</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(false)}
                    className="w-full py-2.5 text-slate-400 hover:text-slate-300 text-xs hover:bg-slate-950 rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
