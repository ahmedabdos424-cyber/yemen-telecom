/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useToast, ToastContainer } from '../hooks/useToast';
import { api } from '../api/client';
import type {
  ActivationReportRow,
  SellerReportRow,
  AgentPerformanceRow,
  DailySalesRow,
  SellerPerformanceRow,
  OperatorDistribution,
} from '../api/types';
import { SummaryCards } from './reports/SummaryCards';
import { ReportCategories } from './reports/ReportCategories';
import { OperatorDistributionSection } from './reports/OperatorDistributionSection';
import { ActivationsLog } from './reports/ActivationsLog';
import { SellersRegistry } from './reports/SellersRegistry';

export default function ReportsView() {
  const { toasts, dismissToast, toastSuccess, toastWarning } = useToast();
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [operator, setOperator] = useState('الكل');
  const [region, setRegion] = useState('كافة المناطق');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceRow[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesRow[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<SellerPerformanceRow[]>([]);
  const [activations, setActivations] = useState<ActivationReportRow[]>([]);
  const [sellersReport, setSellersReport] = useState<SellerReportRow[]>([]);
  const [operatorDistribution, setOperatorDistribution] = useState<OperatorDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [expandedSeller, setExpandedSeller] = useState<number | null>(null);

  const openLightbox = (img: string | null) => {
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

  const totalSales = agentPerformance.reduce((sum: number, a: AgentPerformanceRow) => sum + (Number(a.sales_30_days) || 0), 0);
  const totalActivations = dailySales.reduce((sum: number, d: DailySalesRow) => sum + (Number(d.activations) || 0), 0);
  const dailyRate = totalActivations > 0 && dailySales.length > 0
    ? Math.round(totalActivations / Math.max(dailySales.length, 1))
    : 0;

  const triggerExport = () => {
    const rows = activations.length > 0
      ? activations.map((a: ActivationReportRow) => ({
          'التاريخ': a.date || '',
          'الوقت': a.time || '',
          'الرقم': a.target || '',
          'المشغل': a.operator || '',
          'اسم العميل': a.customer_name || '',
          'رقم الهوية': a.customer_id || '',
          'المنفذ': a.actor_name || a.seller_name || a.agent_name || '',
          'الحالة': a.status || '',
        }))
      : sellerPerformance.map((s: SellerPerformanceRow) => ({
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
    const escape = (v: unknown) => {
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

      <SummaryCards totalSales={totalSales} totalActivations={totalActivations} dailyRate={dailyRate} />

      <ReportCategories agentPerformance={agentPerformance} sellerPerformance={sellerPerformance} />

      <OperatorDistributionSection distribution={operatorDistribution} />

      <ActivationsLog
        activations={activations}
        expandedAct={expandedAct}
        setExpandedAct={setExpandedAct}
        openLightbox={openLightbox}
      />

      <SellersRegistry
        sellersReport={sellersReport}
        expandedSeller={expandedSeller}
        setExpandedSeller={setExpandedSeller}
        openLightbox={openLightbox}
      />

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
