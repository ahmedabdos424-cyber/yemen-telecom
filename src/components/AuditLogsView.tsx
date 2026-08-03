import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { AuditLogEntry } from '../api/types';

const PAGE_SIZE = 15;

function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

function statusColor(status: string): string {
  if (!status) return 'text-slate-500';
  const s = status.toLowerCase();
  if (s === 'success' || s === 'active' || s === 'verified') return 'text-emerald-400';
  if (s === 'blocked' || s === 'failed' || s === 'suspended') return 'text-red-400';
  if (s === 'analyzing' || s === 'pending') return 'text-amber-400';
  if (s === 'closed' || s === 'expired') return 'text-slate-400';
  return 'text-slate-400';
}

function typeIcon(type: string): string {
  if (type === 'login') return 'login';
  if (type === 'logout') return 'logout';
  if (type === 'security_alert' || type === 'identity_risk') return 'warning';
  if (type === 'ai_analysis') return 'psychology';
  return 'list_alt';
}

function typeColor(type: string): string {
  if (type === 'login') return 'text-emerald-400';
  if (type === 'logout') return 'text-slate-400';
  if (type === 'security_alert' || type === 'identity_risk') return 'text-red-400';
  if (type === 'ai_analysis') return 'text-amber-400';
  return 'text-slate-500';
}

export default function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAuditLogsPaged(p, PAGE_SIZE);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setTotalPages(Math.max(1, res.totalPages || 1));
      setPage(res.page || p);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    fetchPage(p);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">سجل تعقب الأحداث في الخادم للمسؤولين وحراس الأمان بالموقع.</p>
        {total > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-full">
            {total} سجل
          </span>
        )}
      </div>

      {loading && (
        <div className="text-center py-10 text-slate-500 text-xs">جاري تحميل السجلات...</div>
      )}

      {!loading && error && (
        <div className="text-center py-8 space-y-2">
          <span className="material-symbols-outlined text-3xl text-red-500">error</span>
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => fetchPage(page)} className="text-ym hover:underline font-bold text-xs cursor-pointer">إعادة المحاولة</button>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="text-center py-10 text-slate-500 text-xs">لا توجد سجلات تدقيق متاحة</div>
      )}

      {!loading && !error && logs.length > 0 && (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${typeColor(log.type)}`}>
                      {typeIcon(log.type)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 leading-snug break-words">{log.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{log.type} • {log.user}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold shrink-0 ${statusColor(log.status)}`}>{log.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-slate-800/70 text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">devices</span>
                    <span className="text-slate-400 truncate" title={log.deviceName || '—'}>{log.deviceName || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0" dir="ltr">
                    <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">language</span>
                    <span className="text-slate-400 truncate">{log.ipAddress || '—'}</span>
                    {log.ipAddress && (
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${isIPv6(log.ipAddress) ? 'bg-violet-900/40 text-violet-300' : 'bg-sky-900/40 text-sky-300'}`}>
                        {isIPv6(log.ipAddress) ? 'IPv6' : 'IPv4'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0" dir="ltr">
                    <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">memory</span>
                    <span className="text-slate-400 truncate font-mono">{log.macAddress || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">schedule</span>
                    <span className="text-slate-300 font-mono" dir="ltr">{log.loginAt || log.time || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 col-span-2">
                    <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">logout</span>
                    {log.sessionStatus === 'active' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        جلسة نشطة حالياً
                      </span>
                    ) : log.logoutAt ? (
                      <span className="text-slate-400 font-mono" dir="ltr">{log.logoutAt}</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                السابق
              </button>
              <span className="text-[10px] font-bold text-slate-500">
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                التالي
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
