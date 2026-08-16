/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SellerReportRow } from '../../api/types';
import { ReportField } from './ReportField';

interface SellersRegistryProps {
  sellersReport: SellerReportRow[];
  expandedSeller: number | null;
  setExpandedSeller: (i: number | null) => void;
  openLightbox: (img: string | null) => void;
}

export function SellersRegistry({ sellersReport, expandedSeller, setExpandedSeller, openLightbox }: SellersRegistryProps) {
  return (
    <>
      <h3 className="font-bold text-sm text-gray-900 mb-3 px-1 flex items-center gap-2">
        سجل البائعين وصور الهوية
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">{sellersReport.length} بائع</span>
      </h3>
      <div className="card overflow-hidden">
        {sellersReport.length > 0 ? (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {sellersReport.slice(0, 100).map((s: SellerReportRow, i: number) => (
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
                  {sellersReport.slice(0, 100).map((s: SellerReportRow, i: number) => (
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
    </>
  );
}
