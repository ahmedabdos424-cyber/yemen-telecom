import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Users,
  User,
  Store,
  Package,
  Database,
  RefreshCw,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast, ToastContainer } from '../hooks/useToast';

interface AgentRow {
  id: number;
  name: string;
  region: string;
  status: string;
  sellers_count: number;
  sims_count: number;
}
interface SellerRow {
  id: string;
  name: string;
  storeName: string;
  region: string;
  status: string;
  currentStock: number;
  simsCount: number;
  efficiency: number;
  agent_name: string;
}
interface InvRow {
  operator: string;
  available: number;
  remaining: number;
  periodDays: number;
}

const STOCK_THRESHOLD = 5;

function stockColor(stock: number): string {
  if (stock <= 0) return 'bg-red-500';
  if (stock < STOCK_THRESHOLD) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function statusColor(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'verified') return 'text-emerald-400';
  if (s === 'suspended' || s === 'inactive') return 'text-red-400';
  if (s === 'low_stock') return 'text-amber-400';
  return 'text-slate-400';
}

export default function AgentSellerTreeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [inventories, setInventories] = useState<InvRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { toasts, dismissToast } = useToast();

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getAgents().then((data: any) => { if (mounted) setAgents(Array.isArray(data) ? data : []); }),
      api.getSellers().then((data: any) => { if (mounted) setSellers(Array.isArray(data) ? data : []); }),
      api.getInventories().then((data: any) => { if (mounted) setInventories(Array.isArray(data) ? data : []); }).catch(() => { if (mounted) setInventories([]); }),
    ])
      .then(() => { if (mounted) setLoading(false); })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [open]);

  const sellersByAgent = useMemo(() => {
    const map: Record<string, SellerRow[]> = {};
    sellers.forEach((s) => {
      const key = s.agent_name || 'بدون وكيل';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [sellers]);

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const agentStock = (agent: AgentRow) => {
    const list = sellersByAgent[agent.name] || [];
    return list.reduce((a, b) => a + (b.currentStock || 0), 0);
  };

  if (!open) return null;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div
        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => !loading && onClose()}
        role="dialog"
        aria-modal="true"
        aria-label="شجرة البائعين والمخزون الميداني"
      >
        <div
          className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <Database className="text-ym shrink-0" size={20} />
              <div>
                <h3 className="font-bold text-sm">شجرة البائعين والمخزون الميداني</h3>
                <p className="text-[10px] text-slate-500">هيكلية الوكلاء، والموظفين، ومخزونهم الحالي</p>
              </div>
            </div>
            <button
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="touch-target flex items-center justify-center p-2 hover:bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </header>

          <main className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="animate-spin" size={20} />
                <span className="text-xs">جاري بناء شجرة الوكلاء والمخزون...</span>
              </div>
            )}

            {error && !loading && (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-3 text-red-400">
                <ShieldAlert size={32} />
                <p className="text-xs">{error}</p>
                <button
                  onClick={() => { window.location.reload(); }}
                  className="btn btn-sm text-xs"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="p-4 space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
                      <Users size={14} className="text-ym" /> الوكلاء النشطون
                    </div>
                    <div className="text-xl font-bold text-slate-200 font-mono">{agents.length}</div>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
                      <User size={14} /> الموظفون
                    </div>
                    <div className="text-xl font-bold text-slate-200 font-mono">{sellers.length}</div>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
                      <Package size={14} className="text-amber-400" /> إجمالي المخزون
                    </div>
                    <div className="text-xl font-bold text-slate-200 font-mono">
                      {sellers.reduce((a, b) => a + (b.currentStock || 0), 0)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
                      <BarChart3 size={14} className="text-sf" /> شرائح مفعلة
                    </div>
                    <div className="text-xl font-bold text-slate-200 font-mono">
                      {agents.reduce((a, b) => a + (b.sims_count || 0), 0)}
                    </div>
                  </div>
                </div>

                {/* Agents tree */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-500 font-bold">الهيكل الهرمي للوكلاء والموظفين</h4>
                  {agents.length === 0 ? (
                    <p className="text-[11px] text-slate-500">لا يوجد وكلاء مسجلين حالياً.</p>
                  ) : (
                    <div className="border-r border-slate-800 mr-1 space-y-2">
                      {agents.map((agent) => {
                        const agentSellers = sellersByAgent[agent.name] || [];
                        const stock = agentStock(agent);
                        const isLow = stock < STOCK_THRESHOLD;
                        return (
                          <div key={`agent-${agent.id}`}>
                            <div
                              className="flex items-center gap-2 cursor-pointer px-2 py-2 hover:bg-slate-800/40 rounded-lg select-none"
                              onClick={() => toggle(`agent-${agent.id}`)}
                            >
                              <span className="material-symbols-outlined text-slate-600 text-sm shrink-0">
                                {expanded[`agent-${agent.id}`] ? 'expand_more' : 'chevron_left'}
                              </span>
                              <Users size={16} className="text-ym shrink-0" />
                              <div className="flex-1 min-w-0 text-right">
                                <span className="text-xs font-bold text-slate-200 block truncate">{agent.name}</span>
                                <span className="text-[9px] text-slate-600 block">{agent.region}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor(agent.status)}`}>
                                {agent.status}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">{agent.sellers_count} موظف</span>
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">{agent.sims_count} شريحة</span>
                                <span className={`w-2 h-2 rounded-full ${stockColor(stock)} shrink-0`} title={`مخزون ${agent.name}: ${stock}`} />
                                {isLow && <ShieldAlert size={12} className="text-amber-400" />}
                              </div>
                            </div>

                            {expanded[`agent-${agent.id}`] && (
                              <div className="border-r border-slate-800 mr-1 mt-1 space-y-0.5">
                                {agentSellers.length === 0 ? (
                                  <p className="text-[10px] text-slate-600 mr-8 py-1">لا يوجد موظفون مسجلون لهذا الوكيل.</p>
                                ) : (
                                  agentSellers.map((s) => {
                                    const low = (s.currentStock || 0) < STOCK_THRESHOLD;
                                    return (
                                      <div
                                        key={`seller-${s.id}`}
                                        className="flex items-center gap-2 px-3 py-2 mr-1 hover:bg-slate-800/30 rounded-lg"
                                      >
                                        <span className="material-symbols-outlined text-slate-600 text-xs shrink-0">
                                          chevron_left
                                        </span>
                                        <Store size={14} className="text-sf shrink-0" />
                                        <div className="flex-1 min-w-0 text-right">
                                          <span className="text-xs font-bold text-slate-200 block truncate">{s.name}</span>
                                          <span className="text-[9px] text-slate-600 block truncate">{s.storeName || s.name}</span>
                                        </div>
                                        <span className={`text-[9px] font-mono text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded`} title={`مخزون ${s.name}: ${s.currentStock}`}>
                                          مخزون: {s.currentStock}
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">
                                          {s.simsCount} شريحة
                                        </span>
                                        {low && <ShieldAlert size={12} className="text-amber-400 shrink-0" />}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Global inventory panel */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <h4 className="text-[10px] text-slate-500 font-bold">ملخص المخزون حسب المشغل</h4>
                  {inventories.length === 0 ? (
                    <p className="text-[11px] text-slate-500">لا توفر بيانات مخزون عامة حالياً.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {inventories.map((inv) => (
                        <div key={inv.operator} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200">{inv.operator || '—'}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              (inv.available || 0) < STOCK_THRESHOLD ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'
                            }`}>
                              {inv.available} متوفر
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-ym rounded-full transition-all"
                              style={{ width: `${inv.periodDays ? Math.max(10, 100 - (inv.available / (inv.available + inv.remaining || 1)) * 100) : 50}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex justify-between text-[10px] text-slate-600 font-mono">
                            <span>متبقي: {inv.remaining}</span>
                            <span>مدة الفترة: {inv.periodDays} يوم</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          <footer className="flex items-center justify-between p-3 border-t border-slate-800 shrink-0 bg-slate-950">
            <span className="text-[10px] text-slate-500">محدَّث تلقائياً عند الفتح</span>
            <button
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="btn btn-sm btn-ghost text-xs min-h-[36px]"
            >
              إغلاق
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
