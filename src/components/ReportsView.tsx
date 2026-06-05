/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

export default function ReportsView() {
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [operator, setOperator] = useState('الكل');
  const [region, setRegion] = useState('كافة المناطق');
  const [reportDate, setReportDate] = useState('2023-11-20');

  const downloads = [
    { id: '1', title: 'ملخص مبيعات تعز الموزعة', file: 'PDF', date: '2023-11-20', maker: 'أحمد محمد' },
    { id: '2', title: 'جرد المستودع الرئيسي بالعقدة', file: 'XLS', date: '2023-11-20', maker: 'سارة خليل' },
    { id: '3', title: 'تقرير التدقيق الجغرافي السنوي', file: 'PDF', date: '2023-11-18', maker: 'نظام المراقبة' }
  ];

  const triggerExport = () => {
    alert(`جاري تجهيز تقرير مخصص للشبكة: (${operator}) والمنطقة: (${region}) للتصدير بصيغة PDF...`);
    setTimeout(() => {
      alert('اكتمل التجهيز ومزامنة البيانات وتصدير الملف بنجاح!');
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Top action metrics */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => triggerExport()}
          className="btn btn-primary flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">file_download</span>
          تصدير التقرير الحالي للشبكة
        </button>
        <button
          onClick={() => setShowFilterDrawer(true)}
          className="btn-icon bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
          title="تصفية الفلاتر"
        >
          <span className="material-symbols-outlined text-xl">filter_list</span>
        </button>
      </div>

      {/* Summary figures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
           <div className="flex justify-between items-start mb-3">
             <div className="p-2 bg-red-50 text-secondary rounded-lg border border-red-100">
               <span className="material-symbols-outlined text-[20px]">trending_up</span>
             </div>
             <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+12.4%</span>
           </div>
           <p className="text-gray-400 text-[11px] font-bold">إجمالي المبيعات المحقّقة (شهري)</p>
           <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
             45,820 <span className="text-xs font-bold text-gray-500 font-sans">ر.ي</span>
           </p>
           <div className="h-4 mt-3 flex items-end gap-1 pointer-events-none">
             <div className="flex-1 bg-secondary/15 h-[30%] rounded-sm"></div>
             <div className="flex-1 bg-secondary/15 h-[50%] rounded-sm"></div>
             <div className="flex-1 bg-secondary/30 h-[40%] rounded-sm"></div>
             <div className="flex-1 bg-secondary/15 h-[70%] rounded-sm"></div>
             <div className="flex-1 bg-secondary/40 h-[80%] rounded-sm"></div>
           </div>
         </div>

        <div className="card">
           <div className="flex justify-between items-start mb-3">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-105">
               <span className="material-symbols-outlined text-[20px]">sim_card</span>
             </div>
             <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">416 يومياً</span>
           </div>
           <p className="text-gray-400 text-[11px] font-bold">الشرائح الموزّعة المفعّلة</p>
           <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
             12,504 <span className="text-xs font-bold text-gray-500 font-sans">شريحة</span>
           </p>
           <div className="h-4 mt-3 flex items-end gap-1 pointer-events-none">
             <div className="flex-1 bg-blue-200/40 h-[40%] rounded-sm"></div>
             <div className="flex-1 bg-blue-200/40 h-[60%] rounded-sm"></div>
             <div className="flex-1 bg-blue-200/60 h-[50%] rounded-sm"></div>
             <div className="flex-1 bg-blue-200/40 h-[30%] rounded-sm"></div>
             <div className="flex-1 bg-blue-200/80 h-[90%] rounded-sm"></div>
           </div>
         </div>
      </div>

      {/* Reports Categories */}
      <h3 className="font-bold text-sm text-gray-900 mb-3 px-1">تصنيفات التقارير المتوفرة</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
           <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/50">
             <span className="material-symbols-outlined text-primary">partner_exchange</span>
             <h4 className="font-bold text-xs text-gray-800">تقارير الوكلاء والموزعين</h4>
           </div>
           <div className="p-2 divide-y divide-gray-100">
             <div className="p-3 hover:bg-gray-50 cursor-pointer rounded-xl flex items-center justify-between transition-colors">
               <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-gray-400">description</span>
                 <div>
                   <p className="text-xs font-semibold text-gray-900">سجل النشاط الشهري المتصل للوكالة</p>
                   <p className="text-[11px] text-gray-450 mt-1">تحديث قبل ساعتين</p>
                 </div>
               </div>
               <span className="material-symbols-outlined text-gray-300">chevron_left</span>
             </div>
             <div className="p-3 hover:bg-gray-50 cursor-pointer rounded-xl flex items-center justify-between transition-colors">
               <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-gray-400">map</span>
                 <div>
                   <p className="text-xs font-semibold text-gray-900">تقرير تفصيلي للتوزّع الجغرافي</p>
                   <p className="text-[11px] text-gray-450 mt-1">تقرير ديموغرافي إحصائي أمني</p>
                 </div>
               </div>
               <span className="material-symbols-outlined text-gray-300">chevron_left</span>
             </div>
           </div>
         </div>

        <div className="card overflow-hidden">
           <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/50">
             <span className="material-symbols-outlined text-secondary">store</span>
             <h4 className="font-bold text-xs text-gray-800">تقارير مبيعات وجرد البائعين</h4>
           </div>
           <div className="p-2 divide-y divide-gray-100">
             <div className="p-3 hover:bg-gray-50 cursor-pointer rounded-xl flex items-center justify-between transition-colors">
               <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-gray-400">person_search</span>
                 <div>
                   <p className="text-xs font-semibold text-gray-900">أداء البائعين الفردي والترتيب الشهري</p>
                   <p className="text-[11px] text-gray-450 mt-1">تحليل أسبوعي مطلع لمعدلات الإنتاج</p>
                 </div>
               </div>
               <span className="material-symbols-outlined text-gray-300">chevron_left</span>
             </div>
           </div>
         </div>
      </div>

      {/* Downloads list archive */}
      <h3 className="font-bold text-sm text-gray-900 mb-3 px-1">سجلات التصدير والتحميل السابقة</h3>
      <div className="space-y-3">
        {downloads.map((dl) => (
          <div key={dl.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 ${
                dl.file === 'PDF' ? 'bg-red-50 text-secondary' : 'bg-green-50 text-green-700'
              }`}>
                {dl.file}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{dl.title}</p>
                <p className="text-[11px] text-gray-505 mt-1 font-mono">{dl.date} • المعدّ: {dl.maker}</p>
              </div>
            </div>
            <button
              onClick={() => alert(`جاري تنزيل ملف ${dl.title} بصيغة .${dl.file.toLowerCase()}`)}
              className="btn-icon text-gray-700 hover:text-secondary hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-xl">download</span>
            </button>
          </div>
        ))}
      </div>

      {/* Drawer Filter popup style */}
      {showFilterDrawer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="card w-full max-w-lg rounded-t-3xl shadow-2xl p-6 text-right space-y-5 animate-in slide-in-from-bottom duration-250">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2"></div>
            <h3 className="text-sm font-bold text-gray-900">خيارات تصفية وتجهيز التقارير</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">تاريخ وجدول التقرير</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">الشبكة المشغلة</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="input-field outline-none"
                  >
                    <option>الكل</option>
                    <option>يمن موبايل</option>
                    <option>سبأفون</option>
                    <option>يو</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">منطقة المبيعات</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="input-field outline-none"
                  >
                    <option>كافة المناطق</option>
                    <option>صنعاء</option>
                    <option>عدن</option>
                    <option>تعز</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowFilterDrawer(false)}
                  className="btn btn-ghost text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => { setShowFilterDrawer(false); triggerExport(); }}
                  className="btn btn-primary text-xs"
                >
                  تطبيق الفلاتر والتجهيز
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
