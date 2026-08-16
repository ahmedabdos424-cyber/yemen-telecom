/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Agent, ViewType } from '../types';
import { useToast, ToastContainer } from '../hooks/useToast';
import { RefreshCw, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CameraCapture from './shared/CameraCapture';
import { useOcr } from '../hooks/useOcr';

interface AddAgentViewProps {
  onAddAgent: (agent: Partial<Agent> & { username?: string; password?: string }) => Promise<any>;
  setView: (view: ViewType) => void;
}

export default function AddAgentView({ onAddAgent, setView }: AddAgentViewProps) {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning } = useToast();
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameCaptured, setNameCaptured] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ username: string; password: string } | null>(null);
  const { recognize, progress: ocrProgress } = useOcr();

  const handleFullNameCapture = useCallback(async (imageData: string) => {
    const captured = await recognize(imageData);
    if (captured) {
      setFullName(captured);
    }
    setNameCaptured(imageData);
  }, [recognize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !fullName || !phone || !loginUsername.trim() || !loginPassword) {
      toastWarning('الرجاء إدخال الاسم التجاري والاسم الكامل ورقم الجوال وبيانات تسجيل الدخول لتسجيل وكيل التوزيع المعتمد.');
      return;
    }
    if (!nameCaptured) {
      toastWarning('الرجاء التقاط صورة الهوية للوكيل — صورة الهوية إلزامية لتسجيل الوكيل.');
      return;
    }
    if (loginPassword.length < 8 || !/[A-Z]/.test(loginPassword) || !/[a-z]/.test(loginPassword) || !/[0-9]/.test(loginPassword)) {
      toastWarning('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل وتحتوي حرفاً كبيراً وحرفاً صغيراً ورقماً.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onAddAgent({
        name,
        fullName,
        region,
        phone,
        status: 'active',
        username: loginUsername.trim().toLowerCase(),
        password: loginPassword,
      });

      const creds = (res as any)?.credentials || { username: loginUsername.trim().toLowerCase(), password: loginPassword };
      setCreatedResult({ username: creds.username, password: creds.password });
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formValid = Boolean(name && fullName && phone && loginUsername.trim() && loginPassword && nameCaptured);

  return (
    <div className="max-w-xl mx-auto card p-4 md:p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-gray-100 pb-3 md:pb-4">
        <div>
          <h2 className="font-headline-lg text-sm md:text-lg font-bold text-gray-905">تسجيل وكيل أو فرع توزيع معتمد</h2>
        </div>
        <button
          onClick={() => setView('agents')}
          className="btn-icon hover:bg-gray-100 text-gray-500"
          title="رجوع للوكلاء"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 text-right">
        <div>
          <label className="block text-[11px] md:text-xs font-bold text-gray-600 mb-1">الاسم التجاري الكامل للوكيل</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم التجاري"
              className="input-field"
             />
         </div>

         <div>
           <label className="block text-[11px] md:text-xs font-bold text-gray-600 mb-1">الاسم الكامل للوكيل (من الهوية)</label>
           <div className="relative">
             <input
               type="text"
               required
               value={fullName}
               onChange={(e) => setFullName(e.target.value)}
               placeholder="الاسم الرباعي من البطاقة"
               className="input-field pl-14"
             />
             <CameraCapture onCapture={handleFullNameCapture} />
           </div>
           <AnimatePresence>
             {nameCaptured && (
               <motion.span
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1"
               >
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

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
             <div>
               <label className="block text-[11px] md:text-xs font-bold text-gray-600 mb-1">اسم مستخدم تسجيل دخول الوكيل</label>
               <input
                 type="text"
                 required
                 dir="ltr"
                 value={loginUsername}
                 onChange={(e) => setLoginUsername(e.target.value)}
                 placeholder="agent_username"
                 className="input-field"
                 style={{ textAlign: 'right' }}
               />
             </div>

             <div>
               <label className="block text-[11px] md:text-xs font-bold text-gray-600 mb-1">كلمة مرور تسجيل دخول الوكيل</label>
               <div className="relative">
                 <input
                   type={showPassword ? 'text' : 'password'}
                   required
                   minLength={8}
                   dir="ltr"
                   value={loginPassword}
                   onChange={(e) => setLoginPassword(e.target.value)}
                   placeholder="••••••••"
                   className="input-field pl-9"
                   style={{ textAlign: 'right' }}
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 hover:text-gray-600 cursor-pointer touch-target p-1"
                   aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                 >
                   <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                 </button>
               </div>
             </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
             <div>
               <label className="block text-[11px] md:text-xs font-bold text-gray-600 mb-1">إقليم ومنطقة التغطية</label>
             <input
               type="text"
               value={region}
               onChange={(e) => setRegion(e.target.value)}
                 placeholder="أمانة العاصمة"
               className="input-field"
            />
           </div>

           <div>
             <label className="block text-[11px] md:text-xs font-bold text-gray-600 mb-1">رقم الهاتف للفرع (الرئيسي)</label>
             <input
               type="tel"
               required
               value={phone}
               onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                placeholder="7xxxxxxx"
               pattern="[0-9]{7,9}"
               className="input-field"
               dir="ltr"
               style={{ textAlign: 'right' }}
             />
           </div>
         </div>

         <div className="p-2.5 md:p-3 bg-red-50 border border-red-100 rounded-lg text-[10px] md:text-[11px] leading-relaxed text-red-950 flex gap-2 items-start mt-2 md:mt-3">
           <span className="material-symbols-outlined text-red-700 text-sm shrink-0">security</span>
           <span>
             بتسجيل هذا الوكيل، يتعهد العميل بالالتزام بجميع القوانين الأمنية لمكافحة تكرار الهويات والتحقق من رقم الهوية الأصلية لكل مشتري مستجد للشرائح.
           </span>
         </div>

         <div className="flex gap-2 justify-end pt-3 md:pt-4 border-t border-gray-100 mt-3 md:mt-4">
           <button
             type="button"
             onClick={() => setView('agents')}
             className="btn btn-ghost"
            >
              إلغاء التراجع
            </button>
            <button
                type="submit"
                disabled={isSubmitting || !formValid}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isSubmitting ? (
                 <><RefreshCw size={14} className="animate-spin" /> جاري التسجيل...</>
               ) : 'تأكيد وتسجيل الوكيل'}
             </button>
         </div>
       </form>

       {/* Agent credentials success dialog */}
       <AnimatePresence>
         {createdResult && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             onClick={() => setCreatedResult(null)}
             className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-sm"
           >
             <motion.div
               initial={{ scale: 0.95, y: 15 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.95, y: 15 }}
               onClick={(e) => e.stopPropagation()}
               className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 text-right overflow-y-auto max-h-[90vh]"
             >
               <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                 <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                   <Check size={20} />
                 </div>
                 <div>
                   <h3 className="font-bold text-sm text-gray-900">تم تسجيل الوكيل الموزع بنجاح</h3>
                   <p className="text-[10px] text-gray-500">يرجى حفظ بيانات الاعتماد أدناه وتسليمها للوكيل</p>
                 </div>
               </div>

               <div className="space-y-3 mb-4">
                 <div className="bg-gray-50 border border-gray-150 rounded-xl p-3">
                   <span className="block text-[11px] font-bold text-gray-500 mb-1">اسم المستخدم</span>
                   <div className="flex items-center justify-between gap-2">
                     <code className="text-sm font-mono text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex-1 text-left" dir="ltr">{createdResult.username}</code>
                     <button
                       type="button"
                       onClick={() => navigator.clipboard.writeText(createdResult.username)}
                       className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer touch-target"
                       title="نسخ اسم المستخدم"
                     >
                       <Copy size={14} />
                     </button>
                   </div>
                 </div>
                 <div className="bg-gray-50 border border-gray-150 rounded-xl p-3">
                   <span className="block text-[11px] font-bold text-gray-500 mb-1">كلمة المرور</span>
                   <div className="flex items-center justify-between gap-2">
                     <code className="text-sm font-mono text-amber-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex-1 text-left" dir="ltr">{createdResult.password}</code>
                     <button
                       type="button"
                       onClick={() => navigator.clipboard.writeText(createdResult.password)}
                       className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer touch-target"
                       title="نسخ كلمة المرور"
                     >
                       <Copy size={14} />
                     </button>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col gap-2">
                 <button
                   type="button"
                   onClick={async () => {
                     try {
                       await navigator.clipboard.writeText(
                         `اسم المستخدم: ${createdResult.username}\nكلمة المرور: ${createdResult.password}`
                       );
                       toastSuccess('تم نسخ بيانات الدخول بنجاح');
                     } catch {
                       toastError('تعذر النسخ - الرجاء نسخ البيانات يدوياً');
                     }
                   }}
                   className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                 >
                   <Copy size={14} />
                   نسخ جميع بيانات الدخول
                 </button>
                 <button
                   type="button"
                   onClick={() => { setCreatedResult(null); setView('agents'); }}
                   className="w-full py-3 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                 >
                   إغلاق والانتقال للوكلاء
                 </button>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
}
