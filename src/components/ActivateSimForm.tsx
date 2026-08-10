import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Operator, simProvider } from '../types';
import { Check, Camera, RefreshCw, Save, Phone, User, CreditCard, Layers } from 'lucide-react';
import CameraCapture, { DocumentCapture } from './shared/CameraCapture';
import OperatorLogo from './shared/OperatorLogo';
import { useOcr } from '../hooks/useOcr';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';

interface ActivateSimFormProps {
  onSimActivated: (simData: {
    fullName: string;
    idNumber: string;
    iccid: string;
    phoneNumber: string;
    operator: Operator;
    contractImage?: string | null;
  }) => void;
}

export default function ActivateSimForm({ onSimActivated }: ActivateSimFormProps) {
  const [operator, setOperator] = useState<Operator>('yemen_mobile');
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [iccid, setIccid] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contractPhoto, setContractPhoto] = useState<string | null>(null);

  const [nameCaptured, setNameCaptured] = useState<string | null>(null);
  const [iccidCaptured, setIccidCaptured] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const { recognize, progress: ocrProgress } = useOcr();
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();

  const handleNameCapture = useCallback(async (imageData: string) => {
    const name = await recognize(imageData);
    if (name) {
      setFullName(name);
    }
    setNameCaptured(imageData);
  }, [recognize]);

  // Define brand colors dynamically
  const getBrandDetails = (op: Operator) => {
    switch (op) {
      case 'yemen_mobile':
        return {
          bgClass: 'bg-op-ym hover:bg-op-ym/90',
          ringClass: 'focus:border-op-ym focus:ring-op-ym',
          borderColor: 'border-op-ym',
          label: 'يمن موبايل'
        };
      case 'sabafon':
        return {
          bgClass: 'bg-op-sf hover:bg-op-sf/90',
          ringClass: 'focus:border-op-sf focus:ring-op-sf',
          borderColor: 'border-op-sf',
          label: 'سبأفون'
        };
      case 'you':
        return {
          bgClass: 'bg-op-you hover:bg-op-you/90 text-you-text',
          ringClass: 'focus:border-op-you focus:ring-op-you',
          borderColor: 'border-op-you',
          label: 'YOU'
        };
    }
  };

  const brand = getBrandDetails(operator);

  // Real camera capture handlers - replaced fake OCR/scanning

  const handleClear = () => {
    setFullName('');
    setNameCaptured(null);
    setIdNumber('');
    setIccid('');
    setIccidCaptured(null);
    setPhoneNumber('');
    setContractPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName) {
      toastWarning('الرجاء إدخال اسم العميل الكامل');
      return;
    }
    if (!idNumber) {
      toastWarning('الرجاء إدخال رقم الهوية للعميل');
      return;
    }
    if (!iccid) {
      toastWarning('الرجاء إدخال رقم شريحة الـ SIM (ICCID)');
      return;
    }
    if (!phoneNumber || phoneNumber.length !== 9) {
      toastWarning('الرجاء إدخال رقم هاتف صحيح مكون من 9 أرقام');
      return;
    }
    if (!contractPhoto) {
      toastWarning('الرجاء التقاط صورة العقد / المستند الثبوتي الموقع — الصورة إلزامية قبل تفعيل الشريحة.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSimActivated({
        fullName,
        idNumber,
        iccid,
        phoneNumber,
        operator,
        contractImage: contractPhoto,
      });

      setIsSubmitting(false);

      setSuccessMsg(`تهانينا! تم تفعيل الشريحة رقم (${iccid}) بنجاح للشبكة المحددة وعميلها المتربط.`);
      handleClear();
    } catch (err: unknown) {
      setIsSubmitting(false);
      toastError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-slate-100 font-sans">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* Form Header Title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">تفعيل شريحة جديدة</h2>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl flex items-start gap-3"
          >
             <Check className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-emerald-300 leading-relaxed">
              <span className="font-bold">تم التفعيل بنجاح:</span> {successMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Operator Carrier Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full mb-8">
        {/* Yemen Mobile */}
        <div 
          onClick={() => setOperator('yemen_mobile')}
          className={`relative flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.97] ${
            operator === 'yemen_mobile' 
              ? 'bg-op-ym border-op-ym shadow-lg scale-[1.02]' 
              : 'bg-slate-950 border-slate-800 hover:border-op-ym/60 hover:bg-op-ym-light/50'
           }`}
         >
            <OperatorLogo provider="yemen_mobile" size="md" />
           <span className={`text-[11px] sm:text-xs font-bold transition-colors duration-200 ${
             operator === 'yemen_mobile' ? 'text-white' : 'text-slate-100'
           }`}>يمن موبايل</span>
           {operator === 'yemen_mobile' && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-ym rounded-full flex items-center justify-center text-[10px] border-2 border-op-ym shadow">
               <Check size={10} strokeWidth={3} />
             </span>
          )}
        </div>

        {/* Sabafon */}
        <div 
          onClick={() => setOperator('sabafon')}
          className={`relative flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.97] ${
            operator === 'sabafon' 
              ? 'bg-op-sf border-op-sf shadow-lg scale-[1.02]' 
              : 'bg-slate-950 border-slate-800 hover:border-op-sf/60 hover:bg-op-sf-light/50'
           }`}
         >
            <OperatorLogo provider="sabafon" size="md" />
           <span className={`text-[11px] sm:text-xs font-bold transition-colors duration-200 ${
             operator === 'sabafon' ? 'text-white' : 'text-slate-100'
           }`}>سبأفون</span>
           {operator === 'sabafon' && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-sf rounded-full flex items-center justify-center text-[10px] border-2 border-op-sf shadow">
               <Check size={10} strokeWidth={3} />
             </span>
          )}
        </div>

        {/* YOU */}
        <div 
          onClick={() => setOperator('you')}
          className={`relative flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.97] ${
            operator === 'you' 
              ? 'bg-op-you border-op-you shadow-lg scale-[1.02]' 
              : 'bg-slate-950 border-slate-800 hover:border-op-you/60 hover:bg-op-you-light/50'
           }`}
         >
            <OperatorLogo provider="you" size="md" />
           <span className={`text-[11px] sm:text-xs font-bold transition-colors duration-200 ${
              operator === 'you' ? 'text-you-text' : 'text-slate-100'
           }`}>YOU</span>
           {operator === 'you' && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-you-text text-you rounded-full flex items-center justify-center text-[10px] border-2 border-op-you shadow">
               <Check size={10} strokeWidth={3} />
             </span>
          )}
        </div>
      </div>



      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={`bg-slate-950/60 border-2 ${brand.borderColor} rounded-2xl p-5 shadow-inner`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User size={14} className="text-slate-500" />
                الاسم الكامل للعميل
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل الاسم الثلاثي واللقب"
                  className={`input-field pl-14 bg-slate-900 border-slate-800 text-sm focus:outline-none focus:ring-1 ${brand.ringClass}`}
                />
                <CameraCapture onCapture={handleNameCapture} />
              </div>
              <AnimatePresence>
                {nameCaptured && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
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

            {/* National ID */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CreditCard size={14} className="text-slate-500" />
                رقم الهوية الوطنية
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="10xxxxxxxxxx"
                inputMode="numeric"
                className={`input-field bg-slate-900 border-slate-800 text-sm focus:outline-none focus:ring-1 ${brand.ringClass} font-sans`}
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>

            {/* Sim ICCID */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers size={14} className="text-slate-500" />
                رقم الشريحة التسلسلي (ICCID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={iccid}
                  onChange={(e) => setIccid(e.target.value)}
                  placeholder="89967XXXXXXXXXXXX"
                  inputMode="numeric"
                  className={`input-field pl-20 bg-slate-900 border-slate-800 text-sm focus:outline-none focus:ring-1 ${brand.ringClass} font-sans`}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
                <CameraCapture onCapture={(data) => { setIccidCaptured(data); }} />
              </div>
              {iccidCaptured && (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <Check size={12} /> تم التقاط صورة الشريحة
                </span>
              )}
            </div>

            {/* Activation Number */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Phone size={14} className="text-slate-500" />
                رقم الهاتف الجديد المراد تفعيله
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, '');
                    if (v.length <= 9) {
                      setPhoneNumber(v);
                      if (v.length === 9) {
                        setPhoneError('');
                      } else if (v.length > 0) {
                        setPhoneError('يجب أن يتكون الرقم من 9 أرقام');
                      } else {
                        setPhoneError('');
                      }
                    }
                  }}
                  placeholder="05xxxxxxxx"
                  className={`input-field bg-slate-900 border-slate-800 text-sm focus:outline-none focus:ring-1 font-sans pl-12 ${phoneError ? 'border-red-500/50' : brand.ringClass}`}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  maxLength={9}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">{phoneNumber.length}/9</span>
              </div>
              {phoneError && (
                <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {phoneError}
                </span>
              )}
            </div>

            {/* Contract Upload */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera size={14} className="text-slate-500" />
                صورة العقد / المستند الثبوتي الموقع
              </label>
              <DocumentCapture
                onCapture={(data) => setContractPhoto(data)}
                capturedImage={contractPhoto}
                onRemove={() => setContractPhoto(null)}
              />
            </div>

          </div>
        </div>

        {/* Action Buttons Footer block */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-800 mt-6 md:mt-8">
          {/* Submission Progress Bar — hidden until submit */}
          {isSubmitting && (
            <div className="mb-1">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-slate-500 font-medium">جاري التفعيل...</span>
                <span className="text-[10px] font-bold text-emerald-400">جاري</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full"
                />
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-ghost w-full md:w-auto text-slate-400 text-xs hover:bg-slate-800 hover:text-slate-100"
            >
              مسح البيانات
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || !contractPhoto}
              className={`btn w-full md:w-auto text-xs shadow-md ${brand.bgClass} flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="animate-spin text-white" size={14} />
                  <span>جاري إرسال إشارات التفعيل والربط...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>حفظ البيانات وتفعيل الشريحة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

    </div>
  );
}
