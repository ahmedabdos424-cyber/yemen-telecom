/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AgentStatsTilesProps {
  stats: {
    total: number;
    active: number;
    salesToday: string;
    pending: string;
  };
}

const AgentStatsTiles: React.FC<AgentStatsTilesProps> = ({ stats }) => (
  <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
    <div className="card p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
      <span className="material-symbols-outlined text-gray-400 text-xl md:text-2xl">groups</span>
      <div>
        <p className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase">إجمالي الوكلاء</p>
        <h4 className="text-base md:text-lg font-bold text-gray-900 font-mono mt-0.5">{stats.total}</h4>
      </div>
    </div>

    <div className="card p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
      <span className="material-symbols-outlined text-green-500 text-xl md:text-2xl">check_circle</span>
      <div>
        <p className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase">الوكلاء النشطون</p>
        <h4 className="text-base md:text-lg font-bold text-green-600 font-mono mt-0.5">{stats.active}</h4>
      </div>
    </div>

    <div className="card p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
      <span className="material-symbols-outlined text-blue-500 text-xl md:text-2xl">trending_up</span>
      <div>
        <p className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase">المبيعات الإجمالية اليومية</p>
        <h4 className="text-base md:text-lg font-bold text-gray-900 font-mono mt-0.5">{stats.salesToday} <span className="text-[10px] md:text-[11px] font-normal text-gray-500">ر.ي</span></h4>
      </div>
    </div>

    <div className="card p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
      <span className="material-symbols-outlined text-secondary text-xl md:text-2xl">pending_actions</span>
      <div>
        <p className="text-gray-400 font-bold text-[10px] md:text-[11px] uppercase">طلبات شحن معلقة</p>
        <h4 className="text-base md:text-lg font-bold text-secondary font-mono mt-0.5">{stats.pending}</h4>
      </div>
    </div>
  </section>
);

export default React.memo(AgentStatsTiles);
