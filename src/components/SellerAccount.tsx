import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller } from '../types';
import ProfileAvatar from './shared/ProfileAvatar';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';
import SettingsPanel from './shared/SettingsPanel';
import type { BiometricToggleResult } from '../services/biometricAuth';
import {
  User, MapPin, TrendingUp, Smartphone, Layers, Award, Activity, Lock,
  LogOut, ChevronLeft, X, Settings
} from 'lucide-react';

interface SellerAccountProps {
  sellerData: Seller;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onPasswordChanged?: (newPass: string) => void;
  onConfirmLogout: () => void;
  onLogout: () => void;
  biometricAvailable?: boolean;
  biometricEnabled?: boolean;
  onEnableBiometric?: () => Promise<BiometricToggleResult>;
  onDisableBiometric?: () => Promise<void>;
}

export default function SellerAccount({
  sellerData, darkMode, setDarkMode,
  onPasswordChanged, onConfirmLogout, onLogout,
  biometricEnabled = false,
  onEnableBiometric,
  onDisableBiometric
}: SellerAccountProps) {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning } = useToast();
  const [, setPhotoModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [fontSize, setFontSizeState] = useState<'sm' | 'base' | 'lg'>(() => {
    return (localStorage.getItem('tele_font_size') as 'sm' | 'base' | 'lg') || 'base';
  });
  const [simNotifications, setSimNotifications] = useState<boolean>(true);
  const [lowStockNotifications, setLowStockNotifications] = useState<boolean>(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    api.getUserPreferences().then((prefs) => {
      if (!mountedRef.current) return;
      setSimNotifications(prefs.simNotifications);
      setLowStockNotifications(prefs.lowStockNotifications);
      if (prefs.fontSize && ['sm', 'base', 'lg'].includes(prefs.fontSize)) {
        setFontSizeState(prefs.fontSize as 'sm' | 'base' | 'lg');
      }
    }).catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  const setFontSize = (size: 'sm' | 'base' | 'lg') => {
    setFontSizeState(size);
    localStorage.setItem('tele_font_size', size);
    api.updateUserPreferences({ fontSize: size }).catch(() => {});
  };

  const handleToggleSimNotifications = () => {
    const val = !simNotifications;
    setSimNotifications(val);
    api.updateUserPreferences({ simNotifications: val }).catch(() => {});
  };

  const handleToggleLowStockNotifications = () => {
    const val = !lowStockNotifications;
    setLowStockNotifications(val);
    api.updateUserPreferences({ lowStockNotifications: val }).catch(() => {});
  };

  const handleToggleBiometric = async () => {
    const val = !biometricEnabled;
    try {
      if (val) {
        if (!onEnableBiometric) return;
        const result = await onEnableBiometric();
        if (!result.enabled) {
          // إلغاء المستخدم من نافذة النظام ليس فشلا: لا تنبيه
          if (!result.cancelled) {
            toastWarning(result.message || 'تعذر تفعيل الدخول بالبصمة. أعد المحاولة أو سجّل الدخول بكلمة المرور');
          }
          return;
        }
        toastSuccess('تم تفعيل الدخول السريع بالبصمة');
      } else {
        if (!onDisableBiometric) return;
        await onDisableBiometric();
        toastSuccess('تم إيقاف الدخول السريع بالبصمة');
      }
    } catch (err) {
      toastWarning(err instanceof Error && err.message ? err.message : 'تعذر تفعيل الدخول بالبصمة. تحقق من توفر مستشعر بصمة أو أعد المحاولة');
    }
  };

  const [sellerPhoto, setSellerPhoto] = useState(
    sellerData.avatar || ''
  );

  const handleDeleteSellerPhoto = () => {
    setSellerPhoto('');
    setPhotoModalOpen(false);
  };

  const handleSellerConfirmLogout = () => {
    setLogoutConfirmOpen(false);
    if (onConfirmLogout) {
      onConfirmLogout();
    } else {
      onLogout();
    }
  };

  const handlePasswordChangeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPasswordInput) { toastWarning('الرجاء إدخال كلمة المرور الحالية للتحقق'); return; }
    if (!newPassword || !confirmPassword) { toastWarning('الرجاء تعبئة حقول كلمة المرور الجديدة'); return; }
    if (newPassword !== confirmPassword) { toastWarning('كلمتا المرور غير متطابقتين، الرجاء التحقق'); return; }

    setIsChangingPass(true);
    try {
      await api.updatePassword(currentPasswordInput, newPassword);
      setIsChangingPass(false);
      if (onPasswordChanged) onPasswordChanged(newPassword);
      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      toastSuccess('تم تحديث كلمة المرور الخاصة بك بنجاح!');
    } catch (err: unknown) {
      setIsChangingPass(false);
      toastError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans pb-24" dir="rtl">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Page Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-red-950/20 to-transparent" />
        {/* Header Actions: Dark Mode + Settings */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-all"
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-all"
          >
            <span className="material-symbols-outlined text-lg">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <ProfileAvatar
            photo={sellerPhoto}
            name={sellerData.name}
            onPhotoChange={(dataUrl) => { setSellerPhoto(dataUrl); setPhotoModalOpen(false); }}
            onPhotoDelete={handleDeleteSellerPhoto}
            size={120}
            className="mb-4"
          />
          <h2 className="text-xl font-bold text-slate-100">{sellerData.name}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <MapPin size={12} className="text-slate-500" />
            <span className="text-xs text-slate-400">منطقة: {sellerData.region}</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {sellerData.status === 'active' ? 'نشط' : sellerData.status === 'inactive' ? 'غير نشط' : sellerData.status === 'suspended' ? 'موقوف' : 'مخزون منخفض'}
          </div>
        </div>
      </div>

      {/* Basic Data Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800/60">
          <User size={14} className="text-red-500" />
          <h3 className="text-xs font-bold text-slate-100">البيانات الأساسية</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">اسم البائع</span>
            <p className="text-slate-100 font-bold mt-1 truncate">{sellerData.name}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">اسم المحل</span>
            <p className="text-slate-100 font-bold mt-1 truncate">{sellerData.storeName || '---'}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">رقم الهوية</span>
            <p className="text-slate-100 font-mono font-bold mt-1 truncate bg-slate-950 px-2 py-1 rounded border border-slate-800 inline-block">{sellerData.idNumber || '---'}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">رقم التواصل</span>
            <p className="text-slate-100 font-mono font-bold mt-1" dir="ltr">{sellerData.phone}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">المنطقة</span>
            <p className="text-slate-100 font-bold mt-1">{sellerData.region}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">تاريخ التسجيل</span>
            <p className="text-slate-100 font-bold mt-1">{sellerData.creationDate || '---'}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4 sm:col-span-2">
            <span className="text-slate-500 text-[10px]">اسم المستخدم</span>
            <p className="text-slate-100 font-mono font-bold mt-1 truncate bg-slate-950 px-2 py-1 rounded border border-slate-800 inline-block">{sellerData.username || sellerData.name}</p>
          </div>
        </div>
      </div>

      {/* Personal Stats Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800/60">
          <TrendingUp size={14} className="text-red-500" />
          <h3 className="text-xs font-bold text-slate-100">الإحصائيات الشخصية</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <Smartphone size={16} className="text-red-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">{sellerData.simsCount}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">إجمالي الشرائح</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <TrendingUp size={16} className="text-amber-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">{(sellerData.totalSales ?? sellerData.sales30Days ?? 0).toLocaleString()}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">إجمالي المبيعات</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <Layers size={16} className="text-blue-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">{sellerData.currentStock || 0}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">المخزون الحالي</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <Award size={16} className="text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">{sellerData.efficiency || 0}%</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">نسبة الكفاءة</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <TrendingUp size={16} className="text-purple-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">%{sellerData.salesGrowth || 0}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">نمو المبيعات</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <Activity size={16} className="text-cyan-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">%{sellerData.activityRate || 0}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">معدل النشاط</p>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800/60">
          <Activity size={14} className="text-red-500" />
          <h3 className="text-xs font-bold text-slate-100">الإجراءات</h3>
        </div>
        <div className="space-y-2">
          {/* Change Password Button */}
      <button
        type="button"
        onClick={() => setPasswordOpen(true)}
        className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
            <Lock size={18} />
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-100">تغيير كلمة المرور</p>
            <p className="text-[10px] text-slate-500 mt-0.5">تحديث كلمة المرور لحماية الحساب</p>
          </div>
        </div>
        <ChevronLeft size={16} className="text-slate-500 group-hover:text-slate-100 transition-colors" />
      </button>

      {/* Logout Button */}
      <button
        type="button"
        onClick={() => setLogoutConfirmOpen(true)}
        className="w-full flex items-center justify-between p-4 bg-red-950/20 border border-red-900/30 rounded-2xl hover:bg-red-950/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
            <LogOut size={18} />
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-red-400">تسجيل الخروج</p>
            <p className="text-[10px] text-slate-500 mt-0.5">إنهاء الجلسة الحالية</p>
          </div>
        </div>
        <ChevronLeft size={16} className="text-slate-500 group-hover:text-slate-100 transition-colors" />
      </button>

        </div>
      </div>



      {/* Logout Confirmation */}
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
              className="relative w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-slate-200 max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
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
                  <X size={15} />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-xs text-slate-300 leading-relaxed">
                  هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSellerConfirmLogout}
                  className="flex-1 py-3 bg-secondary hover:bg-red-750 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                >
                  تسجيل الخروج
                </button>
                <button
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-755 text-[#c0c6d1] font-medium rounded-xl border border-slate-700 transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
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
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-slate-200 max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Lock size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">تغيير كلمة المرور</h3>
                </div>
                <button
                  onClick={() => setPasswordOpen(false)}
                  className="p-2.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800/40 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePasswordChangeSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">كلمة المرور الحالية للتحقق</label>
                    <input
                      type="password"
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-red-500/40 transition-all"
                      dir="rtl"
                    />
                  </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-red-500/40 transition-all"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">تأكيد كلمة المرور</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-red-500/40 transition-all"
                    dir="rtl"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isChangingPass ? (
                      <span className="animate-spin text-white inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">check</span>
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

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        fontSize={fontSize}
        setFontSize={setFontSize}
        biometricEnabled={biometricEnabled}
        onToggleBiometric={handleToggleBiometric}
        biometricInAppearance={true}
        onChangePassword={() => { setSettingsOpen(false); setPasswordOpen(true); }}
        simNotifications={simNotifications}
        onToggleSimNotifications={handleToggleSimNotifications}
        lowStockNotifications={lowStockNotifications}
        onToggleLowStockNotifications={handleToggleLowStockNotifications}
        onLogout={() => { if (onConfirmLogout) onConfirmLogout(); else onLogout(); }}
      />

          </div>
  );
}
