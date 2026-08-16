/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActivationReportRow } from '../../api/types';
import { ReportField } from './ReportField';

interface ActivationsLogProps {
  activations: ActivationReportRow[];
  expandedAct: number | null;
  setExpandedAct: (i: number | null) => void;
  openLightbox: (img: string | null) => void;
}

export function ActivationsLog({ activations, expandedAct, setExpandedAct, openLightbox }: ActivationsLogProps) {
  return (
    <>
      <h3 className="font-bold text-sm text-gray-900 mb-3 px-1 flex items-center gap-2">
        سجل التفعيلات وصور العقود
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">{activations.length} عملية</span>
      </h3>
      <div className="card overflow-hidden">
        {activations.length > 0 ? (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {activations.slice(0, 100).map((a: ActivationReportRow, i: number) => {
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
                  {activations.slice(0, 100).map((a: ActivationReportRow, i: number) => (
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
    </>
  );
}
