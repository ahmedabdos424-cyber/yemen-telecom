import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller } from '../types';
import { Check, Camera, RefreshCw, Lock, MapPin, Phone, CreditCard, ShoppingBag, User, X, Eye, EyeOff, Copy, CircleCheck } from 'lucide-react';
import CameraCapture from './shared/CameraCapture';
import { useOcr } from '../hooks/useOcr';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';

interface AddSellerFormProps {
  onSellerAdded: (newSeller: Omit<Seller, 'id' | 'creationDate' | 'lastLogin'>) => void;
  agentName?: string;
}

export default function AddSellerForm({ onSellerAdded, agentName }: AddSellerFormProps) {
  const [fullName, setFullName] = useState('');
  const [nameCaptured, setNameCaptured] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentialsData, setCredentialsData] = useState<{ username: string; password: string } | null>(null);
  const [progressStage, setProgressStage] = useState<'idle' | 25 | 50 | 75 | 100>('idle');
  const { recognize, progress: ocrProgress } = useOcr();
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning } = useToast();

  const handleNameCapture = useCallback(async (imageData: string) => {
    const name = await recognize(imageData);
    if (name) {
      setFullName(name);
    }
    setNameCaptured(imageData);
  }, [recognize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toastWarning('الرجاء كتابة الاسم الكامل للبائع');
      return;
    }
    if (!username.trim()) {
      toastWarning('الرجاء كتابة اسم المستخدم الجديد للبائع');
      return;
    }
    if (!password.trim()) {
      toastWarning('الرجاء تعيين كلمة المرور للبائع');
      return;
    }
    if (!storeName.trim()) {
      toastWarning('الرجاء كتابة اسم المحل أو المركز');
      return;
    }
    if (!idNumber.trim()) {
      toastWarning('الرجاء التقاط صورة الهوية أو إدخال رقم الهوية الوطنية / الإقامة');
      return;
    }
    if (!phone.trim()) {
      toastWarning('الرجاء إدخال رقم الهاتف الجوال للبائع');
      return;
    }
    if (!region.trim()) {
      toastWarning('الرجاء إدخال المنطقة أو النطاق والتغطية الجغرافية للمحل');
      return;
    }

    setIsSubmitting(true);
    setProgressStage(25);

    try {
      const result = await api.createSeller({
        name: fullName,
        username,
        password,
        agent_name: agentName,
        storeName,
        idNumber,
        phone,
        region,
        regionCode: region.substring(0, 5),
      });

      setProgressStage(100);
      setIsSubmitting(false);

      const creds = result.credentials || { username, password };
      setShowCredentials(true);
      setCredentialsData(creds);
      setSuccessInfo(`تم إنشاء حساب البائع "${fullName}" بنجاح.`);

      onSellerAdded({
        name: fullName,
        username: creds.username,
        password: creds.password,
        agent_name: agentName,
        storeName,
        idNumber,
        phone,
        region,
        regionCode: region.substring(0, 5),
        status: 'active',
        totalSales: 0,
        currentStock: 0,
        efficiency: 0,
        avatar: '',
        simsCount: 0,
        sales30Days: 0,
        salesGrowth: 0,
        activityRate: 0
      });

      setFullName('');
      setNameCaptured(null);
      setUsername('');
      setPassword('');
      setStoreName('');
      setIdNumber('');
      setPhone('');
      setRegion('');
    } catch (err: any) {
      setIsSubmitting(false);
      setProgressStage('idle');
      toastError(err?.message || 'فشل إنشاء البائع. الرجاء المحاولة مرة أخرى.');
    }
  };

  return (
    <div dir="rtl" className="card w-full max-w-2xl mx-auto p-6 text-slate-100 font-sans" id="add-seller-form-container">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 mb-6" id="add-seller-header">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500">person_add</span>
          بيانات حساب البائع الجديد
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" id="add-seller-form-element">
        {/* Name Field */}
        <div className="flex flex-col gap-2" id="fullname-field-group">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="full_name">
            <User size={14} className="text-slate-500" />
            الاسم الكامل للبائع
          </label>
          <div className="relative">
            <input
              type="text"
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="اسم البائع"
              className="input-field pl-12 bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
            />
            <CameraCapture onCapture={handleNameCapture} />
          </div>
          <AnimatePresence>
            {nameCaptured && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={12} /> تم التقاط صورة الهوية
              </motion.span>
            )}
          </AnimatePresence>

          {ocrProgress.visible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
                <RefreshCw size={32} className="mx-auto text-amber-400 mb-4 animate-spin" />
                <p className="text-xs text-slate-200 mb-3 font-semibold">{ocrProgress.stage}</p>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ocrProgress.progress}%` }}
                    className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">{Math.round(ocrProgress.progress)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Username & Password Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="credentials-fields-group">
          <div className="flex flex-col gap-2" id="username-subgroup">
            <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="username">
              <User size={14} className="text-slate-500" />
              اسم المستخدم الجديد للبائع
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="اسم المستخدم"
              className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
            />
          </div>

          <div className="flex flex-col gap-2 relative text-right font-sans" id="password-subgroup">
            <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="password">
              <Lock size={14} className="text-slate-500" />
              كلمة المرور للحساب
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                className="input-field pl-10 bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-100 touch-target flex items-center justify-center"
                id="toggle-password-visibility-btn"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Store Name Field */}
        <div className="flex flex-col gap-2" id="storename-field-group">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="store_name">
            <ShoppingBag size={14} className="text-slate-500" />
            اسم المحل / المركز التجاري
          </label>
          <input
            type="text"
            id="store_name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="اسم المحل / المركز"
            className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
          />
        </div>

        {/* ID Number - Simplified text input (camera removed) */}
        <div className="flex flex-col gap-2" id="idnumber-field-group">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="id_number">
            <CreditCard size={14} className="text-slate-500" />
            رقم الهوية الوطنية / الإقامة للبائع
          </label>
          <input
            type="text"
            id="id_number"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="xxxxxxxxxx"
            inputMode="numeric"
            className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700 font-sans"
          />
        </div>

        {/* Phone Number */}
        <div className="flex flex-col gap-2" id="phone-field-group">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="phone">
            <Phone size={14} className="text-slate-500" />
            رقم الهاتف الجوال للبائع
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="7xxxxxx"
            className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700 font-sans"
          />
        </div>

        {/* Region Input Field - TEXT INPUT INSTEAD OF SELECT DROP DOWN */}
        <div className="flex flex-col gap-2" id="region-field-group">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="region">
            <MapPin size={14} className="text-slate-500" />
            المنطقة / النطاق والتغطية الجغرافية للمحل
          </label>
          <input
            type="text"
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="المدينة / المنطقة"
            className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
          />
        </div>

        {/* Submission Progress Bar — hidden until submit */}
        {isSubmitting && (
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-slate-500 font-medium">
                {progressStage === 25 ? 'تجهيز الطلب...' :
                 progressStage === 50 ? 'إنشاء حساب المستخدم...' :
                 progressStage === 75 ? 'إنشاء ملف البائع...' :
                 'اكتمل بنجاح'}
              </span>
              <span className="text-[10px] font-bold text-emerald-400">{progressStage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressStage}%` }}
                className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full"
              />
            </div>
            {progressStage !== 100 && (
              <div className="mt-2 flex items-center gap-2">
                <RefreshCw size={10} className="animate-spin text-emerald-400" />
                <span className="text-[9px] text-emerald-500">
                  {progressStage === 25 ? 'جاري تجهيز البيانات...' :
                   progressStage === 50 ? 'جاري إنشاء حساب المستخدم...' :
                   'جاري ربط ملف البائع...'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Form Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm"
          id="add-seller-submit-btn"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="animate-spin text-white" size={16} />
              <span>جاري حفظ الحساب وإرسال الإشعار للشبكات التابعة...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>إنشاء حساب بائع معتمد جديد</span>
            </>
          )}
        </button>
      </form>

      {/* Credentials Success Dialog */}
      <AnimatePresence>
        {showCredentials && credentialsData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm md:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-right max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CircleCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">تم إنشاء الحساب بنجاح</h3>
                  <p className="text-[10px] text-slate-400">يرجى حفظ بيانات الاعتماد أدناه</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">اسم المستخدم</span>
                    <span className="text-xs font-bold text-slate-100 font-mono" dir="ltr">{credentialsData.username}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/40">
                    <span className="text-[11px] text-slate-400">كلمة المرور</span>
                    <span className="text-xs font-bold text-amber-400 font-mono" dir="ltr">{credentialsData.password}</span>
                  </div>
                </div>
                <p className="text-[9px] text-amber-500/80 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  يرجى تسليم بيانات الدخول هذه للبائع الجديد وحفظها بشكل آمن
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `اسم المستخدم: ${credentialsData.username}\nكلمة المرور: ${credentialsData.password}`
                      );
                      toastSuccess('تم نسخ بيانات الدخول بنجاح');
                    } catch {
                      toastError('تعذر النسخ - الرجاء نسخ البيانات يدوياً');
                    }
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Copy size={14} />
                  نسخ البيانات
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCredentials(false); setProgressStage('idle'); }}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
