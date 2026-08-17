import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RefreshCw, Lock, MapPin, Phone, CreditCard, ShoppingBag, User, Eye, EyeOff } from 'lucide-react';
import CameraCapture from './shared/CameraCapture';
import { useOcr } from '../hooks/useOcr';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';
import type { CreateSellerResponse } from '../api/types';

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(',');
  const mime = (meta.match(/data:(.*?)(;|$)/) || [])[1] || 'image/jpeg';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

interface AddSellerFormProps {
  onSellerAdded: (result: CreateSellerResponse) => void;
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
  const [progressStage, setProgressStage] = useState<'idle' | 25 | 50 | 75 | 100>('idle');
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const { recognize, progress: ocrProgress } = useOcr();
  const { toasts, dismissToast, toastError, toastWarning } = useToast();

  const handleNameCapture = useCallback(async (imageData: string) => {
    const name = await recognize(imageData);
    if (name) {
      setFullName(name);
    }
    setNameCaptured(imageData);
    setIdPhoto(imageData);
  }, [recognize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toastWarning('الرجاء كتابة الاسم الكامل للبائع');
      return;
    }
    if (!nameCaptured) {
      toastWarning('الرجاء التقاط صورة الهوية للبائع — صورة الهوية إلزامية لتسجيل البائع.');
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
      // Upload the captured ID document (if any) so it is persisted as the
      // seller's avatar and shown in the sellers report.
      let avatar: string | undefined;
      if (idPhoto && idPhoto.startsWith('data:')) {
        try {
          const uploaded = await api.uploadFile(dataUrlToFile(idPhoto, `id_${Date.now()}.jpg`), 'image');
          avatar = uploaded.url;
        } catch {
          // Non-fatal: proceed without the image if upload fails.
        }
      }

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
        avatar,
        id_document: avatar,
      });

      onSellerAdded(result);

      setProgressStage(100);
      setIsSubmitting(false);

      setFullName('');
      setNameCaptured(null);
      setUsername('');
      setPassword('');
      setStoreName('');
      setIdNumber('');
      setPhone('');
      setRegion('');
    } catch (err: unknown) {
      setIsSubmitting(false);
      setProgressStage('idle');
      toastError(err instanceof Error ? err.message : String(err));
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
                autoFocus
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
            onChange={(e) => setIdNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))}
            placeholder="رقم الهوية الوطنية أو الإقامة"
            maxLength={20}
            required
            className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700 font-sans"
            dir="ltr"
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
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
            placeholder="7xxxxxx"
            pattern="[0-9]{7,9}"
            className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700 font-sans"
            dir="ltr"
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
          disabled={isSubmitting || !nameCaptured}
          className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
