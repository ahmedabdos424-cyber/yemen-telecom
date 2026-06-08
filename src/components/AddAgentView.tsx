/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Agent, ViewType } from '../types';

interface AddAgentViewProps {
  onAddAgent: (agent: Partial<Agent>) => void;
  setView: (view: ViewType) => void;
}

export default function AddAgentView({ onAddAgent, setView }: AddAgentViewProps) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('أمانة العاصمة');
  const [phone, setPhone] = useState('');
  const [sellersCount, setSellersCount] = useState<number>(0);
  const [simsCount, setSimsCount] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('الرجاء إدخال الاسم ورقم الجوال لتسجيل وكيل التوزيع المعتمد.');
      return;
    }

    onAddAgent({
      name,
      region,
      phone,
      sellersCount,
      simsCount,
      status: 'active'
    });

    alert(`تم تسجيل الوكيل الموزع: "${name}" بنجاح في النظام وتخصيص العقدة الأمانية له.`);
    setView('agents');
  };

  return (
    <div className="max-w-xl mx-auto card p-6">
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
            placeholder="مثال: شركة حضرموت للمقاولات والتوزيع المحدودة"
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
               placeholder="مثال: أمانة العاصمة - صنعاء"
               className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">رقم الهاتف للفرع (الرئيسي)</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثال: 777300400"
              className="input-field"
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
              placeholder="مثال: 12"
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
              placeholder="مثال: 500"
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
             className="btn btn-primary"
          >
            تأكيد وتسجيل الوكيل
          </button>
        </div>
      </form>
    </div>
  );
}
