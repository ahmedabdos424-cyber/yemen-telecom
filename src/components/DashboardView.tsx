/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SIM, Agent, Seller, SystemAlert, Transaction, ViewType } from '../types';
import OperatorLogo from './shared/OperatorLogo';

interface DashboardViewProps {
  stats: {
    total_sims?: number;
    sold_sims?: number;
    remaining_sims?: number;
    active_sims?: number;
    total_agents?: number;
    total_sellers?: number;
    sales_growth?: number;
    sales_weekly?: number;
    operators?: Array<{ provider: string; count: string | number; percentage?: number }>;
    total_sims_growth?: number;
    sold_sims_growth?: number;
    active_sims_growth?: number;
    agent_growth?: number;
    seller_growth?: number;
    sims_added_30d?: number;
    activations_30d?: number;
    agents_added_30d?: number;
    sellers_added_30d?: number;
  };
  alerts: SystemAlert[];
  transactions: Transaction[];
  sims: SIM[];
  setView: (view: ViewType) => void;
  setSelectedEntity?: (entity: any) => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
}

const OPERATOR_META: Record<string, { id: string; color: string; description: string }> = {
  'Yemen Mobile': { id: 'yemen_mobile', color: 'bg-secondary', description: 'المزود الأكبر في السوق الوطنية' },
  'Yemen Mobile - يمن موبايل': { id: 'yemen_mobile', color: 'bg-secondary', description: 'المزود الأكبر في السوق الوطنية' },
  'Sabafon': { id: 'sabafon', color: 'bg-blue-600', description: 'نمو مستمر بقاعدة المشتركين' },
  'Sabafon - سبأفون': { id: 'sabafon', color: 'bg-blue-600', description: 'نمو مستمر بقاعدة المشتركين' },
  'YOU': { id: 'you', color: 'bg-amber-400', description: 'شريحة الشباب والبيانات' },
  'YOU - يو': { id: 'you', color: 'bg-amber-400', description: 'شريحة الشباب والبيانات' },
};

