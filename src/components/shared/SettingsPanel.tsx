import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, X, Palette, Sun, Moon, Type, Shield, ShieldAlert, Fingerprint,
  User, Cpu, Bell, ChevronLeft, LogOut, Lock, RefreshCw, Download, AlertCircle
} from 'lucide-react';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { APP_VERSION, APP_VERSION_CODE } from '../../version';

interface AccountInfoItem {
  label: string;
  value: string | number;
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  fontSize: 'sm' | 'base' | 'lg';
  setFontSize: (v: 'sm' | 'base' | 'lg') => void;
  biometricEnabled?: boolean;
  onToggleBiometric?: () => void;
  biometricInAppearance?: boolean;
  onChangePassword?: () => void;
  accountInfo?: AccountInfoItem[];
  simNotifications: boolean;
  onToggleSimNotifications: () => void;
  lowStockNotifications: boolean;
  onToggleLowStockNotifications: () => void;
  simNotificationDesc?: string;
  lowStockNotificationDesc?: string;
  onLogout: () => void;
}

export default function SettingsPanel({
  open,
  onClose,
  darkMode,
  setDarkMode,
  fontSize,
  setFontSize,
  biometricEnabled,
  onToggleBiometric,
  biometricInAppearance,
  onChangePassword,
  accountInfo,
  simNotifications,
  onToggleSimNotifications,
  lowStockNotifications,
  onToggleLowStockNotifications,
  simNotificationDesc = 'استلام تنبيه فوري فور ترحيل وتوزيع الشرائح التلقائي للبائعين',
  lowStockNotificationDesc = 'التنبيه المسبق عند انخفاض الرصيد العام المشترك للوكالة عن نسبة 10%',
  onLogout,
}: SettingsPanelProps) {
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { checking, updateInfo, downloading, progress, error, checkForUpdates, startUpdate, resetError } = useAppUpdate();

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="إعدادات الحساب">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
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
                  onClick={onClose}
                  className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-800/40 rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className={`space-y-6 ${fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'}`}>

                {/* 1. المظهر والتخصيص */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Palette size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">المظهر والتخصيص</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-4">
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

                    {biometricInAppearance && biometricEnabled !== undefined && onToggleBiometric && (
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
                            checked={biometricEnabled}
                            onChange={onToggleBiometric}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2.5px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-650"></div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. الأمان والحساب */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Shield size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">الأمان والحساب</span>
                  </div>

                  <div className="space-y-2">
                    {onChangePassword && (
                      <button
                        type="button"
                        onClick={onChangePassword}
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
                    )}

                    <button
                      type="button"
                      onClick={() => { onClose(); setLogoutConfirmOpen(true); }}
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

                    {!biometricInAppearance && biometricEnabled !== undefined && onToggleBiometric && (
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
                            onChange={onToggleBiometric}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2.5px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-650"></div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. معلومات الحساب (optional) */}
                {accountInfo && accountInfo.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                      <User size={14} className="text-red-500" />
                      <span className="text-[11px] font-bold tracking-wider">معلومات الحساب</span>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-3 text-xs">
                      {accountInfo.map((item, idx) => (
                        <div key={idx} className={`flex justify-between items-center ${idx < accountInfo.length - 1 ? 'border-b border-slate-900 pb-2' : ''}`}>
                          <span className="text-slate-400 font-medium">{item.label}</span>
                          <span className="text-slate-100 font-bold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. الإشعارات */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Bell size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">تفصيلات الإشعارات</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 ml-2 text-right">
                        <p className="text-xs font-bold text-slate-100">إشعارات توزيع الشرائح</p>
                        <p className="text-[9px] text-slate-500">{simNotificationDesc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simNotifications}
                          onChange={onToggleSimNotifications}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2.5px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-650"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/60 pt-4">
                      <div className="space-y-0.5 ml-2 text-right">
                        <p className="text-xs font-bold text-slate-100">إشعارات المخزون المنخفض</p>
                        <p className="text-[9px] text-slate-500">{lowStockNotificationDesc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lowStockNotifications}
                          onChange={onToggleLowStockNotifications}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:right-[2.5px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-650"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 5. معلومات التطبيق */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800/60 pb-1.5">
                    <Cpu size={14} className="text-red-500" />
                    <span className="text-[11px] font-bold tracking-wider">معلومات التطبيق النظامية</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">إصدار التطبيق</span>
                      <span className="text-slate-200 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">v{APP_VERSION}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">كود الإصدار</span>
                      <span className="text-slate-200 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{APP_VERSION_CODE}</span>
                    </div>

                    {/*
                    <div className="pt-2 border-t border-slate-900/60">
                      <button
                        type="button"
                        onClick={() => checkForUpdates(true)}
                        disabled={checking || downloading}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/30 text-slate-200 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checking ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>جاري التحقق من التحديثات...</span>
                          </>
                        ) : updateInfo ? (
                          <>
                            <AlertCircle size={12} className="text-amber-500" />
                            <span>إصدار جديد متاح: v{updateInfo.version}</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={12} />
                            <span>التحقق من التحديثات</span>
                          </>
                        )}
                      </button>
                    </div>

                    {updateInfo && !downloading && (
                      <div className="pt-2 border-t border-slate-900/60 space-y-2">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs">
                          <div className="flex items-center gap-2 text-amber-500 mb-1">
                            <AlertCircle size={12} />
                            <span className="font-bold">تحديث متاح</span>
                            {updateInfo.required && <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-bold">إجباري</span>}
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <p className="font-medium">v{updateInfo.version} (كود {updateInfo.versionCode})</p>
                            <p>الحجم: {(updateInfo.size / 1024 / 1024).toFixed(1)} MB</p>
                            {updateInfo.notes.length > 0 && (
                              <ul className="list-disc list-inside space-y-0.5">
                                {updateInfo.notes.slice(0, 3).map((note, i) => (
                                  <li key={i}>{note}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={startUpdate}
                            disabled={downloading}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-650/15 border border-red-500/30 hover:bg-red-650/25 text-red-400 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {downloading ? (
                              <>
                                <Download size={12} className="animate-spin" />
                                <span>جاري التنزيل... {progress}%</span>
                              </>
                            ) : (
                              <>
                                <Download size={12} />
                                <span>تنزيل وتثبيت التحديث</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {downloading && (
                      <div className="pt-2 border-t border-slate-900/60 space-y-2">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs">
                          <div className="flex items-center gap-2 text-blue-500 mb-1">
                            <Download size={12} className="animate-spin" />
                            <span className="font-bold">جاري تنزيل التحديث...</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-slate-400 text-right mt-1">{progress}% مكتمل</p>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="pt-2 border-t border-slate-900/60">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                          <AlertCircle size={12} />
                          <span>{error}</span>
                        </div>
                      </div>
                    )} */}

                    <div className="pt-2 border-t border-slate-900/60">
                      <button
                        type="button"
                        onClick={() => checkForUpdates(true)}
                        disabled={checking || downloading}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/30 active:scale-98 transition-all group text-right"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                            {checking ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : updateInfo ? (
                              <AlertCircle size={14} className="text-amber-500" />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-100">
                              {checking ? 'جاري التحقق من التحديثات...' : updateInfo ? `إصدار جديد متاح: v${updateInfo.version}` : 'التحقق من التحديثات'}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              {checking ? 'الرجاء الانتظار' : updateInfo ? `كود الإصدار: ${updateInfo.versionCode} | الحجم: ${(updateInfo.size / 1024 / 1024).toFixed(1)} MB` : 'البحث عن أحدث إصدار متاح'}
                            </p>
                          </div>
                        </div>
                        <ChevronLeft size={14} className="text-slate-500 group-hover:text-slate-100 transition-colors" />
                      </button>
                    </div>

                    {updateInfo && !downloading && (
                      <div className="pt-2 border-t border-slate-900/60 space-y-2">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs">
                          <div className="flex items-center gap-2 text-amber-500 mb-1">
                            <AlertCircle size={12} />
                            <span className="font-bold">تحديث متاح</span>
                            {updateInfo.required && <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-bold">إجباري</span>}
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <p className="font-medium">v{updateInfo.version} (كود {updateInfo.versionCode})</p>
                            <p>الحجم: {(updateInfo.size / 1024 / 1024).toFixed(1)} MB</p>
                            {updateInfo.notes.length > 0 && (
                              <ul className="list-disc list-inside space-y-0.5">
                                {updateInfo.notes.slice(0, 3).map((note, i) => (
                                  <li key={i}>{note}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={startUpdate}
                            disabled={downloading}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-650/15 border border-red-500/30 hover:bg-red-650/25 text-red-400 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {downloading ? (
                              <>
                                <Download size={12} className="animate-spin" />
                                <span>جاري التنزيل... {progress}%</span>
                              </>
                            ) : (
                              <>
                                <Download size={12} />
                                <span>تنزيل وتثبيت التحديث</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {downloading && (
                      <div className="pt-2 border-t border-slate-900/60 space-y-2">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs">
                          <div className="flex items-center gap-2 text-blue-500 mb-1">
                            <Download size={12} className="animate-spin" />
                            <span className="font-bold">جاري تنزيل التحديث...</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-slate-400 text-right mt-1">{progress}% مكتمل</p>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="pt-2 border-t border-slate-900/60">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                          <AlertCircle size={12} />
                          <span>{error}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. تسجيل الخروج السريع */}
                <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { onClose(); setLogoutConfirmOpen(true); }}
                    className="w-full py-3 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white border border-secondary/25 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <LogOut size={13} />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
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
                  className="p-2.5 text-slate-500 hover:text-white rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                  type="button"
                  onClick={() => { setLogoutConfirmOpen(false); onLogout(); }}
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
