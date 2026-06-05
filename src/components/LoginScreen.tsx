import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Role } from '../types';
import { Shield, User, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { api } from '../api/client';

interface LoginScreenProps {
  onLogin: (role: Role, username: string, password: string) => void;
}

const roleConfig: Record<Role, { label: string; icon: string; gradient: string; btnClass: string; accent: string }> = {
  manager: {
    label: 'مدير عام',
    icon: 'admin_panel_settings',
    gradient: 'from-red-950/30 via-slate-950 to-slate-950',
    btnClass: 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/20',
    accent: 'red'
  },
  agent: {
    label: 'وكيل معتمد',
    icon: 'badge',
    gradient: 'from-blue-950/30 via-slate-950 to-slate-950',
    btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/20',
    accent: 'blue'
  },
  seller: {
    label: 'بائع تجزئة',
    icon: 'storefront',
    gradient: 'from-emerald-950/30 via-slate-950 to-slate-950',
    btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20',
    accent: 'emerald'
  }
};

function detectRole(username: string): { role: Role; accent: string } {
  const clean = username.trim().toLowerCase();
  if (clean === 'manager') return { role: 'manager', accent: 'red' };
  if (clean === 'agent') return { role: 'agent', accent: 'blue' };
  const accounts = JSON.parse(localStorage.getItem('tele_seller_accounts') || '[]');
  if (accounts.some((a: any) => a.username === clean)) return { role: 'seller', accent: 'emerald' };
  return { role: 'agent', accent: 'blue' };
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const detected = detectRole(username);
  const currentRole = roleConfig[detected.role];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setErrorMsg('الرجاء إدخال اسم المستخدم المعتمد');
      return;
    }
    if (!password) {
      setErrorMsg('الرجاء إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    onLogin(detected.role, cleanUsername, password);
  };

  const handleBiometric = () => {
    const enabled = localStorage.getItem('tele_biometric_enabled') === 'true';
    if (!enabled) {
      setErrorMsg('يرجى تفعيل بصمة الدخول من إعدادات الحساب أولاً');
      return;
    }
    setUsername('seller');
    setErrorMsg('');
    setTimeout(() => {
      document.getElementById('login-password')?.focus();
    }, 100);
  };

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col justify-between items-center py-3 sm:py-6 px-3 sm:px-4 relative overflow-hidden font-sans safe-bottom">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-l ${currentRole.accent === 'red' ? 'from-red-600 via-red-800 to-transparent' : currentRole.accent === 'blue' ? 'from-blue-600 via-blue-800 to-transparent' : 'from-emerald-600 via-emerald-800 to-transparent'}`} />

      {/* Header */}
      <div className="w-full z-10 flex flex-col items-center text-center mt-2 sm:mt-6 mb-1">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-12 sm:w-16 h-12 sm:h-16 bg-red-600 rounded-[16px] sm:rounded-[20px] flex items-center justify-center shadow-lg shadow-red-900/30 mb-1.5 sm:mb-3"
        >
          <svg className="w-7 sm:w-9 h-7 sm:h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        </motion.div>
        <h1 className="text-sm sm:text-lg font-bold text-slate-100">يمن تليكوم</h1>
        <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5">نظام إدارة توزيع الشرائح</p>
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        className="w-full max-w-sm bg-slate-900/80 border border-slate-800/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative z-10 backdrop-blur-md"
      >

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] sm:text-xs text-slate-400 font-medium pr-1 text-right block w-full">
              <span className="material-symbols-outlined text-[14px] align-middle ml-1">person</span>
              اسم المستخدم
            </label>
            <div className="input-group relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder="أدخل اسم المستخدم المعتمد"
                autoComplete="username"
                inputMode="text"
                className="input-field w-full bg-slate-950/60 text-slate-100 border border-slate-800 rounded-xl py-3.5 sm:py-4 pr-11 pl-4 text-sm focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition-all placeholder:text-slate-600 font-sans text-right"
              />
              <span className={`input-icon absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'username' ? 'text-slate-400' : 'text-slate-500'}`}>
                <User size={18} />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center w-full" dir="rtl">
              <label className="text-[11px] sm:text-xs text-slate-400 font-medium pr-1">
                <span className="material-symbols-outlined text-[14px] align-middle ml-1">lock</span>
                كلمة المرور
              </label>
              <button
                type="button"
                onClick={() => alert('الرجاء مراجعة مدير النظام لإعادة تعيين كلمة المرور.')}
                className="text-[11px] text-slate-500 hover:text-slate-300 font-medium transition-colors cursor-pointer py-1.5 px-2 -my-1.5 -mx-2 touch-target"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="input-group relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="input-field w-full bg-slate-950/60 text-slate-100 border border-slate-800 rounded-xl py-3.5 sm:py-4 pr-11 pl-[88px] text-[15px] focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition-all placeholder:text-slate-600 font-sans text-left leading-relaxed tracking-widest"
              />
              <span className={`input-icon absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${focusedField === 'password' ? 'text-slate-400' : 'text-slate-500'}`}>
                <Lock size={18} />
              </span>
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-slate-950/40 py-1 px-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-2 rounded-md hover:bg-slate-800/50 active:bg-slate-800/80 touch-target"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <div className="w-px h-5 bg-slate-700/50" />
                <button
                  type="button"
                  onClick={handleBiometric}
                  className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer p-2 rounded-md hover:bg-red-900/20 active:bg-red-900/40 touch-target"
                  title="بصمة الدخول"
                  aria-label="بصمة الدخول"
                >
                  <Fingerprint size={20} />
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg text-center font-medium"
            >
              {errorMsg}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full btn btn-primary py-3.5 sm:py-4 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all active:scale-[0.97] hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري التحقق من البيانات...</span>
              </>
            ) : (
              <>
                <Shield size={18} />
                <span>تسجيل الدخول الآمن</span>
              </>
            )}
          </button>
        </form>

      </motion.div>

      {/* Footer */}
      <div className="w-full z-10 flex flex-col items-center mt-3 sm:mt-6">
        <div className="flex gap-5 sm:gap-5 items-center justify-center mb-2 sm:mb-4">
          {[
            { bg: 'bg-op-ym', icon: 'signal_cellular_alt', label: 'Yemen Mobile' },
            { bg: 'bg-op-sf', icon: 'rss_feed', label: 'Sabafon' },
            { bg: 'bg-op-you', icon: 'sensors', label: 'YOU', text: 'text-you-text' }
          ].map((op, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 ${op.bg} rounded-full flex items-center justify-center ${op.text || 'text-white'} text-xs font-bold shadow-md cursor-pointer hover:scale-110 transition-transform active:scale-95`}>
                <span className="material-symbols-outlined text-lg sm:text-[20px]">{op.icon}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">{op.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-slate-600 font-light text-center leading-relaxed px-4">
          إصدار النظام v4.2.0 &bull; جميع الحقوق محفوظة &copy; 2026
        </p>
      </div>
    </div>
  );
}
