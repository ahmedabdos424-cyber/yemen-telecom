import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller } from '../types';
import { Check, Camera, RefreshCw, Lock, MapPin, Phone, CreditCard, ShoppingBag, User, X, Eye, EyeOff } from 'lucide-react';
import CameraCapture from './shared/CameraCapture';

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
  const [cameraState, setCameraState] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setCameraState('scanning');
    setShowCamera(true);
    setCapturedImage(null);
    setIdPreview(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch {
      fileInputRef.current?.click();
      setShowCamera(false);
      setCameraState('idle');
    }
  }, []);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setIdPreview(canvas.toDataURL('image/jpeg', 0.8));
      setIdNumber('');
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const confirmIdCapture = () => {
    if (idPreview) {
      setCapturedImage(idPreview);
      setCameraState('success');
    }
    setIdPreview(null);
    setShowCamera(false);
    setTimeout(() => setCameraState('idle'), 400);
  };

  const retakeIdCapture = () => {
    setIdPreview(null);
    setShowCamera(false);
    setTimeout(() => startCamera(), 300);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIdPreview(null);
    setShowCamera(false);
    setTimeout(() => setCameraState('idle'), 400);
  };

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setIdPreview(ev.target?.result as string);
        setIdNumber('');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCapturedImage = () => {
    setCapturedImage(null);
    setIdNumber('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('الرجاء كتابة الاسم الكامل للبائع');
      return;
    }
    if (!username.trim()) {
      alert('الرجاء كتابة اسم المستخدم الجديد للبائع');
      return;
    }
    if (!password.trim()) {
      alert('الرجاء تعيين كلمة المرور للبائع');
      return;
    }
    if (!storeName.trim()) {
      alert('الرجاء كتابة اسم المحل أو المركز');
      return;
    }
    if (!idNumber.trim()) {
      alert('الرجاء التقاط صورة الهوية أو إدخال رقم الهوية الوطنية / الإقامة');
      return;
    }
    if (!phone.trim()) {
      alert('الرجاء إدخال رقم الهاتف الجوال للبائع');
      return;
    }
    if (!region.trim()) {
      alert('الرجاء إدخال المنطقة أو النطاق والتغطية الجغرافية للمحل');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSellerAdded({
        name: fullName,
        username: username,
        password: password,
        agent_name: agentName,
        storeName: storeName,
        idNumber: idNumber,
        phone: phone,
        region: region,
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

      setSuccessInfo(`تم إنشاء حساب البائع "${fullName}" بنجاح.`);
      
      setFullName('');
      setNameCaptured(null);
      setUsername('');
      setPassword('');
      setStoreName('');
      setIdNumber('');
      setPhone('');
      setRegion('');
      setCapturedImage(null);

      setTimeout(() => {
        setSuccessInfo('');
      }, 4000);
    }, 500);
  };

  return (
    <div className="card w-full max-w-2xl mx-auto p-6 text-slate-100 font-sans" id="add-seller-form-container">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 mb-6" id="add-seller-header">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500">person_add</span>
          بيانات حساب البائع الجديد
        </h2>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
          يرجى إدخال معلومات المتجر والحساب بدقة عالية لضمان صحة التدقيق الأمني لشبكات التوزيع
        </p>
      </div>

      <AnimatePresence>
        {successInfo && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl flex items-start gap-3"
            id="success-notification"
          >
            <Check className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-emerald-300 leading-relaxed">
              <span className="font-bold">تم بنجاح!</span> {successInfo}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              placeholder="أدخل اسم البائع الكامل ثلاثياً"
              className="input-field pl-12 bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
            />
            <CameraCapture onCapture={(data) => setNameCaptured(data)} />
          </div>
          {nameCaptured && (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check size={12} /> تم التقاط الصورة
            </span>
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
              placeholder="مثال: user_99"
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
                placeholder="أدخل كلمة مرور قوية للبائع"
                className="input-field pr-10 bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-100 touch-target flex items-center justify-center"
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
            placeholder="مثال: محل التسهيلات الرقمية أو التميز للاتصالات"
            className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
          />
        </div>

        {/* ID Number with inline camera capture */}
        <div className="flex flex-col gap-3 card" id="idnumber-field-group">
          <div className="flex justify-between items-center pr-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5" htmlFor="id_number">
              <CreditCard size={14} className="text-slate-500" />
              رقم الهوية الوطنية / الإقامة للبائع
            </label>
            <span className="text-[10px] text-slate-500">نظام التدقيق العاجل للشرائح YM</span>
          </div>

          <div className="relative">
            <input
              type="text"
              id="id_number"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="أدخل رقم الهوية المكون من 10 خانات"
              inputMode="numeric"
              className="input-field pl-12 bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700 font-sans"
            />
            <button
              type="button"
              onClick={startCamera}
              disabled={cameraState === 'scanning'}
              className="input-camera-btn bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-slate-100"
              id="scan-id-camera-trigger"
              title="التقاط صورة الهوية"
            >
              {cameraState === 'scanning' ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Camera size={16} />
              )}
            </button>
          </div>

          {/* Hidden file input fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileCapture}
            className="hidden"
          />

          {/* Camera viewfinder modal */}
          <AnimatePresence>
            {showCamera && !idPreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                id="camera-modal"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
                >
                  <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-[3px] border-dashed border-red-400/40 m-8 rounded-2xl pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-400/20">
                      <CreditCard size={64} />
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-slate-950">
                    <button
                      type="button"
                      onClick={captureFrame}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Camera size={16} />
                      التقاط الصورة
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ID preview confirm/retake */}
          <AnimatePresence>
            {idPreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
                >
                  <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
                    <img src={idPreview} alt="معاينة الهوية" className="w-full h-full object-contain" />
                    <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                      معاينة
                    </div>
                  </div>
                  <div className="flex gap-3 p-4 bg-slate-950">
                    <button
                      type="button"
                      onClick={confirmIdCapture}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      موافق
                    </button>
                    <button
                      type="button"
                      onClick={retakeIdCapture}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={16} />
                      إعادة
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Captured image preview */}
          <AnimatePresence>
            {capturedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex gap-4 items-center mt-1"
                id="id-preview-container"
              >
                <div className="relative w-24 h-16 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow">
                  <img src={capturedImage} alt="ID Document Preview" className="w-full h-full object-cover" />
                  <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                    <Check size={8} />
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <h4 className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 justify-start">
                    <Check size={14} />
                    تم التقاط صورة بطاقة الهوية / الإقامة بنجاح
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1">الرقم المستخلص بعد المطابقة: {idNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={removeCapturedImage}
                  className="text-slate-500 hover:text-slate-100 p-1 rounded-md"
                  id="remove-captured-image-btn"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Phone Number - REMOVED +966 COUNTRY KEY CONTAINER */}
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
            placeholder="05XXXXXXXX - أدخل رقم الجوال كاملاً بدقة"
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
            placeholder="مثال: الرياض - حي الصحافة، أو تعز - شارع جمال"
            className="input-field bg-slate-950 border-slate-850 text-sm text-right placeholder:text-slate-700"
          />
        </div>

        {/* Form Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm mt-8"
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
