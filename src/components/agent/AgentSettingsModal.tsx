import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, X, Palette, Sun, Moon, Type, Shield, ShieldAlert, Fingerprint,
  User, Cpu, Bell, ChevronLeft, LogOut
} from 'lucide-react';

interface AgentSettingsModalProps {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  fontSize: 'sm' | 'base' | 'lg';
  setFontSize: (size: 'sm' | 'base' | 'lg') => void;
  simNotifications: boolean;
  handleToggleSimNotifications: () => void;
  lowStockNotifications: boolean;
  handleToggleLowStockNotifications: () => void;
  onLogout?: () => void;
  onConfirmLogout?: () => void;
  handleConfirmLogout?: () => void;
  logoutConfirmOpen: boolean;
  setLogoutConfirmOpen: (open: boolean) => void;
  username: string;
  biometricEnabled?: boolean;
  handleToggleBiometric?: () => void;
}

export default function AgentSettingsModal({
  settingsOpen,
  setSettingsOpen,
  darkMode,
  setDarkMode,
  fontSize,
  setFontSize,
  simNotifications,
  handleToggleSimNotifications,
  lowStockNotifications,
  handleToggleLowStockNotifications,
  onLogout,
  onConfirmLogout,
  handleConfirmLogout,
  logoutConfirmOpen,
  setLogoutConfirmOpen,
  username,
  biometricEnabled,
  handleToggleBiometric
}: AgentSettingsModalProps) {
  return (
    <>
      {/* Settings Modal ("إعدادات الحساب") */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="إعدادات الحساب">
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
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-200 z-10 max-h-[85vh] overflow-y-auto custom-scrollbar"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-650/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <Settings size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white font-sans">إعدادات الحساب</h3>
                </div>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800/40 rounded-full transition-colors cursor-pointer"
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
                          type="button"
                          onClick={() => setDarkMode(false)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all ${!darkMode ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                          <Sun size={12} />
                          <span>فاتح</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDarkMode(true)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all ${darkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' : 'text-slate-400 hover:text-white'}`}
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
                          type="button"
                          onClick={() => setFontSize('sm')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${fontSize === 'sm' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                        >
                          صغير (A-)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSize('base')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${fontSize === 'base' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                        >
                          متوسط (A)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSize('lg')}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${fontSize === 'lg' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                        >
                          كبير (A+)
                        </button>
                      </div>
                    </div>

                    {/* بصمة الدخول */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-900/60">
                      <div className="flex items-center gap-3 ml-2">
                        <span className="text-slate-400"><Fingerprint size={14} /></span>
                        <div>
                          <span className="text-xs font-bold text-slate-100">بصمة الدخول</span>
                          <p className="text-[9px] text-slate-500">تسجيل الدخول ببصمة الإصبع بدلاً من كلمة المرور</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={biometricEnabled ?? false}
                          onChange={handleToggleBiometric ?? (() => {})}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2.5px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-650"></div>
                      </label>
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
                    {/* Secure Logout action */}
                    <button
                      type="button"
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
                          <p className="text-xs font-bold text-white">تسجيل الخروج الآمن</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">إنهاء الجلسة وحذف مصادقة الاتصال مؤقتاً</p>
                        </div>
                      </div>
                      <ChevronLeft size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>

                {/* 3. الإشعارات */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Bell size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">تفصيلات الإشعارات</span>
                  </div>
                  
                  <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-4">
                    {/* SIM Distribution notifications */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 ml-2 text-right">
                        <p className="text-xs font-bold text-white">إشعارات توزيع الشرائح</p>
                        <p className="text-[9px] text-slate-500">استلام تنبيه فوري فور ترحيل وتوزيع الشرائح التلقائي للبائعين</p>
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
                        <p className="text-xs font-bold text-white">إشعارات المخزون المنخفض</p>
                        <p className="text-[9px] text-slate-500">التنبيه المسبق عند انخفاض الرصيد العام المشترك للوكالة عن نسبة 10%</p>
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

                {/* 4. معلومات التطبيق */}
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

                {/* 5. تسجيل الخروج السريع */}
                <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setLogoutConfirmOpen(true);
                    }}
                    className="w-full py-3 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white border border-secondary/25 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <LogOut size={13} />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                  <button
                    type="button"
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
                  <h3 className="text-sm font-bold text-white">تسجيل الخروج</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="p-1 text-slate-500 hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={15} />
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
                  type="button"
                  onClick={() => {
                    setLogoutConfirmOpen(false);
                    if (handleConfirmLogout) {
                      handleConfirmLogout();
                    } else if (onConfirmLogout) {
                      onConfirmLogout();
                    } else if (onLogout) {
                      onLogout();
                    }
                  }}
                  className="flex-1 py-3 bg-secondary hover:bg-red-750 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                >
                  تسجيل الخروج
                </button>
                <button
                  type="button"
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
    </>
  );
}
