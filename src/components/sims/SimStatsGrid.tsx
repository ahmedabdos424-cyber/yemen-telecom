/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import OperatorLogo from '../shared/OperatorLogo';
import { StatsCardSkeleton } from '../shared/Skeleton';

export interface SimStats {
  total: number;
  available: number;
  assigned: number;
  activated: number;
  reserved: number;
  inactive: number;
}

interface SimStatsGridProps {
  stats: SimStats;
  loading: boolean;
}

export default function SimStatsGrid({ stats, loading }: SimStatsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
      <div className="stat-card stat-card-ym">
        <div className="flex justify-between items-start mb-1.5 md:mb-2">
          <OperatorLogo provider="yemen_mobile" size="sm" />
          <span className="text-[10px] md:text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">+12%</span>
        </div>
        <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">إجمالي الشرائح</p>
        <h4 className="stat-card-value font-mono">{stats.total}</h4>
      </div>

      <div className="stat-card">
        <div className="flex justify-between items-start mb-1.5 md:mb-2">
          <span className="material-symbols-outlined text-green-600 bg-green-50 border border-green-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm">check_circle</span>
          <span className="text-[10px] md:text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">جاهز</span>
        </div>
        <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">المتاحة للبيع</p>
        <h4 className="stat-card-value font-mono">{stats.available}</h4>
      </div>

      <div className="stat-card">
        <div className="flex justify-between items-start mb-1.5 md:mb-2">
          <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 border border-indigo-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm">assignment_turned_in</span>
          <span className="text-[10px] md:text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">مسندة</span>
        </div>
        <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">المسندة لوكلاء/بائعين</p>
        <h4 className="stat-card-value font-mono">{stats.assigned}</h4>
      </div>

      <div className="stat-card">
        <div className="flex justify-between items-start mb-1.5 md:mb-2">
          <span className="material-symbols-outlined text-teal-600 bg-teal-50 border border-teal-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm">verified</span>
          <span className="text-[10px] md:text-[11px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full">مفعّلة</span>
        </div>
        <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">المفعّلة للعملاء</p>
        <h4 className="stat-card-value font-mono">{stats.activated}</h4>
      </div>

      <div className="stat-card">
        <div className="flex justify-between items-start mb-1.5 md:mb-2">
          <span className="material-symbols-outlined text-yellow-600 bg-yellow-50 border border-yellow-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm">pending_actions</span>
          <span className="text-[10px] md:text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">محجوز</span>
        </div>
        <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">المحجوزة مؤقتاً</p>
        <h4 className="stat-card-value font-mono">{stats.reserved}</h4>
      </div>

      <div className="stat-card">
        <div className="flex justify-between items-start mb-1.5 md:mb-2">
          <span className="material-symbols-outlined text-red-600 bg-red-50 border border-red-100 p-1.5 md:p-2 rounded-lg text-xs md:text-sm font-bold">block</span>
          <span className="text-[10px] md:text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">تالف</span>
        </div>
        <p className="text-gray-400 text-[10px] md:text-[11px] font-bold">غير نشطة / تالفة</p>
        <h4 className="stat-card-value font-mono">{stats.inactive}</h4>
      </div>
    </div>
  );
}