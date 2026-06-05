import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Role } from '../types';
import { Sparkles, Shield, User, Lock, Eye, EyeOff, Radio, Fingerprint, Scan, Smartphone } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: Role, username: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<Role>('agent');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricMsg, setBiometricMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setErrorMsg('الرجاء إدخال اسم المستخدم المعتمد');
      return;
    }
    if (!password) {
      setErrorMsg('الرجاء إدخال كلمة المرور المكونة من 6 أرقام');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      
      const credentials: Record<Role, { username: string; expectedPass: string; name: string }> = {
        manager: { username: 'manager', expectedPass: '123456', name: 'المدير العام للمبيعات' },
        agent: { username: 'agent', expectedPass: '123456', name: 'الوكيل أحمد محمد' },
        seller: { username: 'seller', expectedPass: '123456', name: 'البائع عبدالرحمن العتيبي' }
      };

      // تحسين ذكي: تحديد الدور تلقائياً بناءً على اسم المستخدم لتجنب أي تعارض
      let resolvedRole = selectedRole;
      if (cleanUsername === 'manager') resolvedRole = 'manager';
      else if (cleanUsername === 'agent') resolvedRole = 'agent';
      else if (cleanUsername === 'seller') resolvedRole = 'seller';

      const account = credentials[resolvedRole];

      if (cleanUsername === account.username && password === account.expectedPass) {
        onLogin(resolvedRole, account.name);
      } else {
        setErrorMsg(`بيانات الدخول المدخلة غير متطابقة للدور المختار. يرجى تحديد التبويب المتوافق أو التأكد من إدخال اسم المستخدم [ ${account.username} ] مع كلمة المرور [ ${account.expectedPass} ] من أجل تسجيل الدخول وفصل الواجهة بنجاح.`);
      }
    }, 1200);
  };

  const handleBiometric = (type: 'fingerprint' | 'face') => {
    setBiometricMsg(type === 'fingerprint' ? 'جاري قراءة بصمة الإصبع والتحقق الأمن...' : 'جاري تشغيل الكاميرا والتعرف على ملامح الوجه...');
    setTimeout(() => {
      setBiometricMsg('');
      const credentials: Record<Role, { username: string; name: string }> = {
        manager: { username: 'manager', name: 'المدير العام للمبيعات' },
        agent: { username: 'agent', name: 'الوكيل أحمد محمد' },
        seller: { username: 'seller', name: 'البائع عبدالرحمن العتيبي' }
      };
      const account = credentials[selectedRole];
      onLogin(selectedRole, account.name);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between items-center py-8 px-4 relative overflow-hidden font-sans">
      {/* Background Decorative Dots/Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* Top Header Logo Component */}
      <div className="w-full max-w-md flex flex-col items-center text-center mt-6 z-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-18 h-18 bg-[#b90e1a] rounded-[22px] flex items-center justify-center shadow-lg shadow-red-900/30 mb-5"
        >
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        </motion.div>
        <motion.h1 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold tracking-tight text-white mb-2"
        >
          نظام التوزيع الموحد
        </motion.h1>
        <motion.p 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 text-sm font-light max-w-xs"
        >
          مرحباً بك في منصة تتبع وتوزيع الشرائح الذكية
        </motion.p>
      </div>

      {/* Main Login Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
        className="w-full max-w-md bg-[#131a26]/90 border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10 backdrop-blur-md"
      >
        {/* Role Select Sliders (Custom styled like image 1) */}
        <div className="flex bg-[#0f141f] rounded-2xl p-1 mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedRole('manager')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
              selectedRole === 'manager'
                ? 'bg-[#b90e1a] text-white shadow-lg shadow-red-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield size={16} />
            <span>مدير</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('agent')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
              selectedRole === 'agent'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={16} />
            <span>وكيل</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('seller')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
              selectedRole === 'seller'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={16} />
            <span>بائع</span>
          </button>
        </div>

        {/* Biometrics Status Message */}
        {biometricMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-blue-950/40 border border-blue-800/40 text-blue-300 p-3 rounded-xl text-center text-xs flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            {biometricMsg}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Default Credentials Information Hint with distinct separated logins */}
          <div className="text-[11px] bg-slate-950/60 border border-slate-800/60 text-slate-350 p-4 rounded-2xl leading-relaxed mb-4">
            <p className="font-bold text-white mb-2 text-xs flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              بيانات الدخول لحسابات واجهات المستخدمين المنفصلة:
            </p>
            <div className="space-y-1.5 font-mono text-[10px]" dir="rtl">
              <div className={`flex justify-between items-center p-2 rounded-xl border transition-all ${selectedRole === 'manager' ? 'bg-red-950/20 border-red-800/50 text-white' : 'bg-slate-900/40 border-slate-800/50 text-slate-400'}`}>
                <span className="font-sans">مدير النظام: <strong className="text-red-400 underline font-mono">manager</strong></span>
                <span>الباسورد: <strong className="text-white">123456</strong></span>
              </div>
              <div className={`flex justify-between items-center p-2 rounded-xl border transition-all ${selectedRole === 'agent' ? 'bg-blue-950/25 border-blue-800/50 text-white' : 'bg-slate-900/40 border-slate-800/50 text-slate-400'}`}>
                <span className="font-sans">الوكيل الإقليمي: <strong className="text-blue-400 underline font-mono">agent</strong></span>
                <span>الباسورد: <strong className="text-white">123456</strong></span>
              </div>
              <div className={`flex justify-between items-center p-2 rounded-xl border transition-all ${selectedRole === 'seller' ? 'bg-emerald-950/20 border-emerald-800/50 text-white' : 'bg-slate-900/40 border-slate-800/50 text-slate-400'}`}>
                <span className="font-sans">البائع المعتمد: <strong className="text-emerald-400 underline font-mono">seller</strong></span>
                <span>الباسورد: <strong className="text-white">123456</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium pr-1">اسم المستخدم</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  const val = e.target.value;
                  setUsername(val);
                  const clean = val.trim().toLowerCase();
                  if (clean === 'seller') {
                    setSelectedRole('seller');
                  } else if (clean === 'agent') {
                    setSelectedRole('agent');
                  } else if (clean === 'manager') {
                    setSelectedRole('manager');
                  }
                }}
                placeholder="أدخل اسم المستخدم"
                className="w-full bg-[#0a0d14] text-slate-100 border border-slate-800 rounded-xl py-3.5 pr-11 pl-4 text-sm focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition-all placeholder:text-slate-600 font-sans"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <User size={18} />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-400 font-medium pr-1">كلمة المرور</label>
              <button 
                type="button" 
                onClick={() => alert('الرجاء مراجعة مدير النظام لإعادة تعيين كلمة المرور.')}
                className="text-xs text-red-500 hover:text-red-400 font-medium transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0a0d14] text-slate-100 border border-slate-800 rounded-xl py-3.5 pr-11 pl-11 text-sm focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition-all placeholder:text-slate-600 font-sans"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={18} />
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-500 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg text-center font-medium">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all active:scale-[0.98] ${
              selectedRole === 'manager' 
                ? 'bg-[#b90e1a] text-white hover:brightness-110 shadow-red-950/20' 
                : selectedRole === 'agent'
                ? 'bg-blue-600 text-white hover:brightness-110 shadow-blue-950/20'
                : 'bg-emerald-600 text-white hover:brightness-110 shadow-emerald-950/20'
            } flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Smartphone size={16} />
                <span>تسجيل الدخول</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-[#131a26] px-3 text-slate-500 font-medium">أو سجل الدخول بواسطة</span>
          </div>
        </div>

        {/* Biometrics options */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleBiometric('fingerprint')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-800 bg-[#0d121c] text-xs text-slate-300 hover:bg-[#111824] hover:text-white active:scale-95 transition-all"
          >
            <Fingerprint className="text-red-500" size={16} />
            <span>بصمة الإصبع</span>
          </button>
          <button
            type="button"
            onClick={() => handleBiometric('face')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-800 bg-[#0d121c] text-xs text-slate-300 hover:bg-[#111824] hover:text-white active:scale-95 transition-all"
          >
            <Scan className="text-blue-500" size={16} />
            <span>بصمة الوجه</span>
          </button>
        </div>
      </motion.div>

      {/* Operator logos/links */}
      <div className="w-full max-w-md flex flex-col items-center mt-6 z-10">
        <div className="flex gap-6 items-center justify-center mb-6">
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">signal_cellular_alt</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Yemen Mobile</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">rss_feed</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Sabafon</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 bg-[#ffcb05] rounded-full flex items-center justify-center text-black text-xs font-bold shadow-md cursor-pointer hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">sensors</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">YOU</span>
          </div>
        </div>

        {/* Footer info lockup */}
        <p className="text-[11px] text-slate-600 font-light text-center">
          إصدار النظام v4.2.0 • جميع الحقوق محفوظة © 2026
        </p>
      </div>
    </div>
  );
}