export default function DashboardView({
  stats,
  alerts = [],
  transactions = [],
  sims,
  setView,
  setSelectedEntity,
  onSearch,
  onRefresh
}: DashboardViewProps) {
  const s = {
    total_sims: stats?.total_sims ?? 0,
    sold_sims: stats?.sold_sims ?? 0,
    remaining_sims: stats?.remaining_sims ?? 0,
    active_sims: stats?.active_sims ?? 0,
    total_agents: stats?.total_agents ?? 0,
    total_sellers: stats?.total_sellers ?? 0,
    sales_growth: stats?.sales_growth ?? 0,
    sales_weekly: stats?.sales_weekly ?? 0,
    total_sims_growth: stats?.total_sims_growth ?? 0,
    sold_sims_growth: stats?.sold_sims_growth ?? 0,
    active_sims_growth: stats?.active_sims_growth ?? 0,
    agents_added_30d: stats?.agents_added_30d ?? 0,
    sellers_added_30d: stats?.sellers_added_30d ?? 0,
  };
  const operators = (stats?.operators ?? []) as Array<{ provider: string; count: number; percentage: number }>;
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    } else {
      setView('sims');
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2">
        {/* Search Input Bar */}
        <div className="input-group shadow-sm flex-1">
        <span className="material-symbols-outlined input-icon">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyPress}
          placeholder="ابحث عن رقم شريحة، ICCID، وكيل، أو عملية..."
          className="input-field"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={handleSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-secondary bg-red-100 hover:bg-red-200 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">بحث متقدم</span>
            <span className="sm:hidden">بحث</span>
          </button>
        )}
      </div>
        <button
          type="button"
          onClick={() => onRefresh?.()}
          className="btn btn-ghost px-3 py-2 shrink-0"
          title="تحديث البيانات"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-5">
        {/* Card 1: Total SIMs */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="stat-card cursor-pointer group"
          onClick={() => setView('sims')}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-900 border border-gray-100 group-hover:bg-primary group-hover:text-white transition-colors duration-205">
              <span className="material-symbols-outlined text-[18px]">sim_card</span>
            </div>
            <span className={`font-extrabold text-[11px] bg-green-50/70 border border-green-100/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${s.total_sims_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.total_sims_growth >= 0 ? '+' : ''}{s.total_sims_growth}%</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold tracking-wide">إجمالي الشرائح</p>
            <h3 className="stat-card-value">{s.total_sims.toLocaleString()}</h3>
          </div>
        </motion.div>

        {/* Card 2: Sold SIMs */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="stat-card cursor-pointer group"
          onClick={() => setView('sims')}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-red-50/65 flex items-center justify-center text-secondary border border-red-100/50 group-hover:bg-secondary group-hover:text-white transition-colors duration-205">
              <span className="material-symbols-outlined text-[18px]">sell</span>
            </div>
            <span className={`font-extrabold text-[11px] bg-green-50/70 border border-green-100/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${s.sold_sims_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.sold_sims_growth >= 0 ? '+' : ''}{s.sold_sims_growth}%</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold tracking-wide">الشرائح المباعة</p>
            <h3 className="stat-card-value">{s.sold_sims.toLocaleString()}</h3>
          </div>
        </motion.div>

        {/* Card 3: Inactive Remaining */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="stat-card cursor-pointer group"
          onClick={() => setView('sims')}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50/65 flex items-center justify-center text-blue-600 border border-blue-100/50 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-205">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            </div>
            <span className="text-gray-400 font-extrabold text-[11px] bg-gray-50/80 border border-gray-200/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">{s.remaining_sims > 0 ? `${Math.round((s.remaining_sims / Math.max(s.total_sims, 1)) * 100)}%` : '0%'}</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold tracking-wide">المخزون المتبقي</p>
            <h3 className="stat-card-value">{s.remaining_sims.toLocaleString()}</h3>
          </div>
        </motion.div>

        {/* Card 4: Active SIMs */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="stat-card cursor-pointer group"
          onClick={() => setView('sims')}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-green-50/65 flex items-center justify-center text-green-600 border border-green-100/50 group-hover:bg-green-600 group-hover:text-white transition-colors duration-205">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
            <span className={`font-extrabold text-[11px] bg-green-50/70 border border-green-100/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${s.active_sims_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.active_sims_growth >= 0 ? '+' : ''}{s.active_sims_growth}%</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold tracking-wide">الهواتف النشطة</p>
            <h3 className="stat-card-value">{s.active_sims.toLocaleString()}</h3>
          </div>
        </motion.div>

        {/* Card 5: Total Agents */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="stat-card cursor-pointer group"
          onClick={() => setView('agents')}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50/65 flex items-center justify-center text-purple-600 border border-purple-100/50 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-205">
              <span className="material-symbols-outlined text-[18px]">badge</span>
            </div>
            <span className="text-primary font-extrabold text-[11px] bg-gray-50/80 border border-gray-200/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">+{s.agents_added_30d} جديد</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold tracking-wide">الوكلاء المعتمدين</p>
            <h3 className="stat-card-value">{s.total_agents}</h3>
          </div>
        </motion.div>

        {/* Card 6: Total Sellers */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="stat-card cursor-pointer group"
          onClick={() => setView('sellers')}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-orange-50/65 flex items-center justify-center text-orange-600 border border-orange-100/50 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-205">
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            </div>
            <span className="text-primary font-extrabold text-[11px] bg-gray-50/80 border border-gray-200/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">+{s.sellers_added_30d} جديد</span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold tracking-wide">نقاط بيع البائعين</p>
            <h3 className="stat-card-value">{s.total_sellers}</h3>
          </div>
        </motion.div>
      </div>

      {/* Alerts and Provider Performance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Smart Alerts Box */}
        <section className="lg:col-span-5">
          <div className="card overflow-hidden h-full flex flex-col">
            <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary font-bold">bolt</span>
                <h2 className="font-title-lg text-xs md:text-sm font-bold text-gray-900">تنبيهات النظام الذكية</h2>
              </div>
              <span className="badge badge-active">
                {alerts.length} نشطة
              </span>
            </div>
            <div className="p-3 md:p-4 space-y-2.5 md:space-y-3 flex-1 overflow-y-auto max-h-60 md:max-h-72">
              {alerts.length === 0 && (
                <div className="text-center py-6 md:py-8 text-gray-400 text-xs">
                  لا توجد تنبيهات نشطة حالياً
                </div>
              )}
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-2.5 md:p-3 rounded-xl border-r-4 ${alert.priority === 'high' ? 'border-red-500 bg-red-50/30' : alert.priority === 'medium' ? 'border-orange-500 bg-orange-50/30' : 'border-blue-500 bg-blue-50/30'} flex gap-2.5 md:gap-3 items-start`}>
                  <span className={`material-symbols-outlined ${alert.priority === 'high' ? 'text-red-600' : alert.priority === 'medium' ? 'text-orange-600' : 'text-blue-600'} text-lg md:text-xl`}>
                    {alert.priority === 'high' ? 'warning' : alert.priority === 'medium' ? 'content_copy' : 'info'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[11px] md:text-xs leading-tight">{alert.title}</h4>
                    <p className="text-[10px] md:text-[11px] mt-0.5 md:mt-1 text-gray-600">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 md:p-4 pt-0 border-t border-gray-100 bg-gray-50/50">
              <button 
                onClick={() => setView('alerts')}
                className="btn btn-ghost btn-sm w-full"
              >
                <span>إدارة التنبيهات والأمان</span>
                <span className="material-symbols-outlined text-sm">arrow_left</span>
              </button>
            </div>
          </div>
        </section>

        {/* Provider Analytics Summary */}
        <section className="lg:col-span-7">
          <div className="card h-full flex flex-col justify-between">
            <h2 className="font-title-lg text-xs md:text-sm font-bold text-gray-900 mb-3 md:mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              أداء شركات المزودين والشرائح المفعّلة
            </h2>
            <div className="space-y-4 md:space-y-6 flex-1 flex flex-col justify-center">
              {operators.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs">
                  لا توجد بيانات مشغلين متاحة حالياً
                </div>
              )}
              {operators.map((op) => {
                const meta = OPERATOR_META[op.provider] || OPERATOR_META[Object.keys(OPERATOR_META).find(k => k.startsWith(op.provider)) || ''] || { id: 'yemen_mobile', color: 'bg-gray-500', description: '' };
                const label = op.provider.includes('Yemen Mobile') ? 'Yemen Mobile (يمن موبايل)' : op.provider.includes('Sabafon') ? 'Sabafon (سبأفون)' : op.provider.includes('YOU') ? 'YOU (يو)' : op.provider;
                return (
                  <div key={op.provider} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <OperatorLogo provider={meta.id} size="md" />
                        <div>
                          <h4 className="font-bold text-xs text-gray-900">{label}</h4>
                          <p className={`text-[11px] font-bold ${meta.color === 'bg-secondary' ? 'text-secondary' : meta.color === 'bg-blue-600' ? 'text-blue-600' : 'text-amber-600'}`}>{meta.description}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono">{op.count.toLocaleString()} شريحة</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${meta.color} rounded-full transition-all`} style={{ width: `${Math.max(op.percentage, 2)}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Recent Operations Section */}
      <section className="card overflow-hidden">
        <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-title-lg text-xs md:text-sm font-bold text-gray-900">آخر العمليات والتوزيعات للنظام</h2>
          <button 
            onClick={() => setView('sims')} 
            className="btn btn-ghost btn-sm"
          >
            عرض جميع الشرائح
            <span className="material-symbols-outlined text-xs">arrow_left</span>
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-3 md:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 md:gap-3.5 min-w-0 flex-1">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${
                  tx.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <span className="material-symbols-outlined text-[18px] md:text-[20px]">
                    {tx.status === 'completed' ? 'receipt_long' : 'pending'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-[11px] md:text-xs text-gray-900 truncate">{tx.clientName}</h4>
                  <p className="text-[10px] md:text-[11px] text-gray-500 mt-0.5 md:mt-1 truncate">
                    {tx.provider === 'Yemen Mobile' ? 'يمن موبايل' : tx.provider === 'Sabafon' ? 'سبأفون' : 'YOU'} • {(tx.simsCount ?? 0).toLocaleString()} شريحة مخصصة
                  </p>
                </div>
              </div>
              <div className="text-left shrink-0 mr-2">
                <span className={`px-2 py-0.5 text-[10px] md:text-[11px] font-bold rounded-full ${
                  tx.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {tx.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                </span>
                <p className="text-[10px] md:text-[11px] text-gray-400 mt-0.5 md:mt-1 font-mono">{tx.relativeTime}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
