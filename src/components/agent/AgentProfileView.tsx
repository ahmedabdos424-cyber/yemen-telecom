import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Role, OperatorInventory } from '../../types';
import {
  User, MapPin,
  Users, Layers, Package, TrendingUp, Target,
  Lock, LogOut, X, ChevronLeft, Eye, EyeOff,
  Settings
} from 'lucide-react';
import AgentSettingsModal from './AgentSettingsModal';
import ProfileAvatar from '../shared/ProfileAvatar';
import { useToast, ToastContainer } from '../../hooks/useToast';
import { api, type ApiMeResponse } from '../../api/client';
import type { BiometricToggleResult } from '../../services/biometricAuth';

interface AgentProfileViewProps {
  username: string;
  role: Role;
  sellersCount: number;
  inventories: OperatorInventory[];
  onLogout: () => void;
  onConfirmLogout?: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  biometricAvailable?: boolean;
  biometricEnabled?: boolean;
  onEnableBiometric?: () => Promise<BiometricToggleResult>;
  onDisableBiometric?: () => Promise<void>;
}

export default function AgentProfileView({
  username,
  sellersCount,
  inventories = [],
  onLogout,
  onConfirmLogout,
  darkMode,
  setDarkMode,
  biometricEnabled = false,
  onEnableBiometric,
  onDisableBiometric
}: AgentProfileViewProps) {
  const { toasts, dismissToast, toastSuccess, toastWarning } = useToast();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [, setPhotoModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [fontSize, setFontSizeState] = useState<'sm' | 'base' | 'lg'>(() => {
    return (localStorage.getItem('tele_font_size') as 'sm' | 'base' | 'lg') || 'base';
  });
  const [simNotifications, setSimNotifications] = useState<boolean>(true);
  const [lowStockNotifications, setLowStockNotifications] = useState<boolean>(true);

  useEffect(() => {
    api.getUserPreferences().then((prefs) => {
      setSimNotifications(prefs.simNotifications);
      setLowStockNotifications(prefs.lowStockNotifications);
      if (prefs.fontSize && ['sm', 'base', 'lg'].includes(prefs.fontSize)) {
        setFontSizeState(prefs.fontSize as 'sm' | 'base' | 'lg');
      }
    }).catch(() => {});
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [agentPhoto, setAgentPhoto] = useState('');

  // Real profile data from /auth/me (region, phone, status, registration date)
  const [profile, setProfile] = useState<ApiMeResponse | null>(null);
  useEffect(() => {
    let mounted = true;
    api.getMe().then((me) => { if (mounted) setProfile(me); }).catch(() => { /* non-fatal: keep placeholders */ });
    return () => { mounted = false; };
  }, []);

  const totalSimsReceived = inventories.reduce((acc, inv) => acc + inv.available + inv.remaining, 0);
  const totalRemaining = inventories.reduce((acc, inv) => acc + inv.remaining, 0);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) { setPasswordError('الرجاء إدخال كلمة المرور الحالية'); return; }
    if (!newPassword) { setPasswordError('الرجاء إدخال كلمة المرور الجديدة'); return; }
    if (newPassword.length < 6) { setPasswordError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين'); return; }

    try {
      await api.updatePassword(currentPassword, newPassword);
      toastSuccess('تم تغيير كلمة المرور بنجاح');
      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeletePhoto = () => {
    setAgentPhoto('');
    setPhotoModalOpen(false);
  };

  const handleConfirmLogout = () => {
    setLogoutConfirmOpen(false);
    if (onConfirmLogout) {
      onConfirmLogout();
    } else {
      onLogout();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 font-sans pb-24 px-3 sm:px-4" dir="rtl">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Page Header */}
      <div className="card text-center relative overflow-hidden px-4 py-6 sm:px-6">
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-r from-red-950/20 to-transparent" />
        {/* Header Actions: Dark Mode + Settings */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-all"
          >
            <span className="material-symbols-outlined text-lg">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-all"
          >
            <Settings size={18} />
          </button>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <ProfileAvatar
            photo={agentPhoto}
            name={username}
            onPhotoChange={(dataUrl) => { setAgentPhoto(dataUrl); setPhotoModalOpen(false); }}
            onPhotoDelete={handleDeletePhoto}
            size={120}
            className="mb-4"
          />
          <h2 className="text-xl font-bold text-slate-100">{username}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <MapPin size={12} className="text-slate-500" />
            <span className="text-xs text-slate-400">منطقة: {profile?.region || 'غير محددة'}</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {profile?.status === 'active' ? 'نشط' : profile?.status === 'inactive' ? 'غير نشط' : '—'}
          </div>
        </div>
      </div>

      {/* Basic Data Card */}
      <div className="card p-4 sm:p-5">
         <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800/60">
           <User size={14} className="text-ym" />
           <h3 className="text-xs font-bold text-slate-100">البيانات الأساسية</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">الاسم</span>
            <p className="text-slate-100 font-bold mt-1 truncate">{username}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">رقم الهوية</span>
            <p className="text-slate-500 font-mono font-bold mt-1">—</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">رقم التواصل</span>
            <p className="text-slate-100 font-mono font-bold mt-1" dir="ltr">{profile?.phone || '—'}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">الموقع</span>
            <p className="text-slate-100 font-bold mt-1">{profile?.region || '—'}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">تاريخ التسجيل</span>
            <p className="text-slate-100 font-bold mt-1">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ar') : '—'}</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-3 sm:p-4">
            <span className="text-slate-500 text-[10px]">اسم المستخدم</span>
            <p className="text-slate-100 font-mono font-bold mt-1 truncate bg-slate-950 px-2 py-1 rounded border border-slate-800 inline-block">{username}</p>
          </div>
        </div>
      </div>

      {/* Personal Stats Card */}
      <div className="card p-4 sm:p-5">
         <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800/60">
            <TrendingUp size={14} className="text-ym" />
          <h3 className="text-xs font-bold text-slate-100">الإحصائيات الشخصية</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <Users size={16} className="text-ym mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">{sellersCount}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">البائعين التابعين</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <Layers size={16} className="text-amber-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">{totalSimsReceived}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">إجمالي الشرائح</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <Package size={16} className="text-blue-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">{totalRemaining}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">المتبقي بالمخزون</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center">
            <TrendingUp size={16} className="text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">—</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">إجمالي المبيعات</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3 sm:p-4 text-center col-span-2 sm:col-span-1">
            <Target size={16} className="text-purple-500 mx-auto mb-1.5" />
            <p className="text-xl sm:text-2xl font-bold text-slate-100">—</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-tight">عدد العملاء</p>
          </div>
        </div>
      </div>

       {/* Change Password Button */}
       <button
         type="button"
         onClick={() => setPasswordModalOpen(true)}
         className="card w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="btn-icon rounded-xl bg-amber-600/10 border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
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
        className="card w-full flex items-center justify-between p-4 bg-red-950/20 border-red-900/30 hover:bg-red-950/40 transition-all group"
       >
         <div className="flex items-center gap-3">
            <div className="btn-icon rounded-xl bg-op-ym-light border-op-ym/20 flex items-center justify-center text-ym group-hover:scale-105 transition-transform">
             <LogOut size={18} />
           </div>
           <div className="text-right">
             <p className="text-sm font-bold text-red-400">تسجيل الخروج</p>
             <p className="text-[10px] text-slate-500 mt-0.5">إنهاء الجلسة الحالية</p>
           </div>
         </div>
          <ChevronLeft size={16} className="text-slate-500 group-hover:text-slate-100 transition-colors" />
         </button>

      {/* Change Password Modal */}
      <AnimatePresence>
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تغيير كلمة المرور">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPasswordModalOpen(false)}
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
                  <div className="btn-icon rounded-lg bg-amber-600/10 border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Lock size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">تغيير كلمة المرور</h3>
                </div>
                <button
                  onClick={() => setPasswordModalOpen(false)}
                  className="p-2.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800/40 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400">كلمة المرور الحالية</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500 transition-colors font-sans"
                      placeholder="..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-100 cursor-pointer"
                    >
                      {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500 transition-colors font-sans"
                      placeholder="..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-100 cursor-pointer"
                    >
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400">تأكيد كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500 transition-colors font-sans"
                      placeholder="..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-100 cursor-pointer"
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <p className="text-red-400 text-[10px] font-bold">{passwordError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="btn btn-sm flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                   >
                     حفظ
                   </button>
                   <button
                     type="button"
                     onClick={() => setPasswordModalOpen(false)}
                     className="btn btn-sm btn-ghost flex-1 text-slate-300"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      <AgentSettingsModal
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        fontSize={fontSize}
        setFontSize={setFontSize}
        simNotifications={simNotifications}
        handleToggleSimNotifications={handleToggleSimNotifications}
        lowStockNotifications={lowStockNotifications}
        handleToggleLowStockNotifications={handleToggleLowStockNotifications}
        onLogout={onLogout}
        onConfirmLogout={onConfirmLogout}
        handleConfirmLogout={handleConfirmLogout}
        username={username}
        biometricEnabled={biometricEnabled}
        handleToggleBiometric={handleToggleBiometric}
        biometricInAppearance={true}
      />

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
              className="relative w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-slate-200 max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="btn-icon rounded-lg bg-op-ym-light border-op-ym/20 flex items-center justify-center text-ym">
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
                  onClick={handleConfirmLogout}
                  className="btn flex-1 bg-op-ym hover:bg-op-ym/90 text-white shadow-md text-center"
                 >
                   تسجيل الخروج
                 </button>
                 <button
                   onClick={() => setLogoutConfirmOpen(false)}
                   className="btn btn-ghost flex-1 text-slate-300 text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
  );
}
