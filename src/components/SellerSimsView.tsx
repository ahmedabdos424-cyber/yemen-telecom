import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sim, Operator } from '../types';
import ConfirmModal from './shared/ConfirmModal';
import EmptyState from './shared/EmptyState';
import {
  Smartphone, Search, X, Eye, Edit, ArrowRightLeft, BookMarked, RefreshCw, Check, Printer, Trash2,
  MoreVertical, Cpu
} from 'lucide-react';
import { useToast, ToastContainer } from '../hooks/useToast';
import OperatorLogo from './shared/OperatorLogo';

interface SellerSimsViewProps {
  sims: Sim[];
  onUpdateSims?: (updated: Sim[]) => void;
}

export default function SellerSimsView({ sims = [], onUpdateSims }: SellerSimsViewProps) {
  const [simSearchQuery, setSimSearchQuery] = useState('');
  const [simStatusFilter, setSimStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [simOperatorFilter, setSimOperatorFilter] = useState<string>('all');
  const [simCurrentPage, setSimCurrentPage] = useState(1);
  const [activeMenuSimId, setActiveMenuSimId] = useState<string | null>(null);
  const [detailSim, setDetailSim] = useState<Sim | null>(null);
  const [editSim, setEditSim] = useState<Sim | null>(null);
  const [editIccid, setEditIccid] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editOperator, setEditOperator] = useState<Operator>('yemen_mobile');
  const [transferSim, setTransferSim] = useState<Sim | null>(null);
  const [transferToSellerName, setTransferToSellerName] = useState('');
  const [deleteConfirmSimId, setDeleteConfirmSimId] = useState<string | null>(null);

  const { toasts, dismissToast, toastSuccess, toastError, toastWarning, toastInfo } = useToast();

  const computedStats = sims.reduce((acc, sim) => {
    const op = (sim.operator || 'yemen_mobile').toLowerCase();
    if (!acc[op]) acc[op] = { total: 0, available: 0, sold: 0 };
    acc[op].total += 1;
    if (sim.status === 'available') acc[op].available += 1;
    else if (sim.status === 'sold') acc[op].sold += 1;
    return acc;
  }, {} as Record<string, { total: number; available: number; sold: number }>);

  const operatorsList = [
    { key: 'yemen_mobile', name: 'يمن موبايل', iconColor: 'bg-ym-light/20 border-ym-light/30 text-ym', brandBg: 'bg-op-ym', brandBorder: 'border-op-ym', brandShadow: 'shadow-lg', brandText: 'text-white', brandInactiveHover: 'hover:border-op-ym/60 hover:bg-op-ym-light' },
    { key: 'you', name: 'YOU', iconColor: 'bg-amber-950/40 border-amber-900/40 text-amber-400', brandBg: 'bg-op-you', brandBorder: 'border-op-you', brandShadow: 'shadow-lg', brandText: 'text-you-text', brandInactiveHover: 'hover:border-op-you/60 hover:bg-op-you-light' },
    { key: 'sabafon', name: 'سبأفون', iconColor: 'bg-blue-950/40 border-blue-900/40 text-blue-400', brandBg: 'bg-op-sf', brandBorder: 'border-op-sf', brandShadow: 'shadow-lg', brandText: 'text-white', brandInactiveHover: 'hover:border-op-sf/60 hover:bg-op-sf-light' }
  ];

  const filtered = sims.filter(sim => {
    const query = simSearchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      (sim.iccid && sim.iccid.toLowerCase().includes(query)) ||
      (sim.phone && sim.phone.toLowerCase().includes(query)) ||
      (sim.category && sim.category.toLowerCase().includes(query));
    let matchesStatus = true;
    if (simStatusFilter === 'available') matchesStatus = sim.status === 'available';
    else if (simStatusFilter === 'sold') matchesStatus = sim.status === 'sold';
    let matchesOperator = true;
    if (simOperatorFilter !== 'all') {
      matchesOperator = (sim.operator || '').toLowerCase() === simOperatorFilter.toLowerCase();
    }
    return matchesSearch && matchesStatus && matchesOperator;
  });

  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(simCurrentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedList = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleStatusChange = (simId: string, newStatus: string) => {
    if (onUpdateSims) {
      const updated = sims.map(s => s.id === simId ? { ...s, status: newStatus as any } : s);
      onUpdateSims(updated);
    }
    setActiveMenuSimId(null);
  };

  const handleDeleteSim = (simId: string) => {
    setDeleteConfirmSimId(simId);
    setActiveMenuSimId(null);
  };

  const confirmDeleteSim = () => {
    if (deleteConfirmSimId && onUpdateSims) {
      const updated = sims.filter(s => s.id !== deleteConfirmSimId);
      onUpdateSims(updated);
    }
    setDeleteConfirmSimId(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSim) return;
    if (onUpdateSims) {
      const updated = sims.map(s => s.id === editSim.id ? {
        ...s, iccid: editIccid, phone: editPhone, category: editCategory, operator: editOperator
      } : s);
      onUpdateSims(updated);
    }
    setEditSim(null);
  };

  return (
    <div className="space-y-6 text-right">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Cpu className="text-red-500" size={18} />
          <span>شاشة شرائحي</span>
        </h2>

      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none" dir="rtl">
        {operatorsList.map(op => {
          const stat = computedStats[op.key] || { total: 0, available: 0, sold: 0 };
          const consumptionRate = stat.total > 0 ? Math.round((stat.sold / stat.total) * 100) : 0;
          const isActive = simOperatorFilter === op.key;
          return (
            <button
              key={op.key}
              onClick={() => setSimOperatorFilter(isActive ? 'all' : op.key)}
              className={`flex-shrink-0 w-56 sm:w-64 bg-slate-900 border-2 rounded-2xl p-4 text-right transition-all duration-200 active:scale-[0.98] ${isActive ? `${op.brandBorder} shadow-lg ${op.brandShadow}` : 'border-slate-800 hover:border-slate-600'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <OperatorLogo provider={op.key} size="md" />
                <span className="text-[10px] text-slate-400 font-medium">معدل تسييل: {consumptionRate}%</span>
              </div>
              <h4 className="font-bold text-xs text-slate-100 pb-1">{op.name}</h4>
              <p className="text-xl font-bold text-slate-100 font-sans">{stat.total} <span className="text-[10px] text-slate-400 font-normal">شريحة</span></p>
              <div className="w-full bg-slate-950 rounded-full h-1 mt-2.5 overflow-hidden">
                <div className={`h-1 transition-all duration-500 ${isActive ? op.brandBg : 'bg-slate-600'}`} style={{ width: `${consumptionRate}%` }} />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-400 font-sans mt-3">
                <span>متوفر: <strong className="text-emerald-400">{stat.available}</strong></span>
                <span>مباع: <strong className="text-blue-400">{stat.sold}</strong></span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input type="text" placeholder="بحث برقم ICCID، الكود التسلسلي..." value={simSearchQuery}
            onChange={(e) => { setSimSearchQuery(e.target.value); setSimCurrentPage(1); }}
            className="input-field text-xs bg-slate-950" />
          <Search className="absolute right-3 top-3 text-slate-500" size={14} />
          {simSearchQuery && (
            <button onClick={() => setSimSearchQuery('')} className="absolute left-3 top-3 text-slate-500 hover:text-slate-100">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto py-1" dir="rtl">
          <button onClick={() => { setSimOperatorFilter('all'); setSimCurrentPage(1); }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 flex items-center gap-2 active:scale-[0.97] ${simOperatorFilter === 'all' ? 'bg-red-600/15 border-red-500/45 text-red-400 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-100'}`}>
            <span className="material-symbols-outlined text-lg">apps</span>
            <span>الكل</span>
          </button>
          {operatorsList.map(op => (
            <button key={op.key} onClick={() => { setSimOperatorFilter(op.key); setSimCurrentPage(1); }}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 flex items-center gap-2 active:scale-[0.97] ${simOperatorFilter === op.key ? `${op.brandBg} ${op.brandBorder} ${op.brandShadow} ${op.brandText}` : `bg-slate-950 border-slate-800 text-slate-300 ${op.brandInactiveHover}`}`}>
              <OperatorLogo provider={op.key} size="md" plain />
              <span>{op.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none" dir="rtl">
        {[
          { id: 'all', label: 'الكل' }, { id: 'available', label: 'المتوفر' }, { id: 'sold', label: 'المباع' }
        ].map(tab => (
          <button key={tab.id} onClick={() => { setSimStatusFilter(tab.id as any); setSimCurrentPage(1); }}
            className={`px-5 py-3 text-xs font-bold transition-all relative whitespace-nowrap ${simStatusFilter === tab.id ? 'text-red-500 font-black border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-100'}`}>{tab.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Smartphone size={36} className="text-slate-600" />} title="لم يتم العثور على أي شرائح مطابقة" description="جرب تغيير نطاق البحث أو تصفية حالة التصفح للوصول إلى النتائج المطلوبة." />
      ) : (
        <div className="space-y-4">
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="table-wrap">
              <table className="text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-bold">
                    <th className="p-4">رقم الـ ICCID</th>
                    <th className="p-4">النوع / الفئة</th>
                    <th className="p-4">الشركة</th>
                    <th className="p-4">حالة الشريحة</th>
                    <th className="p-4">تاريخ الإضافة</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {paginatedList.map(sim => {
                    const operatorLabel = sim.operator === 'yemen_mobile' ? 'يمن موبايل' : sim.operator === 'you' ? 'YOU' : 'سبأفون';
                    const isAvailable = sim.status === 'available';
                    return (
                      <tr key={sim.id} className="hover:bg-slate-950/20">
                        <td className="p-4"><p className="font-mono font-bold text-slate-100" dir="ltr">{sim.iccid}</p>{sim.phone && <span className="text-[10px] text-slate-500 font-mono">{sim.phone}</span>}</td>
                        <td className="p-4 text-slate-300 font-medium">{sim.category || 'مسبقة الدفع'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black ${sim.operator === 'yemen_mobile' ? 'bg-ym-light/20 text-ym border border-ym-light/30' : sim.operator === 'you' ? 'bg-amber-950/40 text-amber-500 border border-amber-900/40' : 'bg-blue-950/40 text-blue-400 border border-blue-900/40'}`}>{operatorLabel}</span>
                        </td>
                        <td className="p-4">
                          <span className={`badge ${sim.status === 'available' ? 'badge-available' : sim.status === 'sold' ? 'badge-sold' : sim.status === 'reserved' ? 'badge-reserved' : (sim.status as any) === 'allocated' || (sim.status as any) === 'suspended' ? 'badge-pending' : 'badge-damaged'}`}>
                            {sim.status === 'available' ? 'متوفر' : sim.status === 'sold' ? 'مباع' : sim.status === 'reserved' ? 'محجوز' : (sim.status as any) === 'allocated' || (sim.status as any) === 'suspended' ? 'مخصص' : 'تالف'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 font-sans">{sim.dateAdded}</td>
                        <td className="p-4 text-center relative">
                          <div className="flex justify-center items-center">
                            <button onClick={() => setActiveMenuSimId(activeMenuSimId === sim.id ? null : sim.id)}
                              className="btn-icon hover:bg-slate-950 text-slate-400 hover:text-slate-100 cursor-pointer"><MoreVertical size={16} /></button>
                            {activeMenuSimId === sim.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setActiveMenuSimId(null)} />
                                <div className="absolute left-6 top-10 w-44 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-30 text-right space-y-0.5 animate-scale-down">
                                  <button onClick={() => { setDetailSim(sim); setActiveMenuSimId(null); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-900 hover:text-slate-100 rounded-lg flex items-center gap-2 touch-target"><Eye size={12} /><span>عرض التفاصيل</span></button>
                                  <button onClick={() => { setEditSim(sim); setEditIccid(sim.iccid); setEditPhone(sim.phone || ''); setEditCategory(sim.category || ''); setEditOperator(sim.operator ?? 'yemen_mobile'); setActiveMenuSimId(null); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-900 hover:text-slate-100 rounded-lg flex items-center gap-2 touch-target"><Edit size={12} /><span>تعديل بيانات الشريحة</span></button>
                                  <button onClick={() => { setTransferSim(sim); setActiveMenuSimId(null); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-350 hover:bg-slate-900 hover:text-slate-100 rounded-lg flex items-center gap-2 touch-target"><ArrowRightLeft size={12} /><span>نقل الشريحة</span></button>
                                  {isAvailable ? (
                                    <button onClick={() => handleStatusChange(sim.id, 'reserved')} className="w-full text-right px-3 py-2 text-[10px] text-amber-400 hover:bg-slate-900 rounded-lg flex items-center gap-2"><BookMarked size={12} /><span>حجز الشريحة</span></button>
                                  ) : (
                                    <button onClick={() => handleStatusChange(sim.id, 'available')} className="w-full text-right px-3 py-2 text-[10px] text-emerald-400 hover:bg-slate-900 rounded-lg flex items-center gap-2"><RefreshCw size={12} /><span>إلغاء الحجز</span></button>
                                  )}
                                  <button onClick={() => handleStatusChange(sim.id, 'sold')} className="w-full text-right px-3 py-2 text-[10px] text-blue-400 hover:bg-slate-900 rounded-lg flex items-center gap-2"><Check size={12} /><span>بيع الشريحة</span></button>
                                  <button onClick={() => { setDetailSim(sim); setActiveMenuSimId(null); setTimeout(() => window.print(), 300); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-900 hover:text-slate-100 rounded-lg flex items-center gap-2"><Printer size={12} /><span>طباعة بيانات الشريحة</span></button>
                                  <button onClick={() => handleDeleteSim(sim.id)} className="w-full text-right px-3 py-2 text-[10px] text-red-500 hover:bg-red-950/20 rounded-lg flex items-center gap-2 border-t border-slate-900 mt-1 pb-1"><Trash2 size={12} /><span>حذف الشريحة</span></button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="block md:hidden space-y-4">
            {paginatedList.map(sim => {
              const operatorLabel = sim.operator === 'yemen_mobile' ? 'يمن موبايل' : sim.operator === 'you' ? 'YOU' : 'سبأفون';
              return (
                <div key={sim.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative hover:border-slate-750">
                  <div className="flex justify-between items-start">
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-slate-100" dir="ltr">{sim.iccid}</p>
                      {sim.phone && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{sim.phone}</p>}
                    </div>
                    <span className={`badge ${sim.status === 'available' ? 'badge-available' : sim.status === 'sold' ? 'badge-sold' : sim.status === 'reserved' ? 'badge-reserved' : 'badge-damaged'}`}>
                      {sim.status === 'available' ? 'متوفر' : sim.status === 'sold' ? 'مباع' : 'محجوز'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-xl">
                    <span>الجهة: {operatorLabel}</span>
                    <span>التصنيف: {sim.category || 'عام'}</span>
                  </div>
                  <div className="flex gap-2 justify-end border-t border-slate-800/60 pt-3">
                    <button onClick={() => setDetailSim(sim)} className="btn btn-sm btn-ghost">التفاصيل</button>
                    <div className="relative">
                      <button onClick={() => setActiveMenuSimId(activeMenuSimId === sim.id ? null : sim.id)}
                        className="btn-icon hover:bg-slate-950 text-slate-400 hover:text-slate-100 cursor-pointer"><MoreVertical size={16} /></button>
                      {activeMenuSimId === sim.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setActiveMenuSimId(null)} />
                          <div className="absolute left-0 bottom-8 w-44 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-30 text-right space-y-0.5 animate-scale-down">
                            <button onClick={() => handleStatusChange(sim.id, 'sold')} className="w-full text-right px-3 py-2 text-[10px] text-blue-400 hover:bg-slate-900 rounded-lg flex items-center gap-2"><Check size={12} /><span>بيع الشريحة</span></button>
                            {sim.status === 'available' ? (
                              <button onClick={() => handleStatusChange(sim.id, 'reserved')} className="w-full text-right px-3 py-2 text-[10px] text-amber-400 hover:bg-slate-900 rounded-lg flex items-center gap-2"><BookMarked size={12} /><span>حجز الشريحة</span></button>
                            ) : (
                              <button onClick={() => handleStatusChange(sim.id, 'available')} className="w-full text-right px-3 py-2 text-[10px] text-emerald-400 hover:bg-slate-900 rounded-lg flex items-center gap-2"><RefreshCw size={12} /><span>إلغاء الحجز</span></button>
                            )}
                            <button onClick={() => { setTransferSim(sim); setActiveMenuSimId(null); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-900 hover:text-slate-100 rounded-lg flex items-center gap-2"><ArrowRightLeft size={12} /><span>نقل الشريحة</span></button>
                            <button onClick={() => { setDetailSim(sim); setActiveMenuSimId(null); setTimeout(() => window.print(), 300); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-900 hover:text-slate-100 rounded-lg flex items-center gap-2"><Printer size={12} /><span>طباعة</span></button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 mt-4">
            <div className="text-right text-[11px] text-slate-400">
              عرض <strong className="text-slate-100">{Math.min(filtered.length, startIndex + 1)}</strong> إلى <strong className="text-slate-100">{Math.min(filtered.length, startIndex + itemsPerPage)}</strong> من أصل <strong className="text-slate-100">{filtered.length}</strong> شريحة
            </div>
            <div className="flex gap-2">
              <button disabled={safePage === 1} onClick={() => setSimCurrentPage(prev => Math.max(1, prev - 1))}
                className="btn btn-sm bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700 disabled:cursor-not-allowed">السابق</button>
              <span className="btn btn-sm bg-slate-950 text-slate-300 border border-slate-700 font-mono">{safePage} / {totalPages}</span>
              <button disabled={safePage === totalPages} onClick={() => setSimCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="btn btn-sm bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700 disabled:cursor-not-allowed">التالي</button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {detailSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailSim(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm md:max-w-md text-right text-slate-300 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-extrabold text-sm text-slate-100">تفاصيل الشريحة الكاملة</h3>
                <button onClick={() => setDetailSim(null)} className="p-2.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={15} /></button>
              </div>
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center border-b border-slate-950 pb-2"><span className="text-slate-400">رقم ICCID التسلسلي:</span><span className="font-mono font-bold text-slate-100" dir="ltr">{detailSim.iccid}</span></div>
                <div className="flex justify-between items-center border-b border-slate-950 pb-2"><span className="text-slate-400">رقم الشريحة:</span><span className="font-mono font-bold text-slate-200">{detailSim.phone || 'غير مسجل'}</span></div>
                <div className="flex justify-between items-center border-b border-slate-950 pb-2"><span className="text-slate-400">نظام التشغيل / الفئة:</span><span className="font-bold text-slate-200">{detailSim.category || 'مسبقة الدفع الأساسية'}</span></div>
                <div className="flex justify-between items-center border-b border-slate-950 pb-2"><span className="text-slate-400">المشغل المصرح:</span><span className="font-extrabold text-red-500">{detailSim.operator === 'yemen_mobile' ? 'يمن موبايل' : detailSim.operator === 'you' ? 'YOU' : 'سبأفون'}</span></div>
                <div className="flex justify-between items-center border-b border-slate-950 pb-2"><span className="text-slate-400">تاريخ إصدار الحصة:</span><span className="font-bold text-slate-200">{detailSim.dateAdded}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">الحالة الأمنية والتشغيلية:</span><span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-850 font-bold text-emerald-400">{detailSim.status}</span></div>
              </div>
              <button onClick={() => setDetailSim(null)} className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-100 text-xs font-bold rounded-xl transition-all">إغلاق</button>
            </motion.div>
          </div>
        )}

        {editSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditSim(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm md:max-w-md text-right text-slate-300 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-extrabold text-sm text-slate-100">تعديل معلومات الشريحة</h3>
                <button onClick={() => setEditSim(null)} className="p-2.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={15} /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">رقم ICCID</label>
                  <input type="text" value={editIccid} onChange={(e) => setEditIccid(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 text-right outline-none font-mono" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">الرقم المخصص (جوال)</label>
                  <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 text-right outline-none font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">فئة الباقة والنوع</label>
                  <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 text-right outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">الشركة المشغلة</label>
                  <select value={editOperator} onChange={(e) => setEditOperator(e.target.value as Operator)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none">
                    <option value="yemen_mobile">يمن موبايل</option>
                    <option value="you">YOU</option>
                    <option value="sabafon">سبأفون</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="submit" className="flex-1 py-2.5 bg-red-650 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all">تحديث الأن</button>
                  <button type="button" onClick={() => setEditSim(null)} className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition-all">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {transferSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTransferSim(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm md:max-w-md text-right text-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-extrabold text-sm text-slate-100">نقل ملكية الشريحة</h3>
                <button onClick={() => setTransferSim(null)} className="p-2.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={15} /></button>
              </div>
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  شكرًا لاستخدام نظام النقل الذكي. يرجى كتابة اسم البائع أو العقد الجديد لنقل ملكية الشريحة رقم <strong className="text-slate-100 font-mono" dir="ltr">{transferSim.iccid}</strong> مباشرة له وتأكيد العملية.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">اسم المستلم أو البائع المعتمد</label>
                  <input type="text" placeholder="أدخل الاسم أو رمز المتجر المستلم" value={transferToSellerName}
                    onChange={(e) => setTransferToSellerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-100 text-right outline-none focus:border-red-650 transition-all font-sans" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => {
                    if (!transferToSellerName) { toastWarning('يرجى تحديد المحل أو البائع المستلم'); return; }
                    if (onUpdateSims) {
                      const updated = sims.map(s => s.id === transferSim.id ? { ...s, owner: transferToSellerName, status: 'allocated' as any } : s);
                      onUpdateSims(updated);
                    }
                    setTransferToSellerName('');
                    setTransferSim(null);
                  }} className="flex-1 py-2.5 bg-red-650 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all">تأكيد عملية النقل</button>
                  <button type="button" onClick={() => { setTransferToSellerName(''); setTransferSim(null); }} className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition-all">إلغاء</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={deleteConfirmSimId !== null}
        onConfirm={confirmDeleteSim}
        onCancel={() => setDeleteConfirmSimId(null)}
        title="حذف الشريحة"
        message="هل أنت متأكد من حذف هذه الشريحة نهائياً؟"
        confirmLabel="نعم، احذف"
        cancelLabel="إلغاء"
        variant="danger"
      />
    </div>
  );
}
