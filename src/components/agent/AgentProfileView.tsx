import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Role, OperatorInventory } from '../../types';
import {
  User, Shield, Calendar, Clock, Smartphone, MapPin,
  Users, Layers, Package, TrendingUp, Target, Camera,
  Lock, LogOut, X, Save, ChevronLeft, Eye, EyeOff,
  Image, Settings
} from 'lucide-react';
import AgentSettingsModal from './AgentSettingsModal';

interface AgentProfileViewProps {
  username: string;
  role: Role;
  sellersCount: number;
  inventories: OperatorInventory[];
  onLogout: () => void;
  onConfirmLogout?: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function AgentProfileView({
  username,
  role,
  sellersCount,
  inventories,
  onLogout,
  onConfirmLogout,
  darkMode,
  setDarkMode
}: AgentProfileViewProps) {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLogoutConfirmOpen, setSettingsLogoutConfirmOpen] = useState(false);

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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [agentPhoto, setAgentPhoto] = useState(
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC9hEiGBZLQzVZP4scYfo4sA80Ab8uKRYSP_bNQcLqRoHw4Q07TqXqRhc4tf_VN6dDT7rQDBO1BgNrEen7e8tNGT3o95su2G5mtFX7cjFo2-a7TpgqINjMwEygao3cgIyS24rfhdIip4JBZC3iQGMiEwtZaZRFf6MTaqnOuxp5Vt316wbaFNJ93vk8oE1fkjK-4P4-330UzYu28FQVb6yKEGG8KXvTC297y0K_P6zYIPvvn2Yi-p7wROhrchJY15Pdy0FoIZcH87v8'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSimsReceived = inventories.reduce((acc, inv) => acc + inv.available + inv.remaining, 0);
  const totalRemaining = inventories.reduce((acc, inv) => acc + inv.remaining, 0);
  const totalSales = 1248;
  const totalClients = 86;

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) { setPasswordError('الرجاء إدخال كلمة المرور الحالية'); return; }
    if (!newPassword) { setPasswordError('الرجاء إدخال كلمة المرور الجديدة'); return; }
    if (newPassword.length < 6) { setPasswordError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين'); return; }

    alert('تم تغيير كلمة المرور بنجاح');
    setPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setAgentPhoto(ev.target.result as string);
        setPhotoModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
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
    <div className="max-w-2xl mx-auto space-y-6 font-sans pb-24" dir="rtl">

      {/* Page Header */}
      <div className="card text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-red-950/20 to-transparent" />
        {/* Header Actions: Dark Mode + Settings */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
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
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-full border-4 border-slate-800 mx-auto mb-4 overflow-hidden shadow-xl shadow-black/30 relative">
            {agentPhoto ? (
              <img loading="lazy" src={agentPhoto} alt={username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <User size={32} className="text-slate-500" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setPhotoModalOpen(true)}
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-lg transition-all cursor-pointer z-10"
            >
              <Camera size={14} />
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-100">{username}</h2>
          <p className="text-xs text-op-ym font-bold mt-1">وكيل معتمد</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <MapPin size={12} className="text-slate-500" />
            <span className="text-xs text-slate-400">منطقة: عدن - كريتر</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            نشط
          </div>
        </div>
      </div>

      {/* Basic Data Card */}
      <div className="card p-5">
         <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/60">
           <User size={14} className="text-op-ym" />
          <h3 className="text-xs font-bold text-slate-100">البيانات الأساسية</h3>
        </div>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">اسم الوكيل</span>
            <span className="text-slate-100 font-bold">{username}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">رقم الهوية</span>
            <span className="text-slate-100 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">1092837465</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">رقم التواصل</span>
            <span className="text-slate-100 font-mono font-bold" dir="ltr">0501234512</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">الموقع</span>
            <span className="text-slate-100 font-bold">عدن - كريتر</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">تاريخ التسجيل</span>
            <span className="text-slate-100 font-bold">2024/02/10</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">آخر دخول</span>
            <span className="text-slate-100 font-bold">اليوم، 10:45 ص</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400">اسم المستخدم</span>
            <span className="text-slate-100 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{username}</span>
          </div>
        </div>
      </div>

      {/* Personal Stats Card */}
      <div className="card p-5">
         <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/60">
           <TrendingUp size={14} className="text-op-ym" />
          <h3 className="text-xs font-bold text-slate-100">الإحصائيات الشخصية</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-hide">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <Users size={16} className="text-op-ym mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-100">{sellersCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">البائعين التابعين</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <Layers size={16} className="text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-100">{totalSimsReceived}</p>
            <p className="text-[10px] text-slate-400 mt-1">إجمالي الشرائح</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <Package size={16} className="text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-100">{totalRemaining}</p>
            <p className="text-[10px] text-slate-400 mt-1">المتبقي بالمخزون</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <TrendingUp size={16} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-100">{totalSales.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">إجمالي المبيعات</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <Target size={16} className="text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-100">{totalClients}</p>
            <p className="text-[10px] text-slate-400 mt-1">عدد العملاء</p>
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
           <div className="btn-icon rounded-xl bg-op-ym-light border-op-ym/20 flex items-center justify-center text-op-ym group-hover:scale-105 transition-transform">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-slate-200"
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
                  className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800/40 rounded-full transition-colors cursor-pointer"
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

      {/* Photo Modal */}
      <AnimatePresence>
        {photoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPhotoModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-slate-200"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-100">الصورة الشخصية</h3>
                </div>
                <button
                  onClick={() => setPhotoModalOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800/40 rounded-full transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <div className="w-28 h-28 rounded-full border-4 border-slate-800 overflow-hidden shadow-lg">
                  {agentPhoto ? (
                    <img loading="lazy" src={agentPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <Image size={40} className="text-slate-500" />
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                <div className="w-full space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-sm w-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2"
                  >
                    <Camera size={14} />
                    <span>تغيير الصورة</span>
                  </button>
                  {agentPhoto && (
                    <button
                      type="button"
                      onClick={handleDeletePhoto}
                      className="btn btn-sm w-full bg-red-950/30 hover:bg-red-950/50 text-red-400 border-red-900/30"
                     >
                       حذف الصورة
                     </button>
                   )}
                   <button
                     type="button"
                     onClick={() => setPhotoModalOpen(false)}
                     className="btn btn-sm btn-ghost w-full text-slate-500 hover:text-slate-300"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
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
        logoutConfirmOpen={settingsLogoutConfirmOpen}
        setLogoutConfirmOpen={setSettingsLogoutConfirmOpen}
        username={username}
        biometricEnabled={biometricEnabled}
        handleToggleBiometric={handleToggleBiometric}
      />

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {logoutConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-slate-200"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="btn-icon rounded-lg bg-op-ym-light border-op-ym/20 flex items-center justify-center text-op-ym">
                     <LogOut size={14} />
                   </div>
                  <h3 className="text-sm font-bold text-slate-100">تسجيل الخروج</h3>
                </div>
                <button
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-100 rounded-full transition-colors cursor-pointer"
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
