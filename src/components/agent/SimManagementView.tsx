import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Cpu, X, Smartphone } from 'lucide-react';
import { Sim } from '../../types';
import EmptyState from '../shared/EmptyState';
import OperatorLogo from '../shared/OperatorLogo';

interface SimManagementViewProps {
  sims: Sim[];
  onUpdateSims?: (updated: Sim[]) => void;
}

export default function SimManagementView({
  sims = [],
  onUpdateSims
}: SimManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

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
    { key: 'yemen_mobile', name: 'يمن موبايل', brandBg: 'bg-op-ym', brandBorder: 'border-op-ym', brandShadow: 'shadow-lg', brandText: 'text-white', brandInactiveHover: 'hover:border-op-ym/60 hover:bg-op-ym-light' },
    { key: 'you', name: 'YOU', brandBg: 'bg-op-you', brandBorder: 'border-op-you', brandShadow: 'shadow-lg', brandText: 'text-you-text', brandInactiveHover: 'hover:border-op-you/60 hover:bg-op-you-light' },
    { key: 'sabafon', name: 'سبأفون', brandBg: 'bg-op-sf', brandBorder: 'border-op-sf', brandShadow: 'shadow-lg', brandText: 'text-white', brandInactiveHover: 'hover:border-op-sf/60 hover:bg-op-sf-light' }
  ];

  const filtered = sims.filter(sim => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      (sim.iccid && sim.iccid.toLowerCase().includes(query)) ||
      (sim.phone && sim.phone.toLowerCase().includes(query)) ||
      (sim.category && sim.category.toLowerCase().includes(query));

    let matchesOperator = true;
    if (operatorFilter !== 'all') {
      matchesOperator = (sim.operator || '').toLowerCase() === operatorFilter.toLowerCase();
    }

    let matchesStatus = true;
    if (statusFilter === 'available') matchesStatus = sim.status === 'available';
    else if (statusFilter === 'sold') matchesStatus = sim.status === 'sold';
    else if (statusFilter === 'reserved') matchesStatus = sim.status === 'reserved';
    else if (statusFilter === 'allocated') matchesStatus = (sim.status as any) === 'allocated' || (sim.status as any) === 'suspended';
    else if (statusFilter === 'damaged') matchesStatus = (sim.status as any) === 'damaged' || (sim.status as any) === 'inactive';

    return matchesSearch && matchesOperator && matchesStatus;
  });

  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedList = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 text-right">

      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Cpu className="text-red-500" size={18} />
          <span>إدارة مخزون الشرائح العام للوكيل</span>
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none" dir="rtl">
        {operatorsList.map(op => {
          const stat = computedStats[op.key] || { total: 0, available: 0, sold: 0, reserved: 0, allocated: 0, damaged: 0 };
          const consumptionRate = stat.total > 0 ? Math.round((stat.sold / stat.total) * 100) : 0;
          const isActive = operatorFilter === op.key;
          return (
            <button
              key={op.key}
              onClick={() => { setOperatorFilter(isActive ? 'all' : op.key); setCurrentPage(1); }}
              className={`flex-shrink-0 w-56 sm:w-64 bg-slate-900 border-2 rounded-2xl p-4 text-right transition-all duration-200 active:scale-[0.98] ${isActive ? `${op.brandBorder} shadow-lg ${op.brandShadow}` : 'border-slate-800 hover:border-slate-600'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <OperatorLogo provider={op.key} size="md" />
                <span className="text-[10px] text-slate-400 font-medium">معدل التوزيع: {consumptionRate}%</span>
              </div>
              <h4 className="font-bold text-xs text-slate-100 pb-1">{op.name}</h4>
              <p className="text-xl font-bold text-slate-100 font-sans">{stat.total} <span className="text-[10px] text-slate-400 font-normal">شريحة</span></p>
              <div className="w-full bg-slate-950 rounded-full h-1 mt-2.5 overflow-hidden">
                <div className={`h-1 transition-all duration-500 ${isActive ? op.brandBg : 'bg-slate-600'}`} style={{ width: `${consumptionRate}%` }} />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-400 font-sans mt-3">
                <span>متوفر بمستودعك: <strong className="text-emerald-400">{stat.available}</strong></span>
                <span>مع البائعين: <strong className="text-blue-400">{stat.sold}</strong></span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="بحث برقم ICCID، الكود التسلسلي في المستودع..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="input-field text-xs bg-slate-950"
          />
          <Search className="absolute right-3 top-3 text-slate-500" size={14} />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute left-3 top-3 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto py-1" dir="rtl">
          <button
            onClick={() => { setOperatorFilter('all'); setCurrentPage(1); }}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 flex items-center gap-2 active:scale-[0.97] ${
              operatorFilter === 'all' ? 'bg-red-600/15 border-red-500/45 text-red-400 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-lg">apps</span>
            <span>الكل</span>
          </button>
          {operatorsList.map(op => (
            <button
              key={op.key}
              onClick={() => { setOperatorFilter(op.key); setCurrentPage(1); }}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 flex items-center gap-2 active:scale-[0.97] ${
                operatorFilter === op.key ? `${op.brandBg} ${op.brandBorder} ${op.brandShadow} ${op.brandText}` : `bg-slate-950 border-slate-800 text-slate-300 ${op.brandInactiveHover}`
              }`}
            >
              <OperatorLogo provider={op.key} size="md" plain />
              <span>{op.name}</span>
            </button>
          ))}
        </div>

      </div>

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
            onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
            className={`px-5 py-3 text-xs font-bold transition-all duration-200 relative whitespace-nowrap ${
              statusFilter === tab.id
                ? 'text-red-500 font-black border-b-2 border-red-600'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Smartphone size={36} className="text-slate-600" />} title="لم يتم العثور على أي شرائح مطابقة" description="جرب تغيير نطاق البحث أو تصفية الحالة للوصول إلى النتائج المطلوبة." />
      ) : (
        <div className="space-y-4">

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="table-wrap">
            <table className="text-xs table-cards-mobile">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400">
                  <th className="p-4">رقم الـ ICCID</th>
                  <th className="p-4">الشركة</th>
                  <th className="p-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {paginatedList.map(sim => (
                  <tr key={sim.id} className="hover:bg-slate-950/20">
                    <td data-label="ICCID" className="p-4 font-mono font-bold text-slate-100 truncate max-w-[160px]" dir="ltr">{sim.iccid}</td>
                    <td data-label="الشركة" className="p-4 text-slate-300">{sim.operator === 'yemen_mobile' ? 'يمن موبايل' : sim.operator === 'you' ? 'YOU' : 'سبأفون'}</td>
                    <td data-label="الحالة" className="p-4">
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
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
              <div className="text-right text-[11px] text-slate-400">
                عرض <strong className="text-white">{Math.min(filtered.length, startIndex + 1)}</strong> إلى <strong className="text-white">{Math.min(filtered.length, startIndex + itemsPerPage)}</strong> من أصل <strong className="text-white">{filtered.length}</strong> شريحة
              </div>
              <div className="flex gap-2">
                <button
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="btn btn-sm bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <span className="btn btn-sm bg-slate-950 text-slate-300 border border-slate-700 font-mono">
                  {safePage} / {totalPages}
                </span>
                <button
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="btn btn-sm bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
