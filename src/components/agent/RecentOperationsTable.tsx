/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity } from 'lucide-react';
import type { Operation } from '../../types';
import EmptyState from '../shared/EmptyState';

interface RecentOperationsTableProps {
  operations?: Operation[];
}

export default function RecentOperationsTable({ operations = [] }: RecentOperationsTableProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
      <div className="table-wrap">
        <table className="text-xs table-cards-mobile">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
              <th className="p-4 font-bold text-slate-400">التاريخ</th>
              <th className="p-4 font-bold text-slate-400">اسم البائع</th>
              <th className="p-4 font-bold text-slate-400">المشغل</th>
              <th className="p-4 font-bold text-slate-400">عدد الشرائح</th>
              <th className="p-4 font-bold text-slate-400">نوع العملية</th>
              <th className="p-4 font-bold text-slate-400 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {operations.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8">
                  <EmptyState
                    icon={<Activity size={36} className="text-slate-600" />}
                    title="لا توجد عمليات حديثة"
                    description="عند تنفيذ أول عملية توزيع أو تفعيل، ستظهر هنا سجلات العمليات."
                  />
                </td>
              </tr>
            ) : (
              operations.slice(0, 8).map((op) => (
                <tr key={op.id} className="hover:bg-slate-950/20">
                  <td className="p-4 font-sans">{op.date}</td>
                  <td className="p-4 text-slate-300">{op.target}</td>
                  <td className="p-4 text-slate-300">
                    {op.operator === 'yemen_mobile' ? 'يمن موبايل' : op.operator === 'you' ? 'YOU' : op.operator === 'sabafon' ? 'سبأفون' : op.operator}
                  </td>
                  <td className="p-4 font-mono text-slate-300">1</td>
                  <td className="p-4 text-slate-300">
                    {op.type === 'recharge' ? 'شحن' : op.type === 'activate' ? 'تفعيل' : op.type === 'transfer' ? 'تحويل' : op.type}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`badge ${op.status === 'success' ? 'badge-success' : 'badge-failed'}`}>
                      {op.status === 'success' ? 'ناجحة' : 'فشلت'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-slate-950/40 text-[10px] text-slate-500 flex justify-between items-center">
      </div>
    </div>
  );
}