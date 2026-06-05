import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Operator } from '../types';
import { Check, Camera, RefreshCw, Save, X, Phone, User, Shield, CreditCard, Layers } from 'lucide-react';

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

  const [ocrScanning, setOcrScanning] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [iccidScanning, setIccidScanning] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Define brand colors dynamically
  const getBrandDetails = (op: Operator) => {
    switch (op) {
      case 'yemen_mobile':
        return {
          colorClass: 'text-red-500 border-red-500 hover:border-red-500 hover:bg-red-500/5',
          bgClass: 'bg-red-600 hover:bg-red-500',
          ringClass: 'focus:border-red-600 focus:ring-red-600',
          glowColor: 'shadow-red-950/20',
          textColor: 'text-red-500',
          borderColor: 'border-red-500',
          bgLight: 'bg-red-950/20 border-red-900/30 text-red-400',
          label: 'يمن موبايل'
        };
      case 'sabafon':
        return {
          colorClass: 'text-blue-500 border-blue-500 hover:border-blue-500 hover:bg-blue-500/5',
          bgClass: 'bg-blue-600 hover:bg-blue-500',
          ringClass: 'focus:border-blue-600 focus:ring-blue-600',
          glowColor: 'shadow-blue-950/20',
          textColor: 'text-blue-500',
          borderColor: 'border-blue-500',
          bgLight: 'bg-blue-950/20 border-blue-900/30 text-blue-400',
          label: 'سبأفون'
        };
      case 'you':
        return {
          colorClass: 'text-amber-500 border-amber-500 hover:border-amber-500 hover:bg-amber-500/5',
          bgClass: 'bg-amber-500 hover:bg-amber-400 text-black',
          ringClass: 'focus:border-amber-500 focus:ring-amber-500',
          glowColor: 'shadow-amber-950/20',
          textColor: 'text-amber-500',
          borderColor: 'border-amber-500',
          bgLight: 'bg-amber-950/20 border-amber-900/30 text-amber-400',
          label: 'YOU'
        };
    }
  };

  const brand = getBrandDetails(operator);

  const triggerSmartOcr = () => {
    setOcrScanning('scanning');
    setTimeout(() => {
      setFullName('عبدالرحمن محمد العتيبي');
      setIdNumber('1029310482');
      setOcrScanning('success');
      setTimeout(() => setOcrScanning('idle'), 2500);
    }, 1500);
  };

  const triggerIccidScan = () => {
    setIccidScanning('scanning');
    setTimeout(() => {
      setIccid('8996600123456789012');
      setPhoneNumber('0504938210');
      setIccidScanning('success');
      setTimeout(() => setIccidScanning('idle'), 2500);
    }, 1400);
  };

  const handleCaptureContract = () => {
    setContractPhoto('active');
    alert('تم التقاط صورة المستند/العقد بنجاح عبر الكاميرا الافتراضية وجاري إرفاقها...');
  };

  const handleClear = () => {
    setFullName('');
    setIdNumber('');
    setIccid('');
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

      setTimeout(() => setSuccessMsg(''), 5000);
    }, 1800);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-slate-100 font-sans">
      
      {/* Form Header Title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">تفعيل شريحة جديدة</h2>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
          اختر شبكة المشغل المطلوب وأدخل البيانات المترتبة لتسجيل العميل وتفعيل الشريحة فوراً بالبث
        </p>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`mb-6 p-4 border rounded-2xl flex items-start gap-3 ${brand.bgLight}`}
          >
            <Check className="shrink-0 mt-0.5" size={18} />
            <div className="text-xs leading-relaxed text-slate-200">
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
          className={`relative flex flex-col items-center gap-2 p-4 bg-slate-950 border-2 rounded-2xl cursor-pointer transition-all ${
            operator === 'yemen_mobile' 
              ? 'border-red-600 bg-red-950/10' 
              : 'border-slate-800 hover:border-red-500/40'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl shadow-red-950/20">
            <span className="material-symbols-outlined text-3xl">signal_cellular_alt</span>
          </div>
          <span className="text-xs font-bold text-slate-100">يمن موبايل</span>
          {operator === 'yemen_mobile' && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] border border-slate-900 shadow">
              <Check size={10} strokeWidth={3} />
            </span>
          )}
        </div>

        {/* Sabafon */}
        <div 
          onClick={() => setOperator('sabafon')}
          className={`relative flex flex-col items-center gap-2 p-4 bg-slate-950 border-2 rounded-2xl cursor-pointer transition-all ${
            operator === 'sabafon' 
              ? 'border-blue-600 bg-blue-950/10' 
              : 'border-slate-800 hover:border-blue-500/40'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-950/20">
            <span className="material-symbols-outlined text-3xl">rss_feed</span>
          </div>
          <span className="text-xs font-bold text-slate-100">سبأفون</span>
          {operator === 'sabafon' && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] border border-slate-900 shadow">
              <Check size={10} strokeWidth={3} />
            </span>
          )}
        </div>

        {/* YOU */}
        <div 
          onClick={() => setOperator('you')}
          className={`relative flex flex-col items-center gap-2 p-4 bg-slate-950 border-2 rounded-2xl cursor-pointer transition-all ${
            operator === 'you' 
              ? 'border-amber-500 bg-amber-950/10' 
              : 'border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-xl shadow-amber-950/20">
            <span className="material-symbols-outlined text-3xl font-bold">sensors</span>
          </div>
          <span className="text-xs font-bold text-slate-100 font-sans">YOU</span>
          {operator === 'you' && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-black rounded-full flex items-center justify-center text-[10px] border border-slate-900 shadow">
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
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5Pr">
                <User size={14} className="text-slate-500" />
                الاسم الكامل للعميل
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل الاسم الثلاثي واللقب"
                  className={`w-full h-11 pr-4 pl-11 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 ${brand.ringClass}`}
                />
                <button
                  type="button"
                  onClick={triggerSmartOcr}
                  disabled={ocrScanning === 'scanning'}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 hover:scale-105 transition-all text-xs ${brand.textColor}`}
                >
                  {ocrScanning === 'scanning' ? (
                    <RefreshCw className="animate-spin text-yellow-500" size={16} />
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
              </div>
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
                className={`w-full h-11 px-4 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 ${brand.ringClass} font-sans`}
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
              <div className="relative" dir="ltr">
                <input
                  type="text"
                  value={iccid}
                  onChange={(e) => setIccid(e.target.value)}
                  placeholder="89xxxxxxxxxxxxxxxx"
                  className={`w-full h-11 pl-4 pr-11 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 ${brand.ringClass} font-sans`}
                  style={{ textAlign: 'right' }}
                />
                <button
                  type="button"
                  onClick={triggerIccidScan}
                  disabled={iccidScanning === 'scanning'}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 hover:scale-105 transition-all ${brand.textColor}`}
                >
                  {iccidScanning === 'scanning' ? (
                    <RefreshCw className="animate-spin text-yellow-500" size={16} />
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
              </div>
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
                className={`w-full h-11 px-4 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 ${brand.ringClass} font-sans`}
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
              <button
                type="button"
                onClick={handleCaptureContract}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400 font-medium transition-all hover:border-slate-700 hover:text-slate-200"
              >
                <span>التقط صورة العقد</span>
                <Camera className={`camera-icon shrink-0 ${brand.textColor}`} size={16} />
              </button>
              {contractPhoto && (
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1 pr-1">
                  <Check size={12} /> تم إرفاق صورة العقد الممسوح ورقياً
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Action Buttons Footer block */}
        <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6 md:mt-8">
          <button
            type="button"
            onClick={handleClear}
            className="w-full md:w-auto px-6 py-2.5 rounded-xl border border-slate-800 text-slate-400 font-medium text-xs hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
          >
            مسح البيانات
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full md:w-auto px-8 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] ${brand.bgClass} ${brand.glowColor} flex items-center justify-center gap-2 cursor-pointer`}
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
      </form>

    </div>
  );
}
