import React, { useState } from 'react';
import { Search, Cpu } from 'lucide-react';
import { Sim } from '../../types';
import ConfirmModal from '../shared/ConfirmModal';

interface SimManagementViewProps {
  sims: Sim[];
  onUpdateSims?: (updated: Sim[]) => void;
}

export default function SimManagementView({
  sims,
  onUpdateSims
}: SimManagementViewProps) {
  const [miniSimSearchQuery, setMiniSimSearchQuery] = useState('');
  const [miniSimOperatorFilter, setMiniSimOperatorFilter] = useState('all');
  const [statusChangeSimId, setStatusChangeSimId] = useState<string | null>(null);

  // Stats computed from all SIMs for the Agent
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

  // Search & Filters Application for Agent Sim Tab
  const filtered = sims.filter(sim => {
    const query = miniSimSearchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      (sim.iccid && sim.iccid.toLowerCase().includes(query)) ||
      (sim.phone && sim.phone.toLowerCase().includes(query)) ||
      (sim.category && sim.category.toLowerCase().includes(query));

    let matchesStatus = true;
    if (miniSimOperatorFilter !== 'all') {
      matchesStatus = (sim.operator || '').toLowerCase() === miniSimOperatorFilter.toLowerCase();
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-right">
      
      {/* Header Title with Zero Personal Data */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Cpu className="text-red-500" size={18} />
          <span>إدارة مخزون الشرائح العام للوكيل</span>
        </h2>

      </div>

      {/* 1. Horizontal Scrollable Company Statistics Cards */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none" dir="rtl">
        {operatorsList.map(op => {
          const stat = computedStats[op.key] || { total: 0, available: 0, sold: 0, reserved: 0, allocated: 0, damaged: 0 };
          const consumptionRate = stat.total > 0 ? Math.round((stat.sold / stat.total) * 100) : 0;

          return (
            <button
              key={op.key}
              onClick={() => setMiniSimOperatorFilter(miniSimOperatorFilter === op.key ? 'all' : op.key)}
              className={`flex-shrink-0 w-64 bg-slate-900 border ${
                miniSimOperatorFilter === op.key ? 'border-red-500 shadow-md shadow-red-950/10' : 'border-slate-800'
              } rounded-2xl p-4 text-right transition-all hover:border-slate-700`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-9 h-9 rounded-xl ${op.iconColor} border flex items-center justify-center font-bold text-xs`}>
                  {op.logo}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">معدل التوزيع: {consumptionRate}%</span>
              </div>
              
              <h4 className="font-bold text-xs text-slate-100 pb-1">{op.name}</h4>
              <p className="text-xl font-bold text-slate-100 font-sans">{stat.total} <span className="text-[10px] text-slate-400 font-normal">شريحة</span></p>
              
              {/* Progress Bar Container */}
              <div className="w-full bg-slate-950 rounded-full h-1 mt-2.5 overflow-hidden">
                <div className="bg-red-500 h-1 transition-all duration-500" style={{ width: `${consumptionRate}%` }} />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans mt-3">
                <span>متوفر بمستودعك: <strong className="text-emerald-400">{stat.available}</strong></span>
                <span>مع البائعين: <strong className="text-blue-400">{stat.sold}</strong></span>
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
            placeholder="بحث برقم ICCID، الكود التسلسلي في المستودع..."
            value={miniSimSearchQuery}
            onChange={(e) => setMiniSimSearchQuery(e.target.value)}
            className="input-field text-xs bg-slate-950"
          />
          <Search className="absolute right-3 top-3 text-slate-500" size={14} />
        </div>

        {/* Operator Badge Filters */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setMiniSimOperatorFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
              miniSimOperatorFilter === 'all' ? 'bg-red-600/15 border-red-500/45 text-red-300 animate-pulse' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-100'
            }`}
          >
            الكل
          </button>
          {operatorsList.map(op => (
            <button
              key={op.key}
              onClick={() => setMiniSimOperatorFilter(op.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                miniSimOperatorFilter === op.key ? op.iconColor : 'bg-slate-950 border-slate-850 text-slate-400'
              }`}
            >
              {op.name}
            </button>
          ))}
        </div>

      </div>

      {/* Display list of all central SIMs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="table-wrap">
        <table className="text-xs">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400">
              <th className="p-4">رقم الـ ICCID</th>
              <th className="p-4">المشغل</th>
              <th className="p-4">الحيازة / العهدة</th>
              <th className="p-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filtered.slice(0, 10).map(sim => (
              <tr key={sim.id} className="hover:bg-slate-955/15">
                <td className="p-4 font-mono font-bold text-slate-100" dir="ltr">{sim.iccid}</td>
                <td className="p-4 text-slate-300">{sim.operator === 'yemen_mobile' ? 'يمن موبايل' : sim.operator === 'you' ? 'YOU' : 'سبأفون'}</td>
                <td className="p-4">
                  <span className={`badge ${sim.status === 'available' ? 'badge-available' : 'badge-sold'}`}>
                    {sim.status === 'available' ? 'المستودع الرئيسي' : `نقطة البيع: ${sim.owner || 'بائع مجهول'}`}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => setStatusChangeSimId(sim.id)}
                    className="btn btn-sm btn-ghost"
                  >
                    تعديل فوري
                  </button>
                </td>
              </tr>
              ))}
          </tbody>
        </table>
        </div>
      </div>

      <ConfirmModal
        open={statusChangeSimId !== null}
        onConfirm={() => {
          if (statusChangeSimId && onUpdateSims) {
            const sim = sims.find(s => s.id === statusChangeSimId);
            if (sim) {
              const nextStat = sim.status === 'available' ? 'sold' : 'available';
              const updated = sims.map(s => s.id === statusChangeSimId ? { ...s, status: nextStat as any, owner: nextStat === 'available' ? undefined : 'المحل المعتمد' } : s);
              onUpdateSims(updated);
            }
          }
          setStatusChangeSimId(null);
        }}
        onCancel={() => setStatusChangeSimId(null)}
        title="تعديل حالة الشريحة"
        message="هل ترغب في تعديل حالة هذه الشريحة يدوياً؟"
        confirmLabel="نعم، تعديل"
        cancelLabel="إلغاء"
        variant="warning"
      />

    </div>
  );
}
