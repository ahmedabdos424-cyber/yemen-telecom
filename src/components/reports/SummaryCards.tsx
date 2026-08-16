/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface SummaryCardsProps {
  totalSales: number;
  totalActivations: number;
  dailyRate: number;
}

export function SummaryCards({ totalSales, totalActivations, dailyRate }: SummaryCardsProps) {
  return (
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
  );
}
