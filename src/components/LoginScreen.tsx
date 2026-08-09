import { useState, useRef, useEffect, type FormEvent, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Role } from '../types';
import { Shield, User, Lock, Eye, EyeOff, ChevronLeft, Smartphone, Check, Fingerprint } from 'lucide-react';
import { useToast, ToastContainer } from '../hooks/useToast';

interface LoginScreenProps {
  onLogin: (role: Role, username: string, password: string) => Promise<{ role: Role; commit: () => void } | null>;
  onBiometricLogin?: () => Promise<{ role: Role; commit: () => void } | null>;
  biometricAvailable?: boolean;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const ACCOUNTS_STORAGE_KEY = 'tele_recent_accounts';

function getRecentUsernames(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveUsername(u: string) {
  const list = getRecentUsernames().filter(x => x !== u);
  list.unshift(u);
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list.slice(0, 3)));
}

function removeUsername(u: string) {
  const list = getRecentUsernames().filter(x => x !== u);
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
}

export default function LoginScreen({ onLogin, onBiometricLogin, biometricAvailable, darkMode, setDarkMode }: LoginScreenProps) {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldError, setFieldError] = useState<'username' | 'password' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fieldsFilled = username.trim().length > 0 && password.length > 0;
  const [showRecent, setShowRecent] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<string[]>(getRecentUsernames());

  const passwordRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (recentAccounts.length > 0 && !username) {
      const timer = setTimeout(() => setShowRecent(true), 400);
      return () => clearTimeout(timer);
    }
    setShowRecent(false);
  }, [username, recentAccounts.length]);

  useEffect(() => {
    return () => { abortRef.current = true; };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading || success) return;
    const clean = username.trim().toLowerCase();

    if (!clean) { setFieldError('username'); setErrorMsg('الرجاء إدخال اسم المستخدم المعتمد'); return; }
    if (!password) { setFieldError('password'); setErrorMsg('الرجاء إدخال كلمة المرور'); return; }
    setFieldError(null);
    setErrorMsg('');
    setIsLoading(true);
    saveUsername(clean);
    abortRef.current = false;
    try {
      const result = await onLogin('manager', clean, password);
      if (abortRef.current) return;
      if (result) {
        setSuccess(true);
        setIsLoading(false);
        const commitTimer = setTimeout(() => {
          if (!abortRef.current) result.commit();
        }, 450);
      } else {
        setIsLoading(false);
        setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة');
        setFieldError('password');
      }
     } catch (err) {
       if (abortRef.current) return;
       setIsLoading(false);
       setFieldError('password');
       const raw = err instanceof Error ? err.message : String(err);
       const msg = raw.toLowerCase();
       if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('abort') || msg.includes('dns')) {
         setErrorMsg('تعذر الاتصال بالخادم. تأكد من تشغيل بيانات الجوال أو الواي فاي لديك، ثم أعد المحاولة');
       } else if (msg.includes('certificate') || msg.includes('ssl') || msg.includes('secure')) {
         setErrorMsg('تعذر الاتصال: مشكلة في شهادة الأمان. تأكد من تاريخ ووقت جهازك مضبوطين بشكل صحيح');
       } else if (msg.includes('cors')) {
         setErrorMsg('تعذر الاتصال بالخادم. يرجى تحديث التطبيق إلى أحدث نسخة من متجر التوزيع');
       } else if (msg.includes('429') || msg.includes('تجاوز الحد') || msg.includes('محاولات الدخول') || msg.includes('temporarily locked') || msg.includes('too many requests')) {
         setErrorMsg(raw);
       } else {
         setErrorMsg('تعذر الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة، أو تحديث التطبيق');
       }
     }
   };

  const selectRecent = (u: string) => {
    setUsername(u);
    setShowRecent(false);
    setErrorMsg('');
    setFieldError(null);
    setTimeout(() => passwordRef.current?.focus(), 200);
  };

  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleBiometric = async () => {
    if (biometricLoading || !onBiometricLogin) return;
    setBiometricLoading(true);
    setErrorMsg('');
    setFieldError(null);
    try {
      const result = await onBiometricLogin();
      if (abortRef.current) return;
      if (result) {
        setSuccess(true);
        setBiometricLoading(false);
        setTimeout(() => {
          if (!abortRef.current) result.commit();
        }, 450);
      } else {
        setBiometricLoading(false);
        setErrorMsg('لم يتم التحقق من بصمتك أو لا يوجد دخول سريع محفوظ. سجّل الدخول بكلمة المرور');
      }
    } catch (err) {
      if (abortRef.current) return;
      setBiometricLoading(false);
      setErrorMsg('تعذر التحقق البيومتري. حاول مجدداً أو استخدم كلمة المرور');
    }
  };

  const removeRecent = (e: MouseEvent, u: string) => {
    e.stopPropagation();
    removeUsername(u);
    setRecentAccounts(getRecentUsernames());
  };

  const focusClasses = (field: 'username' | 'password') => {
    const disabledCls = 'disabled:opacity-50 disabled:cursor-not-allowed';
    if (darkMode) {
      return `w-full border ${fieldError === field ? 'border-red-500/60 ring-2 ring-red-500/20' : 'border-white/10 focus:border-white/30'} rounded-2xl py-4 pr-13 pl-4 text-[16px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-white/15 transition-all duration-300 font-sans text-right bg-white/5 ${disabledCls}`;
    }
    return `w-full border ${fieldError === field ? 'border-red-500/60 ring-2 ring-red-500/20' : 'border-gray-200 focus:border-blue-400'} rounded-2xl py-4 pr-13 pl-4 text-[16px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-300 font-sans text-right bg-white shadow-sm ${disabledCls}`;
  };

  const labelClasses = (field: 'username' | 'password') =>
    `text-xs font-medium mb-2 pr-1 block transition-all duration-300 ${fieldError === field ? 'text-red-500' : darkMode ? 'text-white/50' : 'text-gray-500'}`;

  return (
    <motion.div
      animate={success ? { opacity: 0, scale: 1.02, filter: 'blur(8px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={`min-h-dvh ${darkMode ? 'bg-[#0a0e1a]' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'} flex flex-col relative overflow-hidden font-sans safe-bottom select-none`}
    >
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Ambient gradient orbs */}
      {darkMode && (
        <>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/8 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-emerald-600/6 rounded-full blur-[80px] pointer-events-none" />
        </>
      )}
      {!darkMode && (
        <>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/30 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}

      {/* Top accent gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-l from-red-600 via-red-500 to-red-700" />

      {/* Status bar spacer */}
      <div className="h-safe-area" />

      {/* ===== HEADER ===== */}
      <div className="relative z-10 flex flex-col items-center pt-6 sm:pt-12 pb-3 sm:pb-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, duration: 1.2 }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] sm:rounded-[24px] flex items-center justify-center mb-3 overflow-hidden"
          style={{
            boxShadow: darkMode ? '0 20px 60px rgba(220,38,38,0.25)' : '0 10px 40px rgba(37,99,235,0.15)'
          }}
        >
          <img
            src="/icon-192.png"
            alt="يمن تليكوم"
            className="w-full h-full object-cover"
          />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className={`text-base sm:text-xl font-bold tracking-wide ${darkMode ? 'text-white/90' : 'text-gray-800'}`}
        >
          يمن تليكوم
        </motion.h1>
      </div>

      {/* ===== FORM CARD ===== */}
      <div className="relative z-10 flex-1 flex flex-col px-3 sm:px-4 pb-4 sm:pb-8">
        <div className="relative w-full max-w-sm mx-auto">
          {/* Spinning decorative ring when fields filled */}
          {fieldsFilled && !isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -inset-1 rounded-[28px] pointer-events-none"
              style={{ zIndex: 0 }}
            >
              <div
                className="w-full h-full rounded-[28px] animate-spin-slow"
                style={{
                  background: `conic-gradient(from 0deg, transparent 60%, ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(59,130,246,0.3)'}, ${darkMode ? 'rgba(255,100,100,0.25)' : 'rgba(99,102,241,0.3)'}, transparent)`,
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
                }}
              />
            </motion.div>
          )}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 20 }}
            className={`relative rounded-3xl p-5 sm:p-7 ${darkMode ? 'bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] shadow-2xl shadow-black/40' : 'bg-white shadow-xl shadow-gray-200/60 border border-gray-100'}`}
            style={{ zIndex: 1 }}
          >
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4.5" noValidate>

            {/* ===== USERNAME ===== */}
            <div className="relative" dir="rtl">
              <label className={labelClasses('username')}>
                {fieldError === 'username' ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                    {errorMsg}
                  </span>
                ) : 'اسم المستخدم'}
              </label>
              <div className="relative">
                <input
                  ref={usernameRef}
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setFieldError(null); setErrorMsg(''); }}
                  onFocus={() => setShowRecent(true)}
                  onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                  placeholder="أدخل اسم المستخدم"
                  autoComplete="username"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={isLoading || success}
                  autoFocus
                  className={focusClasses('username')}
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${darkMode ? 'text-white/30' : 'text-gray-400'}`}>
                  <User size={19} />
                </span>
                {username && (
                  <button
                    type="button"
                    onClick={() => { setUsername(''); setErrorMsg(''); setFieldError(null); passwordRef.current?.focus(); }}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors p-2.5 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${darkMode ? 'text-white/20 hover:text-white/50' : 'text-gray-300 hover:text-gray-500'}`}
                    tabIndex={-1}
                    aria-label="مسح"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>

              {/* Recent accounts dropdown */}
              <AnimatePresence>
                {showRecent && recentAccounts.length > 0 && !username && !isLoading && !success && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute z-20 top-full mt-1.5 left-0 right-0 rounded-2xl overflow-hidden shadow-xl ${darkMode ? 'bg-[#151e2e] border border-white/10 shadow-black/40' : 'bg-white border border-gray-200 shadow-gray-200/80'}`}
                  >
                    <div className={`flex items-center justify-between px-4 py-2.5 border-b ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
                      <span className={`text-[11px] font-medium flex items-center gap-1.5 ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>
                        <Smartphone size={12} />
                        حسابات سابقة
                      </span>
                    </div>
                    {recentAccounts.map((u) => {
                      return (
                        <button
                          key={u}
                          type="button"
                          onMouseDown={() => selectRecent(u)}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-right cursor-pointer ${darkMode ? 'hover:bg-white/5 active:bg-white/10 border-b border-white/5 last:border-0' : 'hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-0'}`}
                        >
                           <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(37,99,235,0.12)', color: 'rgb(37,99,235)' }}>
                            {u.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${darkMode ? 'text-white/80' : 'text-gray-800'}`}>{u}</div>
                          </div>
                          <button
                            type="button"
                            onMouseDown={e => removeRecent(e, u)}
                            className="text-white/20 hover:text-red-400 transition-colors p-1 cursor-pointer"
                            aria-label="إزالة"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </button>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ===== PASSWORD ===== */}
            <div dir="rtl">
              <div className="flex items-center justify-between mb-2">
                <label className={labelClasses('password')}>
                  {fieldError === 'password' ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                      {errorMsg}
                    </span>
                  ) : 'كلمة المرور'}
                </label>
                <button
                  type="button"
                  onClick={() => toastInfo('الرجاء مراجعة مدير النظام لإعادة تعيين كلمة المرور.')}
                  disabled={isLoading || success}
                  className={`text-[11px] transition-colors cursor-pointer py-1 -my-1 disabled:opacity-40 disabled:cursor-not-allowed ${darkMode ? 'text-white/30 hover:text-white/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldError(null); setErrorMsg(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={isLoading || success}
                  className={focusClasses('password') + ' pl-13 tracking-widest'}
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${darkMode ? 'text-white/30' : 'text-gray-400'}`}>
                  <Lock size={19} />
                </span>
                <div className={`absolute left-2 top-1/2 -translate-y-1/2 py-0.5 px-0.5 rounded-xl ${darkMode ? 'bg-black/20' : 'bg-gray-100'}`}>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || success}
                    className={`transition-colors cursor-pointer p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'text-white/30 hover:text-white/60 hover:bg-white/5 active:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 active:bg-gray-200'}`}
                    aria-label={showPassword ? 'إخفاء' : 'إظهار'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>
            </div>

            {/* ===== ERROR BANNER ===== */}
            <AnimatePresence>
              {errorMsg && !fieldError && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== SUBMIT + BIOMETRIC QUICK LOGIN ===== */}
            <div className="flex items-stretch gap-2.5">
              <motion.button
                type="submit"
                disabled={isLoading || success}
                whileTap={{ scale: 0.97 }}
                animate={success ? { backgroundColor: 'rgb(16, 185, 129)' } : {}}
                transition={{ duration: 0.25 }}
                className={`relative flex-1 py-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-90 disabled:cursor-not-allowed overflow-hidden bg-gradient-to-l from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-600/25`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {success ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.22 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.05 }}
                        className="bg-white/25 rounded-full p-1"
                      >
                        <Check size={16} strokeWidth={3} />
                      </motion.div>
                      <span>تم تسجيل الدخول بنجاح</span>
                    </motion.div>
                  ) : isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center gap-1.5"
                      dir="ltr"
                    >
                      <span className="w-2 h-2 rounded-full bg-current" style={{ animation: 'dot-pulse 1.2s ease-in-out infinite', animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-current" style={{ animation: 'dot-pulse 1.2s ease-in-out infinite', animationDelay: '200ms' }} />
                      <span className="w-2 h-2 rounded-full bg-current" style={{ animation: 'dot-pulse 1.2s ease-in-out infinite', animationDelay: '400ms' }} />
                      <span className="mr-2.5 text-xs font-medium opacity-95" dir="rtl">جاري تسجيل الدخول...</span>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center gap-2.5"
                    >
                      <Shield size={18} />
                      <span>تسجيل الدخول</span>
                      <ChevronLeft size={16} className="opacity-60" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {onBiometricLogin && biometricAvailable && (
                <button
                  type="button"
                  onClick={handleBiometric}
                  disabled={biometricLoading || isLoading || success}
                  aria-label="الدخول السريع بالبصمة"
                  className={`w-14 shrink-0 rounded-2xl border transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    darkMode
                      ? 'border-white/10 text-white/70 hover:bg-white/5 active:bg-white/10'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  {biometricLoading ? (
                    <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent" style={{ animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Fingerprint size={22} />
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>
        </div>{/* end card wrapper */}
      </div>

      {/* ===== FOOTER ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="relative z-10 flex flex-col items-center pb-4 sm:pb-6 gap-2"
      >
        <div className={`flex items-center gap-4 ${darkMode ? 'opacity-30' : 'opacity-50'}`}>
          {[
            { color: 'bg-red-500/50', label: 'Yemen Mobile' },
            { color: 'bg-blue-500/50', label: 'Sabafon' },
            { color: 'bg-yellow-400/50', label: 'YOU' },
          ].map((op, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${op.color}`} />
              <span className={`text-[9px] font-medium ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>{op.label}</span>
            </div>
          ))}
        </div>
        <p className={`text-[8px] font-light tracking-wide ${darkMode ? 'text-white/15' : 'text-gray-300'}`}>
          يمن تليكوم v4.2.0 &copy; {new Date().getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className={`flex items-center gap-1.5 text-[9px] px-3 py-1.5 rounded-full transition-all cursor-pointer ${darkMode ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
        >
          <span className="material-symbols-outlined text-[10px]">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          {darkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
        </button>
      </motion.div>
    </motion.div>
  );
}
