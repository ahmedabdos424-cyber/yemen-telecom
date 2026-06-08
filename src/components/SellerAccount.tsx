import { useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller } from '../types';
import {
  User, MapPin, TrendingUp, Smartphone, Layers, Award, Activity, Lock, Camera,
  LogOut, ChevronLeft, X, Image, Clock, Settings
} from 'lucide-react';

interface SellerAccountProps {
  sellerData: Seller;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onPasswordChanged: (newPass: string) => void;
  onConfirmLogout: () => void;
  onLogout: () => void;
}

export default function SellerAccount({
  sellerData, darkMode, setDarkMode,
  onPasswordChanged, onConfirmLogout, onLogout
}: SellerAccountProps) {
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [idNumberEntry, setIdNumberEntry] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [sellerPhoto, setSellerPhoto] = useState(
    sellerData.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgz0srZX-fPTwrxphx6G-akOy2GKiaTrQYzHnp-47B3NYt2mOSmwRFetXfAXjkf47AGQwrVI7G6DK9bUagM6bRnQSANx7qimdKsdaA0EN8E6LCNHGgA8yQyx52j35ju6Koq_DAbeLPyKtMyX_V7FrARDH8pKlnSxB2D9iI7kriW-BylMZGFWZ513V_p0b7hFvnMxxpB13I9qjAgvyTY428duG4S_kNTi8m7wsUh-pcXE3VvCSRGQC5tXx87uBlg8XxFTURrPDKtKc'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSellerPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setSellerPhoto(ev.target.result as string);
        setPhotoModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

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

  const handlePasswordChangeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!idNumberEntry) return alert('الرجاء إدخال رقم الهوية الخاصة بك للتحقق');
    if (!newPassword || !confirmPassword) return alert('الرجاء تعبئة حقول كلمة المرور الجديدة');
    if (newPassword !== confirmPassword) return alert('كلمتا المرور غير متطابقتين، الرجاء التحقق');
    if (idNumberEntry !== sellerData.idNumber) return alert('رقم الهوية المدخل غير مطابق لهويتك المسجلة بالنظام');

    setIsChangingPass(true);
    setTimeout(() => {
      setIsChangingPass(false);
      onPasswordChanged(newPassword);
      setIdNumberEntry('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      alert('تم تحديث كلمة المرور الخاصة بك بنجاح!');
    }, 500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans pb-24" dir="rtl">

      {/* Page Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-red-950/20 to-transparent" />
        {/* Header Actions: Dark Mode */}
        <div className="absolute top-4 right-4 z-20">
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
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-full border-4 border-slate-800 mx-auto mb-4 overflow-hidden shadow-xl shadow-black/30 relative">
            {sellerPhoto ? (
              <img loading="lazy" src={sellerPhoto} alt={sellerData.name} className="w-full h-full object-cover" />
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
          <h2 className="text-xl font-bold text-slate-100">{sellerData.name}</h2>
          <p className="text-xs text-red-400 font-bold mt-1">بائع معتمد</p>
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/60">
          <User size={14} className="text-red-500" />
          <h3 className="text-xs font-bold text-slate-100">البيانات الأساسية</h3>
        </div>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">اسم البائع</span>
            <span className="text-slate-100 font-bold">{sellerData.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">اسم المحل</span>
            <span className="text-slate-100 font-bold">{sellerData.storeName || '---'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">رقم الهوية</span>
            <span className="text-slate-100 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{sellerData.idNumber || '---'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">رقم التواصل</span>
            <span className="text-slate-100 font-mono font-bold" dir="ltr">{sellerData.phone}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">المنطقة</span>
            <span className="text-slate-100 font-bold">{sellerData.region}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">تاريخ التسجيل</span>
            <span className="text-slate-100 font-bold">{sellerData.creationDate || '---'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-800/30">
            <span className="text-slate-400">آخر دخول</span>
            <span className="text-slate-100 font-bold">{sellerData.lastLogin || '---'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400">اسم المستخدم</span>
            <span className="text-slate-100 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{sellerData.username || sellerData.name}</span>
          </div>
        </div>
      </div>

      {/* Personal Stats Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/60">
          <TrendingUp size={14} className="text-red-500" />
          <h3 className="text-xs font-bold text-slate-100">الإحصائيات الشخصية</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-hide">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <Smartphone size={16} className="text-red-500 mx-auto mb-2" />
            <p className="stat-card-value text-slate-100">{sellerData.simsCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">إجمالي الشرائح</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <TrendingUp size={16} className="text-amber-500 mx-auto mb-2" />
            <p className="stat-card-value text-slate-100">{sellerData.totalSales?.toLocaleString() || sellerData.sales30Days}</p>
            <p className="text-[10px] text-slate-400 mt-1">إجمالي المبيعات</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <Layers size={16} className="text-blue-500 mx-auto mb-2" />
            <p className="stat-card-value text-slate-100">{sellerData.currentStock || 0}</p>
            <p className="text-[10px] text-slate-400 mt-1">المخزون الحالي</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <Award size={16} className="text-emerald-500 mx-auto mb-2" />
            <p className="stat-card-value text-slate-100">{sellerData.efficiency || 0}%</p>
            <p className="text-[10px] text-slate-400 mt-1">نسبة الكفاءة</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <TrendingUp size={16} className="text-purple-500 mx-auto mb-2" />
            <p className="stat-card-value text-slate-100">%{sellerData.salesGrowth || 0}</p>
            <p className="text-[10px] text-slate-400 mt-1">نمو المبيعات</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 text-center min-w-[140px] flex-shrink-0 snap-center">
            <Activity size={16} className="text-cyan-500 mx-auto mb-2" />
            <p className="stat-card-value text-slate-100">%{sellerData.activityRate || 0}</p>
            <p className="text-[10px] text-slate-400 mt-1">معدل النشاط</p>
          </div>
        </div>
      </div>

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
                  {sellerPhoto ? (
                    <img loading="lazy" src={sellerPhoto} alt="" className="w-full h-full object-cover" />
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
                  onChange={handleSellerPhotoChange}
                  className="hidden"
                />

                <div className="w-full space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Camera size={14} />
                    <span>تغيير الصورة</span>
                  </button>
                  {sellerPhoto && (
                    <button
                      type="button"
                      onClick={handleDeleteSellerPhoto}
                      className="w-full py-3 bg-red-950/30 hover:bg-red-950/50 text-red-400 font-bold text-xs rounded-xl transition-all cursor-pointer border border-red-900/30"
                    >
                      حذف الصورة
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPhotoModalOpen(false)}
                    className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-xs rounded-xl hover:bg-slate-800/40 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation */}
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
                  <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
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
                  onClick={handleSellerConfirmLogout}
                  className="flex-1 py-3 bg-[#b90e1a] hover:bg-red-750 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
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
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-slate-200"
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
                  className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800/40 rounded-full transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePasswordChangeSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">رقم الهوية للتحقق</label>
                  <input
                    type="text"
                    value={idNumberEntry}
                    onChange={(e) => setIdNumberEntry(e.target.value)}
                    placeholder="أدخل رقم هويتك"
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

    </div>
  );
}
