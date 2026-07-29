/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Agent, ViewType } from '../types';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';
import { RefreshCw } from 'lucide-react';

interface AddAgentViewProps {
  onAddAgent: (agent: Partial<Agent>) => void;
  setView: (view: ViewType) => void;
}

export default function AddAgentView({ onAddAgent, setView }: AddAgentViewProps) {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();
  const [name, setName] = useState('');
  const [region, setRegion] = useState('أمانة العاصمة');
  const [phone, setPhone] = useState('');
  const [sellersCount, setSellersCount] = useState<number>(0);
  const [simsCount, setSimsCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toastWarning('الرجاء إدخال الاسم ورقم الجوال لتسجيل وكيل التوزيع المعتمد.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddAgent({
        name,
        region,
        phone,
        sellersCount,
        simsCount,
        status: 'active'
      });

      toastSuccess(`تم تسجيل الوكيل الموزع: "${name}" بنجاح في النظام وتخصيص العقدة الأمانية له.`);
      setView('agents');
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto card p-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="font-headline-lg text-lg font-bold text-gray-905">تسجيل وكيل أو فرع توزيع معتمد</h2>

        </div>
        <button
          onClick={() => setView('agents')}
          className="btn-icon hover:bg-gray-100 text-gray-500"
          title="رجوع للوكلاء"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5">الاسم التجاري الكامل للوكيل</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم التجاري"
              className="input-field"
             />
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
             <label className="block text-xs font-bold text-gray-600 mb-1.5">إقليم ومنطقة التغطية</label>
             <input
               type="text"
               value={region}
               onChange={(e) => setRegion(e.target.value)}
                placeholder="المنطقة / المدينة"
               className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">رقم الهاتف للفرع (الرئيسي)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
              placeholder="7xxxxxx"
              pattern="[0-9]{7,9}"
              className="input-field"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">عدد نقاط البيع التابعة له مبدئياً</label>
            <input
              type="number"
              min="0"
              value={sellersCount}
              onChange={(e) => setSellersCount(Number(e.target.value))}
              placeholder="عدد النقاط"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">عدد شرائح SIM المخصّصة كعهدة</label>
            <input
              type="number"
              min="0"
              value={simsCount}
              onChange={(e) => setSimsCount(Number(e.target.value))}
              placeholder="عدد الشرائح"
              className="input-field"
            />
          </div>
        </div>

        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[11px] leading-relaxed text-red-950 flex gap-2 items-start mt-3">
          <span className="material-symbols-outlined text-red-700 text-sm">security</span>
          <span>
            بتسجيل هذا الوكيل، يتعهد العميل بالالتزام بجميع القوانين الأمنية لمكافحة تكرار الهويات والتحقق من رقم الهوية الأصلية لكل مشتري مستجد للشرائح.
          </span>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 mt-4">
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
