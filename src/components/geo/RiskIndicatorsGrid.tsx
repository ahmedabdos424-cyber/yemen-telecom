/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SummaryStats } from './riskTypes';

interface RiskIndicatorsGridProps {
  stats: SummaryStats;
  distinctRegionsCount: number;
}

export default function RiskIndicatorsGrid({ stats, distinctRegionsCount }: RiskIndicatorsGridProps) {
  const riskLevelText = stats.riskPct >= 25 ? 'تحذير مرتفع' : stats.highRiskCount > 0 ? 'تحذير' : 'مستقر';
  const riskLevelClass = stats.riskPct >= 25
    ? 'bg-red-100 text-secondary border border-red-200'
    : stats.highRiskCount > 0
      ? 'bg-orange-100 text-orange-700 border border-orange-200'
      : 'bg-emerald-100 text-emerald-700 border border-emerald-200';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Level 0 indicator */}
      <div className="md:col-span-2 card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs text-gray-500 font-bold">مستوى المخاطر التكرارية العالمي</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${riskLevelClass}`}>{riskLevelText}</span>
          </div>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-bold text-gray-900 leading-none">{stats.riskPct.toFixed(1)}%</h3>
            <div className="flex items-center text-secondary text-xs font-bold pb-1 font-mono">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>{stats.highRiskCount} حالة عالية</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed max-w-[90%]">
            إجمالي الهويات المكررة المكتشفة {stats.total} هوية موزعة على {distinctRegionsCount} منطقة، منها {stats.highRiskCount} هوية بمستوى خطورة مرتفع جداً تخضع للمراجعة الفورية.
          </p>
          <div className="mt-5 h-2 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-secondary h-full" style={{ width: `${stats.highBarPct}%` }}></div>
            <div className="bg-orange-500 h-full" style={{ width: `${stats.medBarPct}%` }}></div>
            <div className="bg-green-500 h-full" style={{ width: `${stats.lowBarPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* Counter cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/85 p-5 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-800">
            <span className="material-symbols-outlined text-lg">filter_none</span>
          </div>
          <span className="text-xs text-gray-500 font-bold">إجمالي الهويات المكررة</span>
        </div>
        <div>
          <h4 className="text-2xl font-bold text-gray-900 font-mono">{stats.total.toLocaleString()}</h4>
          <p className="text-[11px] text-gray-400 mt-1">حالة مكررة مشتبه بها نشطة</p>
        </div>
      </div>

      <div className="card p-5 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
            <span className="material-symbols-outlined text-lg">rule</span>
          </div>
          <span className="text-xs text-gray-500 font-bold">الحالات الخاضعة للمراجعة</span>
        </div>
        <div>
          <h4 className="text-2xl font-bold text-gray-900 font-mono">{stats.underReview.toLocaleString()}</h4>
          <p className="text-[11px] text-green-600 font-semibold mt-1">{stats.underReviewPct.toFixed(0)}% من إجمالي التكرارات في العقد</p>
        </div>
      </div>
    </div>
  );
}