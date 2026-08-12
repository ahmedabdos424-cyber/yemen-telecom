/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';

function ReportField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-2">
      <p className="text-[9px] font-bold text-gray-400 mb-0.5">{label}</p>
      <p className={`text-[11px] font-bold text-gray-800 break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

export default function ReportsView() {
  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [operator, setOperator] = useState('الكل');
  const [region, setRegion] = useState('كافة المناطق');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [agentPerformance, setAgentPerformance] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<any[]>([]);
  const [activations, setActivations] = useState<any[]>([]);
  const [sellersReport, setSellersReport] = useState<any[]>([]);
  const [operatorDistribution, setOperatorDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [expandedSeller, setExpandedSeller] = useState<number | null>(null);

  const openLightbox = (img: string) => {
    setLightboxImage(img);
    setLightboxZoom(1);
  };

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setFetchError(null);
        const [agents, sales, sellers, dist, activ, sellersReg] = await Promise.all([
          api.getAgentPerformance(),
          api.getDailySales(),
          api.getSellerPerformance(),
          api.getOperatorDistribution(),
          api.getActivationsReport().catch(() => []),
          api.getSellersReport().catch(() => []),
        ]);
        if (!mounted) return;
        setAgentPerformance(agents || []);
        setDailySales(sales || []);
        setSellerPerformance(sellers || []);
        setOperatorDistribution(dist || null);
        setActivations(activ || []);
        setSellersReport(sellersReg || []);
      } catch (err: unknown) {
        if (!mounted) return;
        setFetchError(err instanceof Error ? err.message : String(err));
        setAgentPerformance([]);
        setDailySales([]);
        setSellerPerformance([]);
        setOperatorDistribution(null);
        setActivations([]);
        setSellersReport([]);
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
    const rows = activations.length > 0
      ? activations.map((a: any) => ({
          'التاريخ': a.date || '',
          'الوقت': a.time || '',
          'الرقم': a.target || '',
          'المشغل': a.operator || '',
          'اسم العميل': a.customer_name || '',
          'رقم الهوية': a.customer_id || '',
          'المنفذ': a.actor_name || a.seller_name || a.agent_name || '',
          'الحالة': a.status || '',
        }))
      : sellerPerformance.map((s: any) => ({
          'البائع': s.name || '',
          'المحل': s.store_name || '',
          'المنطقة': s.region || '',
          'المبيعات (30 يوم)': s.sales_30_days ?? '',
          'الكفاءة %': s.efficiency ?? '',
          'عدد الشرائح': s.sims_count ?? '',
        }));
    if (rows.length === 0) {
      toastWarning('لا توجد بيانات للتصدير بعد');
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => headers.map(h => escape((r as Record<string, unknown>)[h])).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yemen-telecom-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastSuccess('تم تصدير التقرير بنجاح بصيغة CSV');
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <button
          onClick={() => triggerExport()}
          className="btn btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[20px]">file_download</span>
          <span className="hidden sm:inline">تصدير التقرير الحالي للشبكة</span>
          <span className="sm:hidden">تصدير التقرير</span>
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

      {/* Operator distribution */}
      {operatorDistribution && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/50">
              <span className="material-symbols-outlined text-primary">donut_large</span>
              <h4 className="font-bold text-xs text-gray-800">توزيع الشرائح حسب المشغل</h4>
            </div>
            <div className="p-4 space-y-3">
              {Array.isArray(operatorDistribution.sims) && operatorDistribution.sims.length > 0 ? (
                operatorDistribution.sims.map((row: any, i: number) => {
                  const total = operatorDistribution.sims.reduce((s: number, r: any) => s + (Number(r.count) || 0), 0);
                  const pct = total > 0 ? Math.round(((Number(row.count) || 0) / total) * 100) : 0;
                  const colors = ['bg-ym', 'bg-sf', 'bg-you', 'bg-emerald-500', 'bg-violet-500'];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-gray-700">{row.operator}</span>
                        <span className="font-mono font-bold text-gray-500">{row.count} • {pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">لا توجد بيانات توزيع متاحة</p>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/50">
              <span className="material-symbols-outlined text-secondary">cable</span>
              <h4 className="font-bold text-xs text-gray-800">عمليات الشبكات (التفعيل/الشحن)</h4>
            </div>
            <div className="divide-y divide-gray-100">
              {Array.isArray(operatorDistribution.operations) && operatorDistribution.operations.length > 0 ? (
                operatorDistribution.operations.map((row: any, i: number) => (
                  <div key={i} className="p-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800">{row.operator}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === 'success' ? 'bg-green-50 text-green-600' : row.status === 'failed' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                        {row.status === 'success' ? 'ناجحة' : row.status === 'failed' ? 'فاشلة' : 'قيد التنفيذ'}
                      </span>
                      <span className="font-mono font-bold text-gray-700 text-xs">{row.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">لا توجد بيانات عمليات متاحة</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activations log with contract images */}
      <h3 className="font-bold text-sm text-gray-900 mb-3 px-1 flex items-center gap-2">
        سجل التفعيلات وصور العقود
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">{activations.length} عملية</span>
      </h3>
      <div className="card overflow-hidden">
        {activations.length > 0 ? (
          <>
          <div className="md:hidden divide-y divide-gray-100">
            {activations.slice(0, 100).map((a: any, i: number) => {
              const performer = a.seller_name || a.actor_name || a.agent_name || '—';
              const dateText = `${a.date || ''}${a.time ? ` ${a.time}` : ''}`;
              return (
                <div key={a.op_id || i}>
                  <button
                    type="button"
                    onClick={() => setExpandedAct(expandedAct === i ? null : i)}
                    className="w-full p-4 flex items-center justify-between gap-3 text-right"
                    aria-expanded={expandedAct === i}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 font-mono truncate">{a.target || '—'}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{a.operator || '—'}{a.customer_name ? ` • ${a.customer_name}` : ''}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{dateText || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.contract_image ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openLightbox(a.contract_image); }}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0"
                          title="عرض صورة العقد"
                        >
                          <img src={a.contract_image} alt="صورة العقد" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ) : (
                        <span className="material-symbols-outlined text-gray-300 text-lg">image_not_supported</span>
                      )}
                      <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform duration-200 ${expandedAct === i ? 'rotate-180' : ''}`}>expand_more</span>
                    </div>
                  </button>
                  {expandedAct === i && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <ReportField label="التاريخ" value={dateText || '—'} mono />
                        <ReportField label="المشغل" value={a.operator || '—'} />
                        <ReportField label="رقم الهاتف" value={a.target || '—'} mono />
                        <ReportField label="الرقم التسلسلي" value={a.iccid || '—'} mono />
                        <ReportField label="اسم العميل" value={a.customer_name || '—'} />
                        <ReportField label="رقم الهوية" value={a.customer_id || '—'} mono />
                        <ReportField label="المنفذ" value={performer} />
                      </div>
                      {a.contract_image ? (
                        <div className="mt-2.5">
                          <p className="text-[10px] font-bold text-gray-400 mb-1">صورة العقد</p>
                          <button
                            type="button"
                            onClick={() => openLightbox(a.contract_image)}
                            className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-300 transition-shadow"
                          >
                            <img src={a.contract_image} alt="صورة العقد" className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50/70 text-[11px] text-gray-500 border-b border-gray-100">
                  <th className="p-3 font-bold">التاريخ</th>
                  <th className="p-3 font-bold">رقم الهاتف</th>
                  <th className="p-3 font-bold">الرقم التسلسلي (ICCID)</th>
                  <th className="p-3 font-bold">اسم العميل</th>
                  <th className="p-3 font-bold">رقم الهوية</th>
                  <th className="p-3 font-bold">المشغل</th>
                  <th className="p-3 font-bold">المنفذ</th>
                  <th className="p-3 font-bold">صورة العقد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activations.slice(0, 100).map((a: any, i: number) => (
                  <tr key={a.op_id || i} className="hover:bg-gray-50/60 text-xs">
                    <td className="p-3 font-mono text-gray-500 whitespace-nowrap">{a.date || ''}{a.time ? ` ${a.time}` : ''}</td>
                    <td className="p-3 font-mono font-bold text-gray-800">{a.target || ''}</td>
                    <td className="p-3 font-mono text-gray-600">{a.iccid || '—'}</td>
                    <td className="p-3 font-semibold text-gray-900">{a.customer_name || '—'}</td>
                    <td className="p-3 font-mono text-gray-600">{a.customer_id || '—'}</td>
                    <td className="p-3 text-gray-600">{a.operator || '—'}</td>
                    <td className="p-3 text-gray-600">{a.seller_name || a.actor_name || a.agent_name || '—'}</td>
                    <td className="p-3">
                      {a.contract_image ? (
                        <button
                          type="button"
                          onClick={() => openLightbox(a.contract_image)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-300 transition-shadow"
                          title="عرض صورة العقد"
                        >
                          <img src={a.contract_image} alt="صورة العقد" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">بدون صورة</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-gray-300">receipt_long</span>
            <p className="text-xs font-bold text-gray-500">لا توجد عمليات تفعيل مسجلة بعد</p>
            <p className="text-[11px] text-gray-400">ستظهر هنا عمليات التفعيل مع صور العقود عند إنجاز أول عملية.</p>
          </div>
        )}
      </div>

      {/* Sellers registry with ID photos */}
      <h3 className="font-bold text-sm text-gray-900 mb-3 px-1 flex items-center gap-2">
        سجل البائعين وصور الهوية
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">{sellersReport.length} بائع</span>
      </h3>
      <div className="card overflow-hidden">
        {sellersReport.length > 0 ? (
          <>
          <div className="md:hidden divide-y divide-gray-100">
            {sellersReport.slice(0, 100).map((s: any, i: number) => (
              <div key={s.id || i}>
                <button
                  type="button"
                  onClick={() => setExpandedSeller(expandedSeller === i ? null : i)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-right"
                  aria-expanded={expandedSeller === i}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{s.name || '—'}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{s.store_name || '—'}{s.region ? ` • ${s.region}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.avatar ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openLightbox(s.avatar); }}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0"
                        title="عرض صورة الهوية"
                      >
                        <img src={s.avatar} alt="صورة الهوية" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ) : (
                      <span className="material-symbols-outlined text-gray-300 text-lg">image_not_supported</span>
                    )}
                    <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform duration-200 ${expandedSeller === i ? 'rotate-180' : ''}`}>expand_more</span>
                  </div>
                </button>
                {expandedSeller === i && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <ReportField label="البائع" value={s.name || '—'} />
                      <ReportField label="المحل" value={s.store_name || '—'} />
                      <ReportField label="رقم الهوية" value={s.id_number || '—'} mono />
                      <ReportField label="المنطقة" value={s.region || '—'} />
                      <ReportField label="الوكيل" value={s.agent_name || '—'} />
                      <ReportField label="الحالة" value={s.status === 'active' ? 'نشط' : s.status === 'suspended' ? 'موقوف' : s.status || '—'} />
                    </div>
                    {s.avatar ? (
                      <div className="mt-2.5">
                        <p className="text-[10px] font-bold text-gray-400 mb-1">صورة الهوية</p>
                        <button
                          type="button"
                          onClick={() => openLightbox(s.avatar)}
                          className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-emerald-300 transition-shadow"
                        >
                          <img src={s.avatar} alt="صورة الهوية" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50/70 text-[11px] text-gray-500 border-b border-gray-100">
                  <th className="p-3 font-bold">البائع</th>
                  <th className="p-3 font-bold">المحل</th>
                  <th className="p-3 font-bold">رقم الهوية</th>
                  <th className="p-3 font-bold">المنطقة</th>
                  <th className="p-3 font-bold">الوكيل</th>
                  <th className="p-3 font-bold">الحالة</th>
                  <th className="p-3 font-bold">صورة الهوية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellersReport.slice(0, 100).map((s: any, i: number) => (
                  <tr key={s.id || i} className="hover:bg-gray-50/60 text-xs">
                    <td className="p-3 font-semibold text-gray-900">{s.name || ''}</td>
                    <td className="p-3 text-gray-600">{s.store_name || '—'}</td>
                    <td className="p-3 font-mono text-gray-600">{s.id_number || '—'}</td>
                    <td className="p-3 text-gray-600">{s.region || '—'}</td>
                    <td className="p-3 text-gray-600">{s.agent_name || '—'}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-50 text-green-600' : s.status === 'suspended' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                        {s.status === 'active' ? 'نشط' : s.status === 'suspended' ? 'موقوف' : s.status || '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      {s.avatar ? (
                        <button
                          type="button"
                          onClick={() => openLightbox(s.avatar)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-emerald-300 transition-shadow"
                          title="عرض صورة الهوية"
                        >
                          <img src={s.avatar} alt="صورة الهوية" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">بدون صورة</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-gray-300">badge</span>
            <p className="text-xs font-bold text-gray-500">لا يوجد بائعون مسجلون بعد</p>
            <p className="text-[11px] text-gray-400">ستظهر صور الهويات الملتقطة عند تسجيل أول بائع.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-3xl w-full flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 bg-black/40 rounded-full p-1 backdrop-blur-sm">
              <span className="text-white/80 text-[11px] font-bold font-mono px-2 min-w-[44px] text-center">{Math.round(lightboxZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setLightboxZoom(z => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
                title="تصغير"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
                title="إعادة ضبط التكبير"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(z => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
                title="تكبير"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
                title="إغلاق"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="w-full max-h-[80vh] overflow-auto rounded-xl bg-black/40">
              <img
                src={lightboxImage}
                alt="صورة كبيرة"
                className="w-full object-contain transition-transform duration-200 origin-top"
                style={{ transform: `scale(${lightboxZoom})` }}
              />
            </div>
          </div>
        </div>
      )}

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

              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowFilterDrawer(false)}
                  className="btn btn-ghost text-xs w-full sm:w-auto"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => { setShowFilterDrawer(false); triggerExport(); }}
                  className="btn btn-primary text-xs w-full sm:w-auto"
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
