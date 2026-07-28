import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller, Operation, Sim } from '../types';
import { api } from '../api/client';
import { useToast, ToastContainer } from '../hooks/useToast';
import SellerHome from './SellerHome';
import SellerAccount from './SellerAccount';
import SellerSimsView from './SellerSimsView';
import { 
  Settings, ShieldAlert, Award, TrendingUp, Info, Smartphone, Layers, PlusCircle, Eye, 
  RefreshCw, Check, X, Shield, Lock, Moon, Sun, LogOut, Palette, Type, Bell, User, Cpu, 
  ChevronLeft, MoreVertical, Search, Filter, Trash2, Printer, Edit, ArrowRightLeft,
  BookMarked, HelpCircle, AlertTriangle, Activity, Image, MapPin, Clock, Camera, Fingerprint
} from 'lucide-react';

interface SellerDashboardProps {
  sellerData: Seller;
  sims: Sim[];
  operations: Operation[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onConfirmLogout?: () => void;
  onPasswordChanged: (newPass: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onUpdateSims?: (updated: Sim[]) => void;
}

export default function SellerDashboard({
  sellerData,
  sims = [],
  operations = [],
  activeTab,
  setActiveTab,
  onLogout,
  onConfirmLogout,
  onPasswordChanged,
  darkMode,
  setDarkMode,
  onUpdateSims
}: SellerDashboardProps) {
  
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();

  // Settings & Change Password modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  // New settings preferences loaded from localStorage
  const [fontSize, setFontSizeState] = useState<'sm' | 'base' | 'lg'>(() => {
    return (localStorage.getItem('tele_font_size') as 'sm' | 'base' | 'lg') || 'base';
  });
  const [simNotifications, setSimNotifications] = useState<boolean>(() => {
    return localStorage.getItem('tele_sim_notifications') !== 'false';
  });
  const [lowStockNotifications, setLowStockNotifications] = useState<boolean>(() => {
    return localStorage.getItem('tele_low_stock_notifications') !== 'false';
  });
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(() => {
    return localStorage.getItem('tele_biometric_enabled') === 'true';
  });
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const setFontSize = (size: 'sm' | 'base' | 'lg') => {
    setFontSizeState(size);
    localStorage.setItem('tele_font_size', size);
  };

  const handleToggleSimNotifications = () => {
    const val = !simNotifications;
    setSimNotifications(val);
    localStorage.setItem('tele_sim_notifications', String(val));
  };

  const handleToggleLowStockNotifications = () => {
    const val = !lowStockNotifications;
    setLowStockNotifications(val);
    localStorage.setItem('tele_low_stock_notifications', String(val));
  };

  const handleToggleBiometric = () => {
    const val = !biometricEnabled;
    setBiometricEnabled(val);
    localStorage.setItem('tele_biometric_enabled', String(val));
  };
  
  // Change password attributes
  const [idNumberEntry, setIdNumberEntry] = useState('');
  const [currentPasswordEntry, setCurrentPasswordEntry] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordEntry) { toastWarning('الرجاء إدخال كلمة المرور الحالية للتحقق'); return; }
    if (!idNumberEntry) { toastWarning('الرجاء إدخال رقم الهوية الخاصة بك للتحقق'); return; }
    if (!newPassword || !confirmPassword) { toastWarning('الرجاء تعبئة حقول كلمة المرور الجديدة'); return; }
    if (newPassword !== confirmPassword) { toastWarning('كلمتا المرور غير متطابقتين، الرجاء التحقق'); return; }
    if (idNumberEntry !== sellerData.idNumber) { toastWarning('رقم الهوية المدخل غير مطابق لهويتك المسجلة بالنظام'); return; }

    setIsChangingPass(true);
    try {
      await api.updatePassword(currentPasswordEntry, newPassword);
      onPasswordChanged(newPassword);
      setIdNumberEntry('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      toastSuccess('تم تحديث كلمة المرور الخاصة بك بنجاح!');
    } catch (err: any) {
      toastError(err?.message || 'فشل تحديث كلمة المرور. تحقق من اتصال الخادم.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSellerConfirmLogout = () => {
    setLogoutConfirmOpen(false);
    if (onConfirmLogout) {
      onConfirmLogout();
    } else {
      onLogout();
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 font-sans safe-bottom">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {activeTab === 'home' && (
        <SellerHome operations={operations} sims={sims} onNavigate={setActiveTab} />
      )}

      {activeTab === 'account' && (
        <SellerAccount
          sellerData={sellerData}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onPasswordChanged={onPasswordChanged}
          onConfirmLogout={onConfirmLogout}
          onLogout={onLogout}
        />
      )}

      {activeTab === 'my_sims' && (
        <SellerSimsView sims={sims} onUpdateSims={onUpdateSims} />
      )}

      {/* ========================================== */}
      {/* 9. SUB-MODALS AND SETTINGS SYSTEM OVERLAYS */}
      {/* ========================================== */}
      
      {/* Settings Modal ("إعدادات الحساب") */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="إعدادات الحساب">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-200 z-10 max-h-[85vh] overflow-y-auto custom-scrollbar"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <Settings size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 font-sans">إعدادات الحساب</h3>
                </div>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className="p-2.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800/40 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Settings links */}
              <div className={`space-y-6 ${fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'}`}>
                
                {/* 1. المظهر والتخصيص */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Palette size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">المظهر والتخصيص</span>
                  </div>
                  
                  <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-4">
                    {/* Dark/Light mode toggle */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-slate-300">الوضع والمظهر</span>
                      <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                        <button
                          onClick={() => setDarkMode(false)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all ${!darkMode ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-slate-100'}`}
                        >
                          <Sun size={12} />
                          <span>فاتح</span>
                        </button>
                        <button
                          onClick={() => setDarkMode(true)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all ${darkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' : 'text-slate-400 hover:text-slate-100'}`}
                        >
                          <Moon size={12} />
                          <span>داكن</span>
                        </button>
                      </div>
                    </div>

                    {/* Font Size Selector */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-xs text-slate-300">حجم الخط للتطبيق</span>
                        <Type size={12} className="text-slate-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
                        <button
                          onClick={() => setFontSize('sm')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${fontSize === 'sm' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                        >
                          صغير (A-)
                        </button>
                        <button
                          onClick={() => setFontSize('base')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${fontSize === 'base' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                        >
                          متوسط (A)
                        </button>
                        <button
                          onClick={() => setFontSize('lg')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${fontSize === 'lg' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                        >
                          كبير (A+)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. الأمان والحساب */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Shield size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">الأمان والحساب</span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Password change */}
                    <button
                      onClick={() => {
                        setSettingsOpen(false);
                        setPasswordOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-850 hover:bg-slate-800/30 active:scale-98 transition-all group text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                          <Lock size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100">تغيير كلمة المرور</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">تحديث كود التمرير والاتصال الآمن</p>
                        </div>
                      </div>
                      <ChevronLeft size={14} className="text-slate-500 group-hover:text-slate-100 transition-colors" />
                    </button>

                    {/* Secure Logout action */}
                    <button
                      onClick={() => {
                        setSettingsOpen(false);
                        setLogoutConfirmOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-850 hover:bg-slate-800/30 active:scale-98 transition-all group text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                          <ShieldAlert size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100">تسجيل الخروج الآمن</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">إنهاء الجلسة وحذف مصادقة الاتصال مؤقتاً</p>
                        </div>
                      </div>
                      <ChevronLeft size={14} className="text-slate-500 group-hover:text-slate-100 transition-colors" />
                    </button>

                    {/* Biometric fingerprint toggle */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-850">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                          <Fingerprint size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100">بصمة الدخول</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">تسجيل الدخول ببصمة الإصبع</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={biometricEnabled}
                          onChange={handleToggleBiometric}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2.5px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-650"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. معلومات الحساب */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <User size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">معلومات الحساب</span>
                  </div>
                  
                  <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-slate-400 font-medium">اسم المستخدم</span>
                      <span className="text-slate-100 font-bold">{sellerData.name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-slate-400 font-medium">رقم الحساب</span>
                      <span className="text-slate-100 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{sellerData.id}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-slate-400 font-medium">المنطقة الإقليمية</span>
                      <span className="text-slate-100 font-bold">{sellerData.region || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-slate-400 font-medium">تاريخ إنشاء الحساب</span>
                      <span className="text-slate-100 font-sans font-bold">{sellerData.creationDate || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">حالة الحساب</span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>نشط معتمد</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. الإشعارات */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Bell size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">تفصيلات الإشعارات</span>
                  </div>
                  
                  <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-4">
                    {/* SIM Distribution notifications */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 ml-2 text-right">
                        <p className="text-xs font-bold text-slate-100">إشعارات توزيع الشرائح</p>
                        <p className="text-[9px] text-slate-500">مراقبة حصص وكميات الشرائح الإقليمية المكررة فورياً</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simNotifications}
                          onChange={handleToggleSimNotifications}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2.5px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-650"></div>
                      </label>
                    </div>

                    {/* Low Stock notifications */}
                    <div className="flex items-center justify-between border-t border-slate-900/60 pt-4">
                      <div className="space-y-0.5 ml-2 text-right">
                        <p className="text-xs font-bold text-slate-100">إشعارات المخزون المنخفض</p>
                        <p className="text-[9px] text-slate-500">التنبيه المسبق والإنذار المبكر الذكي للتوريد الفوري</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lowStockNotifications}
                          onChange={handleToggleLowStockNotifications}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2.5px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-650"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 6. معلومات التطبيق */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Cpu size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">معلومات التطبيق النظامية</span>
                  </div>
                  
                  <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">إصدار التطبيق</span>
                       <span className="text-slate-200 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">v4.2.0 (Enterprise Build)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">تاريخ آخر تحديث</span>
                      <span className="text-slate-200 font-sans font-bold">2026/06/02</span>
                    </div>
                  </div>
                </div>

                {/* 7. تسجيل الخروج السريع */}
                <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      setLogoutConfirmOpen(true);
                    }}
                    className="w-full py-3 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white border border-secondary/25 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs rounded-xl hover:bg-slate-950 transition-colors cursor-pointer"
                  >
                    إلغاء وإغلاق شاشة الإعدادات
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {logoutConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تسجيل الخروج">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLogoutConfirmOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-200 z-10 text-right font-sans max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <LogOut size={14} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">تسجيل الخروج</h3>
                </div>
                <button
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="p-2.5 text-slate-500 hover:text-slate-100 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-xs text-slate-300 leading-relaxed">
                  هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setLogoutConfirmOpen(false);
                    if (onConfirmLogout) {
                      onConfirmLogout();
                    } else {
                      onLogout();
                    }
                  }}
                  className="flex-1 py-3 bg-secondary hover:bg-red-750 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                >
                  تسجيل الخروج
                </button>
                <button
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-755 text-slate-300 font-medium text-[#c0c6d1] rounded-xl border border-slate-700 transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Form Modal ("تغيير كلمة المرور") */}
      <AnimatePresence>
        {passwordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تغيير كلمة المرور">
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
              className="relative w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-200 z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-100">تغيير كلمة المرور</h3>
                <button 
                  onClick={() => setPasswordOpen(false)}
                  className="p-2.5 text-slate-500 hover:text-slate-100 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Password credentials change Form */}
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 text-right">
               
                <div className="space-y-1.5">
                  <label htmlFor="pass_current" className="block text-xs font-semibold text-slate-350 pr-1">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    id="pass_current"
                    value={currentPasswordEntry}
                    onChange={(e) => setCurrentPasswordEntry(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية للتحقق"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-600 transition-colors font-sans"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pass_id" className="block text-xs font-semibold text-slate-350 pr-1">رقم الهوية الوطنية</label>
                  <input
                    type="text"
                    id="pass_id"
                    value={idNumberEntry}
                    onChange={(e) => setIdNumberEntry(e.target.value)}
                    placeholder="أدخل رقم هويتك لتأكيد الحساب"
                    inputMode="numeric"
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
