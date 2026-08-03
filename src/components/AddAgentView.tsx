/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Agent, ViewType } from '../types';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';
import { RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CameraCapture from './shared/CameraCapture';
import { useOcr } from '../hooks/useOcr';

interface AddAgentViewProps {
  onAddAgent: (agent: Partial<Agent> & { username?: string; password?: string }) => void;
  setView: (view: ViewType) => void;
}

export default function AddAgentView({ onAddAgent, setView }: AddAgentViewProps) {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameCaptured, setNameCaptured] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (loginPassword.length < 8 || !/[A-Z]/.test(loginPassword) || !/[a-z]/.test(loginPassword) || !/[0-9]/.test(loginPassword)) {
      toastWarning('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل وتحتوي حرفاً كبيراً وحرفاً صغيراً ورقماً.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddAgent({
        name,
        fullName,
        region,
        phone,
        status: 'active',
        username: loginUsername.trim().toLowerCase(),
        password: loginPassword,
      });

      toastSuccess(`تم تسجيل الوكيل الموزع: "${fullName}" بنجاح في النظام وتخصيص العقدة الأمانية له.`);
      setView('agents');
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

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
                disabled={isSubmitting}
                className="btn btn-primary flex items-center gap-2"
             >
               {isSubmitting ? (
                 <><RefreshCw size={14} className="animate-spin" /> جاري التسجيل...</>
               ) : 'تأكيد وتسجيل الوكيل'}
             </button>
         </div>
       </form>
     </div>
   );
}
