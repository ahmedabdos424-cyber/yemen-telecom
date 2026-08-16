/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { OperatorDistribution, OperatorDistributionRow } from '../../api/types';

interface OperatorDistributionSectionProps {
  distribution: OperatorDistribution | null;
}

export function OperatorDistributionSection({ distribution }: OperatorDistributionSectionProps) {
  if (!distribution) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2.5 bg-gray-50/50">
          <span className="material-symbols-outlined text-primary">donut_large</span>
          <h4 className="font-bold text-xs text-gray-800">توزيع الشرائح حسب المشغل</h4>
        </div>
        <div className="p-4 space-y-3">
          {Array.isArray(distribution.sims) && distribution.sims.length > 0 ? (
            distribution.sims.map((row: OperatorDistributionRow, i: number) => {
              const total = distribution.sims.reduce((s: number, r: OperatorDistributionRow) => s + (Number(r.count) || 0), 0);
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
          {Array.isArray(distribution.operations) && distribution.operations.length > 0 ? (
            distribution.operations.map((row: OperatorDistributionRow, i: number) => (
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
  );
}
