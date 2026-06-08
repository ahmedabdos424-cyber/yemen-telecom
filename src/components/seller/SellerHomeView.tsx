import React from 'react';
import { PlusCircle, Smartphone, TrendingUp, Cpu, Award } from 'lucide-react';
import { Seller, Operation } from '../../types';

interface SellerHomeViewProps {
  sellerData: Seller;
  operations: Operation[];
  onActivateSim?: () => void;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function SellerHomeView({ operations, setActiveTab }: SellerHomeViewProps) {
  return (
    <div className="space-y-6">

      {/* Welcome Panel */}
      <div className="flex justify-between items-center text-right border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
            بوابة العمليات والمبيعات الموحدة
          </h2>

        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-950/60 border border-slate-850 px-2.5 py-1 rounded-xl" dir="ltr">2026-06-02</span>
      </div>

      {/* Quick simulated Action trigger button */}
      <div>
        <button
          onClick={() => setActiveTab('activate')}
          className="btn btn-primary w-full py-4 shadow-lg shadow-blue-950/20"
        >
          <PlusCircle size={15} />
          <span>تفعيل شريحة جديدة للمشتركين</span>
        </button>
      </div>

      {/* Quick Metrics counters Grid (matching images) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Metric A: Total sims sold */}
        <div className="stat-card flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="btn-icon bg-blue-500/10 rounded-xl text-[#0151d5]">
              <Smartphone size={16} />
            </span>
            <span className="text-emerald-400 bg-emerald-950/30 text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp size={10} /> +12%
            </span>
          </div>
          <div className="text-right">
            <h4 className="text-[10px] text-slate-400 font-medium">اجمالي الشرائح المباعة</h4>
            <p className="stat-card-value text-white">42 <span className="text-[11px] text-slate-500">شريحة</span></p>
          </div>
        </div>

        {/* Metric B: Total sims remaining points */}
        <div className="stat-card flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="btn-icon bg-purple-500/10 rounded-xl text-purple-400">
              <Cpu size={16} />
            </span>
            <span className="text-[8px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full">مزامنة تامة</span>
          </div>
          <div className="text-right">
            <h4 className="text-[10px] text-slate-400 font-medium">إجمالي الشرائح المتبقية</h4>
            <p className="stat-card-value text-white">1,250 <span className="text-[11px] text-slate-500">نقطة</span></p>
          </div>
        </div>

        {/* Metric C: Account status and class type tier */}
        <div className="stat-card flex flex-col justify-between h-32 col-span-2 lg:col-span-1 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="p-2 bg-red-500/10 rounded-xl text-red-500 animate-pulse">
              <Award size={16} />
            </span>
            <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold">نشط معتمد</span>
          </div>
          <div className="text-right">
            <h4 className="text-[10px] text-slate-400 font-medium">حالة الحساب والعمولات الممتازة</h4>
            <p className="text-sm font-bold tracking-tight text-white mt-1">ممتاز (فئة أ)</p>
          </div>
        </div>

      </div>

      {/* Recent Operations log list card block */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">العمليات والطلبات الأخيرة بالفرع</h3>
          <button
            onClick={() => setActiveTab('my_sims')}
            className="text-xs text-[#0151d5] hover:text-[#0047be] font-bold transition-all"
          >
            عرض كل الشرائح
          </button>
        </div>

        <div className="table-wrap">
          <table className="text-xs">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400">
                <th className="p-4 font-bold text-slate-400">نوع العملية ومقدم الخدمة</th>
                <th className="p-4 font-bold text-slate-400">الرقم/المرجع</th>
                <th className="p-4 font-bold text-slate-400">توقيت العملية</th>
                <th className="p-4 font-bold text-slate-400 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {operations.map((op) => (
                <tr key={op.id} className="hover:bg-slate-950/10 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        op.status === 'success'
                          ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                          : 'bg-red-950/30 text-red-500 border border-red-900/30'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {op.type === 'activate' ? 'person_add' : 'payments'}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-200">
                          {op.type === 'activate' ? 'تفعيل شريحة' : 'شحن رصيد'}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {op.operator === 'yemen_mobile' ? 'يمن موبايل' : op.operator === 'you' ? 'YOU' : 'سبأفون'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-300 font-semibold select-all">
                    {op.target}
                  </td>
                  <td className="p-4 text-slate-400">
                    {op.time}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      op.status === 'success'
                        ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                        : 'bg-red-950/30 text-red-500 border border-red-900/30'
                    }`}>
                      {op.status === 'success' ? 'ناجحة' : 'فشلت'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
