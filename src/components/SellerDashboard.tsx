import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller, Operation, Sim } from '../types';
import { api } from '../api/client';
import { useToast, ToastContainer } from '../hooks/useToast';
import SellerHome from './SellerHome';
import SellerAccount from './SellerAccount';
import SimsListView from './sims/SimsListView';
import SettingsPanel from './shared/SettingsPanel';
import type { BiometricToggleResult } from '../services/biometricAuth';
import {
  RefreshCw, Check, X
} from 'lucide-react';

interface SellerDashboardProps {
  sellerData: Seller;
  sims: Sim[];
  operations: Operation[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onConfirmLogout?: () => void;
  onPasswordChanged?: (newPass: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onUpdateSims?: (updated: Sim[]) => void;
  biometricAvailable?: boolean;
  biometricEnabled?: boolean;
  onEnableBiometric?: () => Promise<BiometricToggleResult>;
  onDisableBiometric?: () => Promise<void>;
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
  onUpdateSims,
  biometricAvailable = false,
  biometricEnabled = false,
  onEnableBiometric,
  onDisableBiometric
}: SellerDashboardProps) {
  
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning } = useToast();

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
      if (onPasswordChanged) onPasswordChanged(newPassword);
      setIdNumberEntry('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      toastSuccess('تم تحديث كلمة المرور الخاصة بك بنجاح!');
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsChangingPass(false);
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
          onConfirmLogout={onConfirmLogout ?? (() => {})}
          onLogout={onLogout}
          biometricAvailable={biometricAvailable}
          biometricEnabled={biometricEnabled}
          onEnableBiometric={onEnableBiometric}
          onDisableBiometric={onDisableBiometric}
        />
      )}

      {activeTab === 'my_sims' && (
        <SimsListView sims={sims} onUpdateSims={onUpdateSims} mode="seller" />
      )}

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
        accountInfo={[
          { label: 'اسم المستخدم', value: sellerData.name },
          { label: 'رقم الحساب', value: sellerData.id },
          { label: 'المنطقة الإقليمية', value: sellerData.region || '---' },
          { label: 'تاريخ إنشاء الحساب', value: sellerData.creationDate || '---' },
        ]}
        simNotifications={simNotifications}
        onToggleSimNotifications={handleToggleSimNotifications}
        lowStockNotifications={lowStockNotifications}
        onToggleLowStockNotifications={handleToggleLowStockNotifications}
        simNotificationDesc="مراقبة حصص وكميات الشرائح الإقليمية المكررة فورياً"
        lowStockNotificationDesc="التنبيه المسبق والإنذار المبكر الذكي للتوريد الفوري"
        onLogout={() => { if (onConfirmLogout) onConfirmLogout(); else onLogout(); }}
      />



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
