import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api/client';
import type { AdminSellerRow, AuditLogEntry, AuditLogPageResponse } from '../api/types';

const PAGE_SIZE = 15;

function sellerStatusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'active': return { label: 'نشط', cls: 'bg-emerald-500/20 text-emerald-400' };
    case 'inactive': return { label: 'معطل', cls: 'bg-slate-600/30 text-slate-400' };
    case 'suspended': return { label: 'موقوف', cls: 'bg-red-500/20 text-red-400' };
    case 'low_stock': return { label: 'مخزون منخفض', cls: 'bg-amber-500/20 text-amber-400' };
    case 'deleted': return { label: 'محذوف', cls: 'bg-red-900/40 text-red-300' };
    default: return { label: status || '—', cls: 'bg-slate-600/30 text-slate-400' };
  }
}

function sessionTypeInfo(type: string): { icon: string; color: string; label: string } {
  if (type === 'login') return { icon: 'login', color: 'text-emerald-400', label: 'دخول' };
  if (type === 'login_failed') return { icon: 'error', color: 'text-red-400', label: 'محاولة فاشلة' };
  if (type === 'logout') return { icon: 'logout', color: 'text-slate-400', label: 'خروج' };
  return { icon: 'list_alt', color: 'text-slate-500', label: type };
}

function formatSessionsDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
}

interface SellerPosManagementViewProps {
  open: boolean;
  onClose: () => void;
}

