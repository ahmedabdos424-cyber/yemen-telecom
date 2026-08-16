/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft } from 'lucide-react';
import type { Role } from '../../types';
import { useToast } from '../../hooks/useToast';

interface QuickActionsSectionProps {
  role: Role;
  onActivateSim?: () => void;
}

export default function QuickActionsSection({ role, onActivateSim }: QuickActionsSectionProps) {
  const { toastInfo } = useToast();

  if (role === 'manager') {
    return (
      <div className="bg-gradient-to-r from-red-950/30 to-slate-900 border-r-4 border-red-500 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group">
        <div className="relative z-10 max-w-xl">
          <span className="bg-red-650/20 text-red-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">تقرير الفروقات والتسويات المالي</span>
          <h3 className="text-sm font-bold text-slate-100 mb-1.5 font-sans">توليد التقرير الختامي وتصدير كشوفات التدقيق؟</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-light">
            بصفتك مدير النظام المالي، بإمكانك فحص الإحصائيات الفعّالة لكفاية ونشاط الوكلاء في كافة المحافظات والمناطق اليمنية، ومعالجة وتصحيح العينات التالفة من السيريال المسجل.
          </p>
          <button
            type="button"
            onClick={() => toastInfo('جاري معالجة قاعدة البيانات لتوليد التقرير المالي الموحد بصيغة PDF... تم الإرسال إلى بريدك المعتمد.')}
            className="btn btn-primary mt-3.5"
          >
            <span>تحميل التقرير الموحد لمبيعات الوكلاء</span>
            <ArrowLeft size={12} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-300 pb-1">الإجراءات السريعة</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Quick action 1: تفعيل شريحة جديدة */}
        <button
          type="button"
          onClick={() => onActivateSim?.()}
          className="btn bg-gradient-to-r from-red-650/15 to-slate-900 border border-red-500/25 hover:border-red-500/50 p-4 rounded-xl flex items-center justify-between text-right cursor-pointer group transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-650/10 border border-red-500/20 text-red-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">add_task</span>
            </div>
            <div>
              <p className="font-bold text-xs text-slate-100">تفعيل شريحة جديدة</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">تسجيل عقد وتفعيل شريحة SIM جديدة في الميدان فوراً</p>
            </div>
          </div>
          <ArrowLeft size={16} className="text-slate-400 group-hover:translate-x-[-4px] transition-transform" />
        </button>

      </div>
    </div>
  );
}