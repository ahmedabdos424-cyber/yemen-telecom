/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';

export default function ReportsView() {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [operator, setOperator] = useState('الكل');
  const [region, setRegion] = useState('كافة المناطق');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [agentPerformance, setAgentPerformance] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<any[]>([]);
  const [operatorDistribution, setOperatorDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setFetchError(null);
        const [agents, sales, sellers, dist] = await Promise.all([
          api.getAgentPerformance(),
          api.getDailySales(),
          api.getSellerPerformance(),
          api.getOperatorDistribution(),
        ]);
        if (!mounted) return;
        setAgentPerformance(agents || []);
        setDailySales(sales || []);
        setSellerPerformance(sellers || []);
        setOperatorDistribution(dist || null);
      } catch (err: any) {
        if (!mounted) return;
        setFetchError(err?.message || 'فشل تحميل التقارير');
        setAgentPerformance([]);
        setDailySales([]);
        setSellerPerformance([]);
        setOperatorDistribution(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, []);

  const totalSales = agentPerformance.reduce((sum: number, a: any) => sum + (Number(a.sales_30_days) || 0), 0);
  const totalActivations = dailySales.reduce((sum: number, d: any) => sum + (Number(d.activations) || 0), 0);
  const dailyRate = totalActivations > 0 && dailySales.length > 0
    ? Math.round(totalActivations / Math.max(dailySales.length, 1))
    : 0;

  const triggerExport = () => {
    toastInfo(`تقرير مخصص للشبكة: (${operator}) والمنطقة: (${region}) — ميزة التصدير قيد التطوير`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">جاري تحميل التقارير...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
        <p className="text-sm text-red-400 mb-2">{fetchError}</p>
        <button onClick={() => window.location.reload()} className="btn btn-sm mt-2">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
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
             {totalSales.toLocaleString()} <span className="text-xs font-bold text-gray-500 font-sans">ر.ي</span>
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
             <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">{dailyRate} يومياً</span>
           </div>
           <p className="text-gray-400 text-[11px] font-bold">الشرائح الموزّعة المفعّلة</p>
           <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
             {totalActivations.toLocaleString()} <span className="text-xs font-bold text-gray-500 font-sans">شريحة</span>
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
             {agentPerformance.length > 0 ? (
               agentPerformance.slice(0, 5).map((agent: any) => (
                 <div key={agent.id} className="p-3 hover:bg-gray-50 cursor-pointer rounded-xl flex items-center justify-between transition-colors">
                   <div className="flex items-center gap-3">
                     <span className="material-symbols-outlined text-gray-400">person</span>
                     <div>
                       <p className="text-xs font-semibold text-gray-900">{agent.agent_name}</p>
                       <p className="text-[11px] text-gray-450 mt-1">{agent.region} • {agent.seller_count} بائعين • {agent.sales_30_days.toLocaleString()} ر.ي</p>
                     </div>
                   </div>
                   <span className="material-symbols-outlined text-gray-300">chevron_left</span>
                 </div>
               ))
             ) : (
               <>
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
               </>
             )}
           </div>
         </div>

        <div className="card overflow-hidden">
           <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/50">
             <span className="material-symbols-outlined text-secondary">store</span>
             <h4 className="font-bold text-xs text-gray-800">تقارير مبيعات وجرد البائعين</h4>
           </div>
           <div className="p-2 divide-y divide-gray-100">
             {sellerPerformance.length > 0 ? (
               sellerPerformance.slice(0, 5).map((seller: any) => (
                 <div key={seller.id} className="p-3 hover:bg-gray-50 cursor-pointer rounded-xl flex items-center justify-between transition-colors">
                   <div className="flex items-center gap-3">
                     <span className="material-symbols-outlined text-gray-400">storefront</span>
                     <div>
                       <p className="text-xs font-semibold text-gray-900">{seller.store_name || seller.name}</p>
                       <p className="text-[11px] text-gray-450 mt-1">{seller.region} • {seller.sales_30_days.toLocaleString()} ر.ي • كفاءة {seller.efficiency}%</p>
                     </div>
                   </div>
                   <span className="material-symbols-outlined text-gray-300">chevron_left</span>
                 </div>
               ))
             ) : (
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
             )}
           </div>
         </div>
      </div>

      {/* Downloads list archive */}
      <h3 className="font-bold text-sm text-gray-900 mb-3 px-1 flex items-center gap-2">
        سجلات التصدير والتحميل السابقة
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">قيد التطوير</span>
      </h3>
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center space-y-2">
        <span className="material-symbols-outlined text-3xl text-gray-400">history</span>
        <p className="text-xs font-bold text-gray-600">أرشيف التقارير السابقة قيد التطوير</p>
        <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm mx-auto">
          سيكون بإمكانك تنزيل التقارير المصدّرة سابقاً (PDF / XLS) بمجرد اكتمال ميزة الأرشيف. حالياً يمكنك تصدير التقرير الحالي عبر زر التصدير أعلاه.
        </p>
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
