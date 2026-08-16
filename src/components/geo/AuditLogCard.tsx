/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AuditLogEntry } from '../../api/types';
import { useToast } from '../../hooks/useToast';
import { downloadCsv } from './riskTypes';

interface AuditLogCardProps {
  logs: AuditLogEntry[];
}

export default function AuditLogCard({ logs }: AuditLogCardProps) {
  const { toastSuccess, toastInfo } = useToast();

  return (
    <div className="card p-5 flex flex-col justify-between">
      <h5 className="font-bold text-gray-900 text-sm mb-4">سجل إجراءات التحقيق والمراقبة الأخيرة</h5>
      <div className="space-y-4 flex-1 max-h-64 overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 relative">
            <div className="w-5 h-5 rounded-full bg-gray-50 border border-gray-150 shrink-0 flex items-center justify-center text-gray-500 z-10 text-[11px]">
              {log.status === 'blocked' ? (
                <span className="material-symbols-outlined text-xs text-secondary font-bold">priority_high</span>
              ) : log.status === 'verified' ? (
                <span className="material-symbols-outlined text-xs text-green-600 font-bold">check</span>
              ) : (
                <span className="material-symbols-outlined text-xs text-blue-600 animate-spin font-bold">refresh</span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{log.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">بواسطة: {log.user} • {log.time}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          if (logs.length === 0) { toastInfo('لا توجد سجلات تدقيق للتصدير حالياً'); return; }
          const header = ['النوع', 'العنوان', 'المستخدم', 'الوقت', 'الحالة'];
          const body = logs.map((log) => [log.type, log.title, log.user, log.time, log.status].join(','));
          downloadCsv([header.join(','), ...body].join('\n'), `سجل_التدقيق_${new Date().toISOString().slice(0, 10)}.csv`);
          toastSuccess(`تم تصدير سجل التحقيق (${logs.length} سجلاً) كملف CSV.`);
        }}
        className="btn btn-ghost btn-sm w-full mt-4 text-xs"
      >
        تصدير سجل التحقيق الكامل (CSV)
      </button>
    </div>
  );
}