import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Operator } from '../types';
import { Check, Camera, RefreshCw, Save, X, Phone, User, Shield, CreditCard, Layers } from 'lucide-react';
import CameraCapture, { DocumentCapture } from './shared/CameraCapture';
import { useOcr } from '../hooks/useOcr';

interface ActivateSimFormProps {
  onSimActivated: (simData: {
    fullName: string;
    idNumber: string;
    iccid: string;
    phoneNumber: string;
    operator: Operator;
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
  const { recognize, progress: ocrProgress } = useOcr();

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
          colorClass: 'text-op-ym border-op-ym hover:border-op-ym hover:bg-op-ym/5',
          bgClass: 'bg-op-ym hover:bg-op-ym/90',
          ringClass: 'focus:border-op-ym focus:ring-op-ym',
          glowColor: 'shadow-op-ym/20',
          textColor: 'text-op-ym',
          borderColor: 'border-op-ym',
          bgLight: 'bg-op-ym-light border-op-ym/30 text-op-ym',
          label: 'يمن موبايل'
        };
      case 'sabafon':
        return {
          colorClass: 'text-op-sf border-op-sf hover:border-op-sf hover:bg-op-sf/5',
          bgClass: 'bg-op-sf hover:bg-op-sf/90',
          ringClass: 'focus:border-op-sf focus:ring-op-sf',
          glowColor: 'shadow-op-sf/20',
          textColor: 'text-op-sf',
          borderColor: 'border-op-sf',
          bgLight: 'bg-op-sf-light border-op-sf/30 text-op-sf',
          label: 'سبأفون'
        };
      case 'you':
        return {
          colorClass: 'text-op-you border-op-you hover:border-op-you hover:bg-op-you/5',
          bgClass: 'bg-op-you hover:bg-op-you/90 text-[#1A1A1A]',
          ringClass: 'focus:border-op-you focus:ring-op-you',
          glowColor: 'shadow-op-you/20',
          textColor: 'text-op-you',
          borderColor: 'border-op-you',
          bgLight: 'bg-op-you-light border-op-you/30 text-op-you',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName) {
      alert('الرجاء إدخال اسم العميل الكامل');
      return;
    }
    if (!idNumber) {
      alert('الرجاء إدخال رقم الهوية للعميل');
      return;
    }
    if (!iccid) {
      alert('الرجاء إدخال رقم شريحة الـ SIM (ICCID)');
      return;
    }
    if (!phoneNumber) {
      alert('الرجاء إدخال رقم هاتف التفعيل الجديد');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSimActivated({
        fullName,
        idNumber,
        iccid,
        phoneNumber,
        operator,
      });

      setSuccessMsg(`تهانينا! تم تفعيل الشريحة رقم (${iccid}) بنجاح للشبكة المحددة وعميلها المتربط.`);
      handleClear();

      setTimeout(() => setSuccessMsg(''), 3000);
    }, 500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-slate-100 font-sans">
      
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
      <div className="grid grid-cols-3 gap-4 w-full mb-8">
        {/* Yemen Mobile */}
        <div 
          onClick={() => setOperator('yemen_mobile')}
          className={`relative flex flex-col items-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.97] ${
            operator === 'yemen_mobile' 
              ? 'bg-op-ym border-op-ym shadow-lg shadow-op-ym/30 scale-[1.02]' 
              : 'bg-slate-950 border-slate-800 hover:border-op-ym/60 hover:bg-op-ym-light/50'
           }`}
         >
           <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
             operator === 'yemen_mobile' 
               ? 'bg-white/20 text-white' 
               : 'bg-op-ym text-white shadow-lg shadow-op-ym/20'
           }`}>
             <span className="material-symbols-outlined text-3xl">signal_cellular_alt</span>
           </div>
           <span className={`text-xs font-bold transition-colors duration-200 ${
             operator === 'yemen_mobile' ? 'text-white' : 'text-slate-100'
           }`}>يمن موبايل</span>
           {operator === 'yemen_mobile' && (
             <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-op-ym rounded-full flex items-center justify-center text-[10px] border-2 border-op-ym shadow">
               <Check size={10} strokeWidth={3} />
             </span>
          )}
        </div>

        {/* Sabafon */}
        <div 
          onClick={() => setOperator('sabafon')}
          className={`relative flex flex-col items-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.97] ${
            operator === 'sabafon' 
              ? 'bg-op-sf border-op-sf shadow-lg shadow-op-sf/30 scale-[1.02]' 
              : 'bg-slate-950 border-slate-800 hover:border-op-sf/60 hover:bg-op-sf-light/50'
           }`}
         >
           <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
             operator === 'sabafon' 
               ? 'bg-white/20 text-white' 
               : 'bg-op-sf text-white shadow-lg shadow-op-sf/20'
           }`}>
             <span className="material-symbols-outlined text-3xl">rss_feed</span>
           </div>
           <span className={`text-xs font-bold transition-colors duration-200 ${
             operator === 'sabafon' ? 'text-white' : 'text-slate-100'
           }`}>سبأفون</span>
           {operator === 'sabafon' && (
             <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-op-sf rounded-full flex items-center justify-center text-[10px] border-2 border-op-sf shadow">
               <Check size={10} strokeWidth={3} />
             </span>
          )}
        </div>

        {/* YOU */}
        <div 
          onClick={() => setOperator('you')}
          className={`relative flex flex-col items-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.97] ${
            operator === 'you' 
              ? 'bg-op-you border-op-you shadow-lg shadow-op-you/30 scale-[1.02]' 
              : 'bg-slate-950 border-slate-800 hover:border-op-you/60 hover:bg-op-you-light/50'
           }`}
         >
           <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
             operator === 'you' 
               ? 'bg-black/10 text-[#1A1A1A]' 
               : 'bg-op-you text-[#1A1A1A] shadow-lg shadow-op-you/20'
           }`}>
             <span className="material-symbols-outlined text-3xl font-bold">sensors</span>
           </div>
           <span className={`text-xs font-bold transition-colors duration-200 ${
             operator === 'you' ? 'text-[#1A1A1A]' : 'text-slate-100'
           }`}>YOU</span>
           {operator === 'you' && (
             <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1A1A1A] text-op-you rounded-full flex items-center justify-center text-[10px] border-2 border-op-you shadow">
               <Check size={10} strokeWidth={3} />
             </span>
          )}
        </div>
      </div>

      {/* Styled Centered Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="h-[1px] flex-1 bg-slate-800"></div>
        <h3 className={`text-xs font-bold px-4 tracking-wide uppercase ${brand.textColor}`}>
          البيانات الشخصية والتعاقدية
        </h3>
        <div className="h-[1px] flex-1 bg-slate-800"></div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={`bg-slate-950/60 border-2 ${brand.borderColor} rounded-2xl p-5 shadow-inner`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
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
                رقم الهوية الوطنية / الإقامة
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
                  placeholder="89xxxxxxxxxxxxxxxx"
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
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="05xxxxxxxx"
                className={`input-field bg-slate-900 border-slate-800 text-sm focus:outline-none focus:ring-1 ${brand.ringClass} font-sans`}
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
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
              disabled={isSubmitting}
              className={`btn w-full md:w-auto text-xs shadow-md ${brand.bgClass} ${brand.glowColor} flex items-center justify-center gap-2`}
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