export default function SellerPosManagementView({ open, onClose }: SellerPosManagementViewProps) {
  const [sellers, setSellers] = useState<AdminSellerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [sessionsFor, setSessionsFor] = useState<AdminSellerRow | null>(null);
  const [sessions, setSessions] = useState<AuditLogEntry[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsTotalPages, setSessionsTotalPages] = useState(1);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [editFor, setEditFor] = useState<AdminSellerRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', storeName: '', phone: '', region: '', status: 'active' });
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteFor, setDeleteFor] = useState<AdminSellerRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.getAdminSellers();
      setSellers(rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchSellers();
  }, [open, fetchSellers]);

  const fetchSessions = useCallback(async (seller: AdminSellerRow, p: number) => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res: AuditLogPageResponse = await api.getSellerSessions(Number(seller.id), p, PAGE_SIZE);
      setSessions(res.logs || []);
      setSessionsTotal(res.total || 0);
      setSessionsTotalPages(Math.max(1, res.totalPages || 1));
      setSessionsPage(res.page || p);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : String(err));
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const openSessions = (seller: AdminSellerRow) => {
    setSessionsFor(seller);
    setSessions([]);
    setSessionsPage(1);
    setSessionsTotalPages(1);
    fetchSessions(seller, 1);
  };

  const openEdit = (seller: AdminSellerRow) => {
    setEditFor(seller);
    setEditError(null);
    setEditForm({
      name: seller.name || '',
      storeName: seller.storeName || '',
      phone: seller.phone || '',
      region: seller.region || '',
      status: seller.status === 'deleted' ? 'inactive' : seller.status,
    });
  };

  const saveEdit = async () => {
    if (!editFor) return;
    setActionBusy(true);
    setEditError(null);
    try {
      await api.updateSeller(Number(editFor.id), {
        name: editForm.name,
        storeName: editForm.storeName,
        phone: editForm.phone,
        region: editForm.region,
        status: editForm.status,
      });
      setEditFor(null);
      await fetchSellers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const toggleStatus = async (seller: AdminSellerRow) => {
    setActionBusy(true);
    try {
      const next: 'active' | 'inactive' = seller.status === 'active' ? 'inactive' : 'active';
      await api.updateSellerStatus(Number(seller.id), next);
      await fetchSellers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteFor) return;
    setDeleteBusy(true);
    try {
      await api.deleteSeller(Number(deleteFor.id));
      setDeleteFor(null);
      await fetchSellers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!open) return null;

  const grouped = sellers.reduce<Record<string, AdminSellerRow[]>>((acc, s) => {
    const agent = s.agentName || 'بدون وكيل';
    (acc[agent] = acc[agent] || []).push(s);
    return acc;
  }, {});
  const agentNames = Object.keys(grouped).sort();

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/25 z-[110]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[111] flex flex-col bg-slate-950 md:inset-4 md:max-w-4xl md:mx-auto md:max-h-[85vh] md:rounded-2xl md:border md:border-slate-800 md:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="إدارة البائعين ونقاط البيع"
      >
        <header className="bottom-sheet-header border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-ym text-lg shrink-0">storefront</span>
            <div>
              <h3 className="font-bold text-sm">إدارة البائعين ونقاط البيع</h3>
              <p className="text-[10px] text-slate-500">متابعة حسابات البائعين وحالة الجلسات</p>
            </div>
          </div>
          <button onClick={onClose}
            className="touch-target flex items-center justify-center p-2 hover:bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="text-center py-10 text-slate-500 text-xs">جاري تحميل البائعين...</div>
          )}

          {!loading && error && (
            <div className="text-center py-8 space-y-2">
              <span className="material-symbols-outlined text-3xl text-red-500">error</span>
              <p className="text-xs text-red-400">{error}</p>
              <button onClick={fetchSellers} className="text-ym hover:underline font-bold text-xs cursor-pointer">إعادة المحاولة</button>
            </div>
          )}

          {!loading && !error && sellers.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">لا يوجد بائعون مسجلون</div>
          )}

          {!loading && !error && sellers.length > 0 && (
            <div className="space-y-3">
              {agentNames.map((agent) => (
                <div key={agent} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="material-symbols-outlined text-sm text-slate-500">account_tree</span>
                    <h4 className="text-[11px] font-extrabold text-slate-300">{agent}</h4>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-800/70 px-1.5 py-0.5 rounded-full">{grouped[agent].length}</span>
                  </div>
                  <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/80">
                    {grouped[agent].map((seller) => {
                      const badge = sellerStatusBadge(seller.status);
                      return (
                        <div key={seller.id} className="p-3 bg-slate-950 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${seller.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>person</span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate">{seller.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{seller.phone || '—'} {seller.storeName ? `• ${seller.storeName}` : ''}</p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">payments</span>
                              <span className="text-slate-300 font-bold">{(seller.balance ?? 0).toLocaleString('ar-YE')}</span>
                              <span className="text-slate-500">رصيد</span>
                            </div>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">inventory_2</span>
                              <span className="text-slate-300 font-bold">{seller.currentStock ?? 0}</span>
                              <span className="text-slate-500">مخزون</span>
                            </div>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">sim_card</span>
                              <span className="text-slate-300 font-bold">{seller.activationsCount ?? 0}</span>
                              <span className="text-slate-500">تفعيل</span>
                            </div>
                            <div className="flex items-center gap-1 min-w-0 col-span-3">
                              <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">schedule</span>
                              <span className="text-slate-400 truncate">{seller.lastLogin || 'لم يسجل دخول بعد'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/70">
                            <button onClick={() => openSessions(seller)} disabled={actionBusy}
                              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-800/70 hover:bg-slate-700 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                              <span className="material-symbols-outlined text-[13px]">history</span>
                              الجلسات
                            </button>
                            <button onClick={() => openEdit(seller)} disabled={actionBusy}
                              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-800/70 hover:bg-slate-700 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                              <span className="material-symbols-outlined text-[13px]">edit</span>
                              تعديل
                            </button>
                            <button onClick={() => toggleStatus(seller)} disabled={actionBusy}
                              className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${seller.status === 'active'
                                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'}`}>
                              <span className="material-symbols-outlined text-[13px]">{seller.status === 'active' ? 'block' : 'play_arrow'}</span>
                              {seller.status === 'active' ? 'تعطيل' : 'تفعيل'}
                            </button>
                            <button onClick={() => setDeleteFor(seller)} disabled={actionBusy}
                              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                              <span className="material-symbols-outlined text-[13px]">delete</span>
                              حذف
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </motion.div>

      {/* نافذة سجل الجلسات */}
      <AnimatePresence>
        {sessionsFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]"
              onClick={() => setSessionsFor(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bottom-sheet z-[121] md:!relative md:!rounded-2xl md:max-w-2xl md:mx-auto md:my-auto md:max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="سجل جلسات البائع"
            >
              <div className="bottom-sheet-drag md:hidden" />
              <div className="bottom-sheet-header">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-ym text-lg shrink-0">history</span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs truncate">سجل جلسات: {sessionsFor.name}</h3>
                    <p className="text-[10px] text-slate-500 truncate">{sessionsFor.username || '—'} • {sessionsTotal} سجل</p>
                  </div>
                </div>
                <button onClick={() => setSessionsFor(null)}
                  className="touch-target flex items-center justify-center p-2 hover:bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="bottom-sheet-body space-y-3">
                {sessionsLoading && <div className="text-center py-8 text-slate-500 text-xs">جاري تحميل الجلسات...</div>}

                {!sessionsLoading && sessionsError && (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs text-red-400">{sessionsError}</p>
                    <button onClick={() => fetchSessions(sessionsFor, sessionsPage)} className="text-ym hover:underline font-bold text-xs cursor-pointer">إعادة المحاولة</button>
                  </div>
                )}

                {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">لا توجد جلسات مسجلة لهذا البائع</div>
                )}

                {!sessionsLoading && !sessionsError && sessions.length > 0 && (
                  <>
                    <div className="space-y-2">
                      {sessions.map((log) => {
                        const info = sessionTypeInfo(log.type);
                        return (
                          <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${info.color}`}>{info.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-200 leading-snug break-words">{log.title}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{info.label}</p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold shrink-0 ${log.status === 'success' ? 'text-emerald-400' : log.status === 'failed' ? 'text-red-400' : 'text-slate-400'}`}>{log.status}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/70">
                              <span className="flex items-center gap-1 min-w-0" dir="ltr">
                                <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">schedule</span>
                                <span className="truncate">{formatSessionsDate(log.loginAt || log.time)}</span>
                              </span>
                              <span className="flex items-center gap-1 min-w-0" dir="ltr">
                                <span className="material-symbols-outlined text-[12px] text-slate-600 shrink-0">language</span>
                                <span className="truncate">{log.ipAddress || '—'}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {sessionsTotalPages > 1 && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() => fetchSessions(sessionsFor, sessionsPage - 1)}
                          disabled={sessionsPage <= 1}
                          className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                          السابق
                        </button>
                        <span className="text-[10px] font-bold text-slate-500">صفحة {sessionsPage} من {sessionsTotalPages}</span>
                        <button
                          onClick={() => fetchSessions(sessionsFor, sessionsPage + 1)}
                          disabled={sessionsPage >= sessionsTotalPages}
                          className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                          التالي
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* نافذة التعديل */}
      <AnimatePresence>
        {editFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]"
              onClick={() => setEditFor(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bottom-sheet z-[121] md:!relative md:!rounded-2xl md:max-w-md md:mx-auto md:my-auto md:max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="تعديل بيانات البائع"
            >
              <div className="bottom-sheet-drag md:hidden" />
              <div className="bottom-sheet-header">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-ym text-lg shrink-0">edit</span>
                  <h3 className="font-bold text-xs">تعديل بيانات البائع</h3>
                </div>
                <button onClick={() => setEditFor(null)}
                  className="touch-target flex items-center justify-center p-2 hover:bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="bottom-sheet-body space-y-3">
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم البائع</label>
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-ym/60" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم المتجر</label>
                    <input value={editForm.storeName} onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-ym/60" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">رقم الهاتف</label>
                    <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} dir="ltr"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-ym/60 text-left" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">المنطقة</label>
                    <input value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-ym/60" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">الحالة</label>
                    <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-ym/60">
                      <option value="active">نشط</option>
                      <option value="inactive">معطل</option>
                      <option value="suspended">موقوف</option>
                      <option value="low_stock">مخزون منخفض</option>
                    </select>
                  </div>
                </div>

                {editError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-semibold">{editError}</div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button onClick={saveEdit} disabled={actionBusy || !editForm.name.trim()}
                    className="flex-1 bg-ym hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-[48px]">
                    {actionBusy ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                  <button onClick={() => setEditFor(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer min-h-[48px]">تراجع</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* نافذة تأكيد الحذف */}
      <AnimatePresence>
        {deleteFor && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[130] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تأكيد حذف البائع">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card-enhanced max-w-sm w-full p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-red-500">
                <span className="material-symbols-outlined text-2xl font-bold">warning</span>
                <h4 className="font-extrabold text-sm">تأكيد حذف البائع</h4>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                سيتم تعطيل حساب <strong className="text-slate-200">{deleteFor.name}</strong> ونقل شرائحه إلى المركز الرئيسي. لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-2.5 pt-2">
                <button onClick={confirmDelete} disabled={deleteBusy}
                  className="flex-1 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-[48px]">
                  {deleteBusy ? 'جاري الحذف...' : 'نعم، حذف'}
                </button>
                <button onClick={() => setDeleteFor(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer min-h-[48px]">تراجع</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
