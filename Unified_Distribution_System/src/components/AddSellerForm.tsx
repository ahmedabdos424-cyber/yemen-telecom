import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller } from '../types';
import { Check, Camera, RefreshCw, Lock, AlertCircle, MapPin, Phone, CreditCard, ShoppingBag, User } from 'lucide-react';

interface AddSellerFormProps {
  onSellerAdded: (newSeller: Omit<Seller, 'id' | 'creationDate' | 'lastLogin'>) => void;
}

export default function AddSellerForm({ onSellerAdded }: AddSellerFormProps) {
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [cameraState, setCameraState] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState('');

  const handleIdScan = () => {
    setCameraState('scanning');
    setTimeout(() => {
      // Auto-fill random mock Yemen/KSA ID Number
      setIdNumber('1084293041');
      setCameraState('success');
      setTimeout(() => {
        setCameraState('idle');
      }, 2500);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName) {
      alert('الرجاء كتابة الاسم الكامل للبائع');
      return;
    }
    if (!storeName) {
      alert('الرجاء كتابة اسم المحل أو المركز');
      return;
    }
    if (!idNumber) {
      alert('الرجاء فحص أو إدخال رقم الهوية');
      return;
    }
    if (!phone) {
      alert('الرجاء إدخال رقم الهاتف الجوال');
      return;
    }
    if (!region) {
      alert('الرجاء اختيار منطقة التغطية الجغرافية');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      // Success
      setIsSubmitting(false);
      onSellerAdded({
        name: fullName,
        storeName: storeName,
        idNumber: idNumber,
        phone: phone,
        region: region === 'riyadh' ? 'منطقة الرياض' : region === 'makkah' ? 'منطقة مكة المكرمة' : region === 'madinah' ? 'منطقة المدينة المنورة' : 'المنطقة الشرقية',
        regionCode: region,
        status: 'active',
        totalSales: 0,
        currentStock: 0,
        efficiency: 0,
        avatar: '' // store fallback icon
      });

      setSuccessInfo(`تم إنشاء حساب البائع "${fullName}" بنجاح وجاري إرسال كلمة المرور المؤقتة عبر رسالة SMS.`);
      
      // Clear Form Fields
      setFullName('');
      setStoreName('');
      setIdNumber('');
      setPhone('');
      setRegion('');

      setTimeout(() => {
        setSuccessInfo('');
      }, 5000);
    }, 1800);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-slate-100 font-sans">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500">person_add</span>
          بيانات حساب البائع الجديد
        </h2>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
          يرجى إدخال معلومات البائع بدقة لضمان تفعيل الحساب وتدقيق البيانات فوراً
        </p>
      </div>

      <AnimatePresence>
        {successInfo && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl flex items-start gap-3"
          >
            <Check className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-emerald-300 leading-relaxed">
              <span className="font-bold">تم بنجاح!</span> {successInfo}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="full_name">
            <User size={14} className="text-slate-500" />
            الاسم الكامل للبائع
          </label>
          <input
            type="text"
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="أدخل اسم البائع الثلاثي"
            className="w-full h-13 px-4 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all placeholder:text-slate-700"
          />
        </div>

        {/* Store Name Field */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="store_name">
            <ShoppingBag size={14} className="text-slate-500" />
            اسم المحل / المركز التجاري
          </label>
          <input
            type="text"
            id="store_name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="مثال: مؤسسة الاتصالات الحديثة أو فرع حي النرجس"
            className="w-full h-13 px-4 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all placeholder:text-slate-700"
          />
        </div>

        {/* ID Number */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center pr-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="id_number">
              <CreditCard size={14} className="text-slate-500" />
              رقم الهوية الوطنية / الإقامة للبائع
            </label>
            <button
              type="button"
              onClick={handleIdScan}
              disabled={cameraState === 'scanning'}
              className={`text-xs font-bold flex items-center gap-1.5 transition-all ${
                cameraState === 'scanning'
                  ? 'text-yellow-500 animate-pulse'
                  : cameraState === 'success'
                  ? 'text-emerald-400 font-extrabold'
                  : 'text-red-500 hover:text-red-400'
              }`}
            >
              {cameraState === 'scanning' ? (
                <>
                  <RefreshCw className="animate-spin text-yellow-500" size={14} />
                  <span>جاري المسح الذكي لبيانات الهوية...</span>
                </>
              ) : cameraState === 'success' ? (
                <>
                  <Check className="text-emerald-400" size={14} />
                  <span>تم مسح وتدقيق الهوية بنجاح</span>
                </>
              ) : (
                <>
                  <Camera size={14} />
                  <span>المسح الضوئي للهوية</span>
                </>
              )}
            </button>
          </div>
          <input
            type="text"
            id="id_number"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="10XXXXXXXX"
            className="w-full h-13 px-4 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all placeholder:text-slate-700 font-sans"
          />
        </div>

        {/* Phone Number */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="phone">
            <Phone size={14} className="text-slate-500" />
            رقم الهاتف الجوال للبائع
          </label>
          <div className="relative" dir="ltr">
            <div className="absolute left-0 top-0 bottom-0 flex items-center px-4 border-r border-slate-800 bg-slate-950 rounded-l-xl">
              <span className="text-slate-400 font-medium text-xs font-sans">+966</span>
            </div>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              className="w-full h-13 pl-20 pr-4 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all placeholder:text-slate-700 text-left font-sans"
            />
          </div>
        </div>

        {/* Region Dropdown */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 pr-1 flex items-center gap-1.5" htmlFor="region">
            <MapPin size={14} className="text-slate-500" />
            المنطقة / النطاق والتغطية الجغرافية للمحل
          </label>
          <div className="relative">
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full h-13 px-4 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all appearance-none text-slate-200"
            >
              <option value="" disabled>اختر التغطية الجغرافية للبائع</option>
              <option value="riyadh">منطقة الرياض والمحافظات التابعة</option>
              <option value="makkah">منطقة مكة المكرمة والمحافظات التابعة</option>
              <option value="madinah">منطقة المدينة المنورة</option>
              <option value="eastern">المنطقة الشرقية والخبر والدمام</option>
            </select>
          </div>
        </div>

        {/* Quick Info Password Indicator */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-red-500">
            <Lock size={18} />
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400">كلمة المرور الافتراضية للحساب</p>
            <p className="font-bold text-xs text-white">سوف تُولَّد تلقائياً وتُرسَل فور الإنشاد للبائع عبر شريحة SMS الجوال</p>
          </div>
        </div>

        {/* Form Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-13 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-950/20 hover:bg-red-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer mt-8"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="animate-spin text-white" size={16} />
              <span>جاري تدقيق البيانات وحفظ الحساب الجديد بوزارة التجارة والشركات...</span>
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
