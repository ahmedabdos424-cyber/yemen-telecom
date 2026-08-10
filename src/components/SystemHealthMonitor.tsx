/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Database, RefreshCw, Server, MemoryStick, ArrowDownUp } from 'lucide-react';
import { Role } from '../types';
import { getSystemHealth, type SystemHealthResponse } from '../api/client';

interface SystemHealthMonitorProps {
  role: Role;
}

const POLL_INTERVAL_MS = 15000;

function formatUptime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} يوم`);
  if (h > 0) parts.push(`${h} ساعة`);
  if (m > 0) parts.push(`${m} دقيقة`);
  parts.push(`${s} ثانية`);
  return parts.join(' ');
}

function barClass(percent: number): string {
  if (percent >= 85) return 'bg-red-500';
  if (percent >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
  ok: { label: 'سليم', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  degraded: { label: 'متدهور', chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  error: { label: 'خطأ', chip: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

export default function SystemHealthMonitor({ role }: SystemHealthMonitorProps) {
  const isAllowed = role === 'manager';

  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const fetchedAtRef = useRef<number>(0);
  const [, setTick] = useState(0);

  const fetchHealth = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    try {
      const data = await getSystemHealth();
      setHealth(data);
      fetchedAtRef.current = Date.now();
      setError(null);
      setStale(false);
    } catch (err) {
      setStale(true);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isAllowed]);

  // Initial fetch + auto-polling every 15 seconds
  useEffect(() => {
    if (!isAllowed) return;
    fetchHealth();
    const id = setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAllowed, fetchHealth]);

  // 1-second tick so the uptime counter counts up live between polls
  useEffect(() => {
    if (!isAllowed) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isAllowed]);

  if (!isAllowed) return null;

  const status: 'ok' | 'degraded' | 'error' = health ? health.status : error ? 'error' : 'ok';
  const statusMeta = STATUS_META[status] ?? STATUS_META.error;
  const liveUptime = health ? health.uptime + Math.floor((Date.now() - fetchedAtRef.current) / 1000) : 0;
  const rssPct = health ? Math.min(100, Math.round((health.memory.rssMB / Math.max(health.memory.osTotalMB, 1)) * 100)) : 0;
  const heapPct = health?.memory.heapUsedPercent ?? 0;

  return (
    <section className="card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-800">
            <Activity size={18} />
          </span>
          <div>
            <h2 className="font-title-lg text-xs md:text-sm font-bold text-gray-900 flex items-center gap-2">
              مراقبة صحة النظام
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot} ${status === 'ok' ? 'animate-pulse' : ''}`} />
                {statusMeta.label}
              </span>
            </h2>
            <p className="text-[10px] md:text-[11px] text-gray-500 mt-0.5">
              آخر تحديث: {health ? new Date(health.timestamp).toLocaleTimeString('ar') : '—'}
              {stale ? ' (تعذر التحديث)' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => { fetchHealth(); }}
          disabled={loading}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>تحديث الآن</span>
        </button>
      </div>

      {error && !health && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex items-center gap-2" role="alert">
          <span className="material-symbols-outlined text-sm">error</span>
          تعذر الوصول إلى خدمة الصحة ({error}) — إعادة المحاولة تلقائياً كل 15 ثانية.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {/* Server status + uptime */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/85 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server size={15} className="text-gray-700" />
            <span className="text-[10px] md:text-[11px] text-gray-500 font-bold">حالة الخادم</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 font-mono" dir="ltr">{liveUptime > 0 ? formatUptime(liveUptime) : '—'}</p>
          <p className="text-[10px] text-gray-400 mt-1">مدة التشغيل (الاستمرارية)</p>
        </div>

        {/* Database connection + latency */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/85 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database size={15} className="text-gray-700" />
            <span className="text-[10px] md:text-[11px] text-gray-500 font-bold">قاعدة البيانات</span>
          </div>
          <p className={`text-sm font-bold ${health?.db === 'connected' ? 'text-emerald-600' : health ? 'text-red-600' : 'text-gray-400'}`}>
            {health ? (health.db === 'connected' ? 'متصل' : 'منقطع') : '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-mono" dir="ltr">
            زمن الاستجابة: {health?.db_latency_ms != null ? `${health.db_latency_ms}ms` : 'غير متوفر'}
          </p>
        </div>

        {/* Handled requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/85 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownUp size={15} className="text-gray-700" />
            <span className="text-[10px] md:text-[11px] text-gray-500 font-bold">الطلبات المعالجة</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 font-mono" dir="ltr">{health ? health.requests.toLocaleString('en-US') : '—'}</p>
          <p className="text-[10px] text-gray-400 mt-1">إجمالي منذ آخر إقلاع</p>
        </div>

        {/* Memory: RSS + Heap */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/85 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MemoryStick size={15} className="text-gray-700" />
            <span className="text-[10px] md:text-[11px] text-gray-500 font-bold">استهلاك الذاكرة</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-1">
                <span>RSS (الذاكرة الفعلية)</span>
                <span className="font-mono" dir="ltr">{health ? `${health.memory.rssMB}MB / ${health.memory.osTotalMB}MB` : '—'}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${barClass(rssPct)} rounded-full transition-all duration-700`} style={{ width: `${Math.max(rssPct, 2)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-1">
                <span>Heap (ذاكرة العقدة)</span>
                <span className="font-mono" dir="ltr">{health ? `${health.memory.heapUsedMB}MB / ${health.memory.heapTotalMB}MB` : '—'}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${barClass(heapPct)} rounded-full transition-all duration-700`} style={{ width: `${Math.max(heapPct, 2)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {health && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
          <span className="font-mono" dir="ltr">Node {health.node}</span>
          <span>البيئة: {health.env === 'production' ? 'إنتاج' : health.env}</span>
          <span>آخر فحص: {new Date(health.timestamp).toLocaleTimeString('ar')}</span>
        </div>
      )}
    </section>
  );
}
