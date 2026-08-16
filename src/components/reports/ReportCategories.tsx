/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentPerformanceRow, SellerPerformanceRow } from '../../api/types';

interface ReportCategoriesProps {
  agentPerformance: AgentPerformanceRow[];
  sellerPerformance: SellerPerformanceRow[];
}

export function ReportCategories({ agentPerformance, sellerPerformance }: ReportCategoriesProps) {
  return (
    <>
      <h3 className="font-bold text-sm text-gray-900 mb-3 px-1">تصنيفات التقارير المتوفرة</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/50">
            <span className="material-symbols-outlined text-primary">partner_exchange</span>
            <h4 className="font-bold text-xs text-gray-800">تقارير الوكلاء والموزعين</h4>
          </div>
          <div className="p-2 divide-y divide-gray-100">
            {agentPerformance.length > 0 ? (
              agentPerformance.slice(0, 5).map((agent: AgentPerformanceRow) => (
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
              sellerPerformance.slice(0, 5).map((seller: SellerPerformanceRow) => (
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
    </>
  );
}
