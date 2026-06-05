import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sim, Operator } from '../../types';
import {
  Cpu, Search, X, Smartphone, MoreVertical, Eye, Edit, ArrowRightLeft, BookMarked,
  RefreshCw, Check, Printer, Trash2
} from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';

interface SellerSimManagementViewProps {
  sims: Sim[];
  onUpdateSims?: (updated: Sim[]) => void;
}

export default function SellerSimManagementView({ sims, onUpdateSims }: SellerSimManagementViewProps) {
  const [simSearchQuery, setSimSearchQuery] = useState('');
  const [simStatusFilter, setSimStatusFilter] = useState<'all' | 'available' | 'sold' | 'reserved' | 'allocated' | 'damaged'>('all');
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

  const handleStatusChange = (simId: string, newStatus: string) => {
    if (onUpdateSims) {
      const updated = sims.map(s => s.id === simId ? { ...s, status: newStatus as any } : s);
      onUpdateSims(updated);
      alert('تم تحديث حالة الشريحة بنجاح بالنظام الموحد!');
    } else {
      alert('تم التحديث المحلي بنجاح!');
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
        ...s,
        iccid: editIccid,
        phone: editPhone,
        category: editCategory,
        operator: editOperator
      } : s);
      onUpdateSims(updated);
      alert('تم تعديل بيانات الشريحة بنجاح!');
    }
    setEditSim(null);
  };

  // Stats computed from all SIMs
  const computedStats = sims.reduce((acc, sim) => {
    const op = (sim.operator || 'yemen_mobile').toLowerCase();
    if (!acc[op]) acc[op] = { total: 0, available: 0, sold: 0, reserved: 0, allocated: 0, damaged: 0 };
    acc[op].total += 1;
    if (sim.status === 'available') acc[op].available += 1;
    else if (sim.status === 'sold') acc[op].sold += 1;
    else if (sim.status === 'reserved' || sim.status === 'suspended') acc[op].reserved += 1;
    else if (sim.status === 'inactive' || sim.status === 'damaged') acc[op].damaged += 1;
    return acc;
  }, {} as Record<string, { total: number; available: number; sold: number; reserved: number; allocated: number; damaged: number }>);

  const operatorsList = [
    { key: 'yemen_mobile', name: 'يمن موبايل', iconColor: 'bg-op-ym-light op-ym border-op-ym', logo: 'YM' },
    { key: 'you', name: 'YOU', iconColor: 'bg-op-you-light op-you border-op-you', logo: 'YOU' },
    { key: 'sabafon', name: 'سبأفون', iconColor: 'bg-op-sf-light op-sf border-op-sf', logo: 'SF' }
  ];

  // Search & Filters Application
  const filtered = sims.filter(sim => {
    const query = simSearchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      (sim.iccid && sim.iccid.toLowerCase().includes(query)) ||
      (sim.phone && sim.phone.toLowerCase().includes(query)) ||
      (sim.category && sim.category.toLowerCase().includes(query));

    let matchesStatus = true;
    if (simStatusFilter === 'available') matchesStatus = sim.status === 'available';
    else if (simStatusFilter === 'sold') matchesStatus = sim.status === 'sold';
    else if (simStatusFilter === 'reserved') matchesStatus = sim.status === 'reserved';
    else if (simStatusFilter === 'allocated') matchesStatus = (sim.status as any) === 'allocated' || (sim.status as any) === 'suspended';
    else if (simStatusFilter === 'damaged') matchesStatus = (sim.status as any) === 'damaged' || (sim.status as any) === 'inactive';

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

  return (
    <div className="space-y-6 text-right">

      {/* Header Title with Zero Personal Data */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Cpu className="text-red-500" size={18} />
          <span>شاشة شرائحي</span>
        </h2>
        <p className="text-xs text-slate-400 font-light mt-1">إدارة وتتبع جميع الشرائح المتوفرة والمخصصة في حسابك بالتفصيل.</p>
      </div>

      {/* 1. Horizontal Scrollable Company Statistics Cards */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none" dir="rtl">
        {operatorsList.map(op => {
          const stat = computedStats[op.key] || { total: 0, available: 0, sold: 0, reserved: 0, allocated: 0, damaged: 0 };
          const consumptionRate = stat.total > 0 ? Math.round((stat.sold / stat.total) * 100) : 0;

          return (
            <button
              key={op.key}
              onClick={() => setSimOperatorFilter(simOperatorFilter === op.key ? 'all' : op.key)}
              className={`flex-shrink-0 w-64 bg-slate-900 border ${
                simOperatorFilter === op.key ? 'border-red-500 shadow-md shadow-red-950/10' : 'border-slate-800'
              } rounded-2xl p-4 text-right transition-all hover:border-slate-700`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-9 h-9 rounded-xl ${op.iconColor} border flex items-center justify-center font-bold text-xs`}>
                  {op.logo}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">معدل تسييل: {consumptionRate}%</span>
              </div>

              <h4 className="font-bold text-xs text-white pb-1">{op.name}</h4>
              <p className="text-xl font-bold text-white font-sans">{stat.total} <span className="text-[10px] text-slate-400 font-normal">شريحة</span></p>

              {/* Progress Bar Container */}
              <div className="w-full bg-slate-950 rounded-full h-1 mt-2.5 overflow-hidden">
                <div className="bg-red-500 h-1 transition-all duration-500" style={{ width: `${consumptionRate}%` }} />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans mt-3">
                <span>متوفر: <strong className="text-emerald-400">{stat.available}</strong></span>
                <span>مباع: <strong className="text-blue-400">{stat.sold}</strong></span>
                <span>تالف: <strong className="text-red-400">{stat.damaged}</strong></span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Interactive Search & Filters Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">

        {/* Search input with live trigger */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="بحث برقم ICCID، الكود التسلسلي..."
            value={simSearchQuery}
            onChange={(e) => {
              setSimSearchQuery(e.target.value);
              setSimCurrentPage(1);
            }}
            className="input-field text-xs bg-slate-950"
          />
          <Search className="absolute right-3 top-3 text-slate-500" size={14} />
          {simSearchQuery && (
            <button onClick={() => setSimSearchQuery('')} className="absolute left-3 top-3 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Operator Badge Filters */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => { setSimOperatorFilter('all'); setSimCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
              simOperatorFilter === 'all' ? 'bg-red-600/15 border-red-500/45 text-red-400' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            الكل
          </button>
          {operatorsList.map(op => (
            <button
              key={op.key}
              onClick={() => { setSimOperatorFilter(op.key); setSimCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                simOperatorFilter === op.key ? `${op.iconColor}` : 'bg-slate-950 border-slate-850 text-slate-400'
              }`}
            >
              {op.name}
            </button>
          ))}
        </div>

      </div>

      {/* 3. Status Filtering Segmented Buttons */}
      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none" dir="rtl">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'available', label: 'المتوفر' },
          { id: 'sold', label: 'المباع' },
          { id: 'reserved', label: 'المحجوز' },
          { id: 'allocated', label: 'المخصص' },
          { id: 'damaged', label: 'التالف' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setSimStatusFilter(tab.id as any);
              setSimCurrentPage(1);
            }}
            className={`px-5 py-3 text-xs font-bold transition-all relative whitespace-nowrap ${
              simStatusFilter === tab.id
                ? 'text-red-500 font-black border-b-2 border-red-600'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Display Grid / Table */}
      {filtered.length === 0 ? (
        <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl p-10 space-y-2">
          <Smartphone className="mx-auto text-slate-600 animate-pulse" size={32} />
          <h4 className="text-xs font-bold text-white">لم يتم العثور على أي شرائح مطابقة</h4>
          <p className="text-[10px] text-slate-400 font-light max-w-xs mx-auto">جرب تغيير نطاق البحث أو تصفية حالة التصفح للوصول إلى النتائج المطلوبة.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Desktop View (Table) */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="table-wrap">
            <table className="text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-bold">
                  <th>رقم الـ ICCID</th>
                  <th>النوع / الفئة</th>
                  <th>الشركة</th>
                  <th>حالة الشريحة</th>
                  <th>تاريخ الإضافة</th>
                  <th className="text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {paginatedList.map(sim => {
                  const operatorLabel = sim.operator === 'yemen_mobile' ? 'يمن موبايل' : sim.operator === 'you' ? 'YOU' : 'سبأفون';
                  const isAvailable = sim.status === 'available';

                  return (
                    <tr key={sim.id} className="hover:bg-slate-950/20">
                      <td>
                        <p className="font-mono font-bold text-white" dir="ltr">{sim.iccid}</p>
                        {sim.phone && <span className="text-[10px] text-slate-500 font-mono">{sim.phone}</span>}
                      </td>
                      <td className="text-slate-300 font-medium">{sim.category || 'مسبقة الدفع'}</td>
                      <td>
                        <span className={`badge ${
                          sim.operator === 'yemen_mobile' ? 'badge-active' :
                          sim.operator === 'you' ? 'badge-pending' :
                          'badge-available'
                        }`}>
                          {operatorLabel}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          sim.status === 'available' ? 'badge-available' :
                          sim.status === 'sold' ? 'badge-sold' :
                          sim.status === 'reserved' ? 'badge-reserved' :
                          (sim.status as any) === 'allocated' || (sim.status as any) === 'suspended' ? 'badge-pending' :
                          'badge-damaged'
                        }`}>
                          {sim.status === 'available' ? 'متوفر' :
                           sim.status === 'sold' ? 'مباع' :
                           sim.status === 'reserved' ? 'محجوز' :
                           (sim.status as any) === 'allocated' || (sim.status as any) === 'suspended' ? 'مخصص' :
                           'تالف'}
                        </span>
                      </td>
                      <td className="text-slate-500 font-sans">{sim.dateAdded}</td>
                      <td className="text-center relative">
                        <div className="flex justify-center items-center">
                          <button
                            onClick={() => setActiveMenuSimId(activeMenuSimId === sim.id ? null : sim.id)}
                            className="btn-icon hover:bg-slate-950 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown actions absolute list */}
                          {activeMenuSimId === sim.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setActiveMenuSimId(null)} />
                              <div className="absolute left-6 top-10 w-44 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-30 text-right space-y-0.5 animate-scale-down">
                                <button onClick={() => { setDetailSim(sim); setActiveMenuSimId(null); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-900 hover:text-white rounded-lg flex items-center gap-2 touch-target">
                                  <Eye size={12} />
                                  <span>عرض التفاصيل</span>
                                </button>
                                <button onClick={() => { setEditSim(sim); setEditIccid(sim.iccid); setEditPhone(sim.phone || ''); setEditCategory(sim.category || ''); setEditOperator(sim.operator); setActiveMenuSimId(null); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-900 hover:text-white rounded-lg flex items-center gap-2 touch-target">
                                  <Edit size={12} />
                                  <span>تعديل بيانات الشريحة</span>
                                </button>
                                <button onClick={() => { setTransferSim(sim); setActiveMenuSimId(null); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-350 hover:bg-slate-900 hover:text-white rounded-lg flex items-center gap-2 touch-target">
                                  <ArrowRightLeft size={12} />
                                  <span>نقل الشريحة</span>
                                </button>
                                {isAvailable ? (
                                  <button onClick={() => handleStatusChange(sim.id, 'reserved')} className="w-full text-right px-3 py-2 text-[10px] text-amber-400 hover:bg-slate-900 rounded-lg flex items-center gap-2 touch-target">
                                    <BookMarked size={12} />
                                    <span>حجز الشريحة</span>
                                  </button>
                                ) : (
                                  <button onClick={() => handleStatusChange(sim.id, 'available')} className="w-full text-right px-3 py-2 text-[10px] text-emerald-400 hover:bg-slate-900 rounded-lg flex items-center gap-2 touch-target">
                                    <RefreshCw size={12} />
                                    <span>إلغاء الحجز</span>
                                  </button>
                                )}
                                <button onClick={() => handleStatusChange(sim.id, 'sold')} className="w-full text-right px-3 py-2 text-[10px] text-blue-400 hover:bg-slate-900 rounded-lg flex items-center gap-2 touch-target">
                                  <Check size={12} />
                                  <span>بيع الشريحة</span>
                                </button>
                                <button onClick={() => { alert(`جاري طباعة بيانات الشريحة...\nالمشغل: ${operatorLabel}\nICCID: ${sim.iccid}\nالحالة الحالية: ${sim.status}`); setActiveMenuSimId(null); }} className="w-full text-right px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-900 hover:text-white rounded-lg flex items-center gap-2 touch-target">
                                  <Printer size={12} />
                                  <span>طباعة بيانات الشريحة</span>
                                </button>
                                <button onClick={() => handleDeleteSim(sim.id)} className="w-full text-right px-3 py-2 text-[10px] text-red-500 hover:bg-red-950/20 rounded-lg flex items-center gap-2 border-t border-slate-900 mt-1 pb-1 touch-target">
                                  <Trash2 size={12} />
                                  <span>حذف الشريحة</span>
                                </button>
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

          {/* Mobile View (Modern Cards) */}
          <div className="block md:hidden space-y-4">
            {paginatedList.map(sim => {
              const operatorLabel = sim.operator === 'yemen_mobile' ? 'يمن موبايل' : sim.operator === 'you' ? 'YOU' : 'سبأفون';
              return (
                <div key={sim.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative hover:border-slate-750">
                  <div className="flex justify-between items-start">
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-white" dir="ltr">{sim.iccid}</p>
                      {sim.phone && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{sim.phone}</p>}
                    </div>

                      <span className={`badge ${
                        sim.status === 'available' ? 'badge-available' :
                        sim.status === 'sold' ? 'badge-sold' :
                        sim.status === 'reserved' ? 'badge-reserved' :
                        'badge-damaged'
                      }`}>
                      {sim.status === 'available' ? 'متوفر' : sim.status === 'sold' ? 'مباع' : 'محجوز'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-xl">
                    <span>الجهة: {operatorLabel}</span>
                    <span>التصنيف: {sim.category || 'عام'}</span>
                  </div>

                  {/* Expandable actions list for mobile */}
                  <div className="flex gap-2 justify-end border-t border-slate-800/60 pt-3">
                    <button onClick={() => setDetailSim(sim)} className="btn btn-sm btn-ghost">التفاصيل</button>
                    <button onClick={() => { setEditSim(sim); setEditIccid(sim.iccid); setEditPhone(sim.phone || ''); setEditCategory(sim.category || ''); setEditOperator(sim.operator); }} className="btn btn-sm btn-ghost">تعديل</button>
                    <button onClick={() => handleStatusChange(sim.id, 'sold')} className="btn btn-sm btn-ghost text-blue-400 hover:text-blue-300">تسييل</button>
                    <button onClick={() => handleDeleteSim(sim.id)} className="btn btn-sm btn-ghost text-red-500 hover:text-red-400">حذف</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. Professional Pagination */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 mt-4">
            <div className="text-right text-[11px] text-slate-400">
              عرض <strong className="text-white">{Math.min(filtered.length, startIndex + 1)}</strong> إلى <strong className="text-white">{Math.min(filtered.length, startIndex + itemsPerPage)}</strong> من أصل <strong className="text-white">{filtered.length}</strong> شريحة
            </div>
            <div className="flex gap-2">
              <button
                disabled={safePage === 1}
                onClick={() => setSimCurrentPage(prev => Math.max(1, prev - 1))}
                className="btn btn-sm bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="btn btn-sm bg-slate-950 text-slate-300 border border-slate-700 font-mono">
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage === totalPages}
                onClick={() => setSimCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="btn btn-sm bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Custom Modals for Redesigned SIM Panel */}
      <AnimatePresence>

        {/* DETAILS MODAL */}
        {detailSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailSim(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm text-right text-slate-300">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-extrabold text-sm text-white">تفاصيل الشريحة الكاملة</h3>
                <button onClick={() => setDetailSim(null)} className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white rounded-full transition-colors"><X size={15} /></button>
              </div>
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center border-b border-slate-950 pb-2">
                  <span className="text-slate-400">رقم ICCID التسلسلي:</span>
                  <span className="font-mono font-bold text-white" dir="ltr">{detailSim.iccid}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-950 pb-2">
                  <span className="text-slate-400">رقم الشريحة:</span>
                  <span className="font-mono font-bold text-slate-200">{detailSim.phone || 'غير مسجل'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-950 pb-2">
                  <span className="text-slate-400">نظام التشغيل / الفئة:</span>
                  <span className="font-bold text-slate-200">{detailSim.category || 'مسبقة الدفع الأساسية'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-950 pb-2">
                  <span className="text-slate-400">المشغل المصرح:</span>
                  <span className="font-extrabold text-red-500">{detailSim.operator === 'yemen_mobile' ? 'يمن موبايل' : detailSim.operator === 'you' ? 'YOU' : 'سبأفون'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-950 pb-2">
                  <span className="text-slate-400">تاريخ إصدار الحصة:</span>
                  <span className="font-bold text-slate-200">{detailSim.dateAdded}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الحالة الأمنية والتشغيلية:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-850 font-bold text-emerald-400">{detailSim.status}</span>
                </div>
              </div>
              <button onClick={() => setDetailSim(null)} className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-xl transition-all">إغلاق</button>
            </motion.div>
          </div>
        )}

        {/* EDIT DATA MODAL */}
        {editSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditSim(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm text-right text-slate-300">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-extrabold text-sm text-white">تعديل معلومات الشريحة</h3>
                <button onClick={() => setEditSim(null)} className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white rounded-full transition-colors"><X size={15} /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">رقم ICCID</label>
                  <input type="text" value={editIccid} onChange={(e) => setEditIccid(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white text-right outline-none font-mono" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">الرقم المخصص (جوال)</label>
                  <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white text-right outline-none font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">فئة الباقة والنوع</label>
                  <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white text-right outline-none" />
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

        {/* TRANSFER DIALOG */}
        {transferSim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTransferSim(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm text-right text-slate-200">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-extrabold text-sm text-white">نقل ملكية الشريحة</h3>
                <button onClick={() => setTransferSim(null)} className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white rounded-full transition-colors"><X size={15} /></button>
              </div>
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  شكرًا لاستخدام نظام النقل الذكي. يرجى كتابة اسم البائع أو العقد الجديد لنقل ملكية الشريحة رقم <strong className="text-white font-mono" dir="ltr">{transferSim.iccid}</strong> مباشرة له وتأكيد العملية.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">اسم المستلم أو البائع المعتمد</label>
                  <input
                    type="text"
                    placeholder="أدخل الاسم أو رمز المتجر المستلم"
                    value={transferToSellerName}
                    onChange={(e) => setTransferToSellerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white text-right outline-none focus:border-red-650 transition-all font-sans"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!transferToSellerName) return alert('يرجى تحديد المحل أو البائع المستلم');
                      if (onUpdateSims) {
                        const updated = sims.map(s => s.id === transferSim.id ? { ...s, owner: transferToSellerName, status: 'allocated' as any } : s);
                        onUpdateSims(updated);
                        alert(`تم نقل الشريحة بنجاح إلى "${transferToSellerName}" وتعديل حالتها إلى مخصص!`);
                      }
                      setTransferToSellerName('');
                      setTransferSim(null);
                    }}
                    className="flex-1 py-2.5 bg-red-650 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    تأكيد عملية النقل
                  </button>
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
