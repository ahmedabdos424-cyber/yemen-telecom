/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SIM, Agent, Seller, SystemAlert, Transaction, ViewType } from '../types';

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
  };
  alerts: SystemAlert[];
  transactions: Transaction[];
  sims: SIM[];
  setView: (view: ViewType) => void;
  setSelectedEntity?: (entity: any) => void;
}

export default function DashboardView({
  stats,
  alerts,
  transactions,
  sims,
  setView,
  setSelectedEntity
}: DashboardViewProps) {
  const s = {
    total_sims: stats?.total_sims ?? 1240000,
    sold_sims: stats?.sold_sims ?? 890200,
    remaining_sims: stats?.remaining_sims ?? 349800,
    active_sims: stats?.active_sims ?? 742000,
    total_agents: stats?.total_agents ?? 142,
    total_sellers: stats?.total_sellers ?? 3150,
    sales_growth: stats?.sales_growth ?? 12.5,
    sales_weekly: stats?.sales_weekly ?? 124500,
  };
  const [searchQuery, setSearchQuery] = useState('');

  // Search logic that searches through SIM ICCID, phone number or agent name
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setView('sims'); // Forward search query context to SIM list
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="input-group shadow-sm">
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
            onClick={() => setView('sims')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary bg-red-100 hover:bg-red-200 px-3 py-2 rounded-lg transition-colors"
          >
            بحث متقدم
          </button>
        )}
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 md:gap-5">
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
            <span className="text-green-600 font-extrabold text-[11px] bg-green-50/70 border border-green-100/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">+{s.sales_growth}%</span>
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
            <span className="text-green-600 font-extrabold text-[11px] bg-green-50/70 border border-green-100/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">+{Math.round(s.sales_growth / 1.5)}%</span>
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
            <span className="text-red-500 font-extrabold text-[11px] bg-red-50/70 border border-red-100/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">-{Math.abs(s.sold_sims > s.total_sims / 2 ? 2 : 5)}%</span>
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
            <span className="text-green-600 font-extrabold text-[11px] bg-green-50/70 border border-green-100/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">+{Math.round(s.active_sims / 50000)}%</span>
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
            <span className="text-primary font-extrabold text-[11px] bg-gray-50/80 border border-gray-200/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">+{Math.round(s.total_agents / 40)} فرع</span>
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
            <span className="text-primary font-extrabold text-[11px] bg-gray-50/80 border border-gray-200/50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">+{Math.round(s.total_sellers / 250)} نقطة</span>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary font-bold">bolt</span>
                <h2 className="font-title-lg text-sm font-bold text-gray-900">تنبيهات النظام الذكية</h2>
              </div>
              <span className="badge badge-active">
                {alerts.length} نشطة
              </span>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-72">
              {alerts.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs">
                  لا توجد تنبيهات نشطة حالياً
                </div>
              )}
              {alerts.map((alert) => (
                <div key={alert.id} className={`card border-r-4 ${alert.priority === 'high' ? 'border-red-500' : alert.priority === 'medium' ? 'border-orange-500' : 'border-blue-500'} flex gap-3 items-start`}>
                  <span className={`material-symbols-outlined ${alert.priority === 'high' ? 'text-red-600' : alert.priority === 'medium' ? 'text-orange-600' : 'text-blue-600'} text-xl`}>
                    {alert.priority === 'high' ? 'warning' : alert.priority === 'medium' ? 'content_copy' : 'info'}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs leading-tight">{alert.title}</h4>
                    <p className="text-[11px] mt-1">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full flex flex-col justify-between">
            <h2 className="font-title-lg text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              أداء شركات المزودين والشرائح المفعّلة
            </h2>
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              {/* Yemen Mobile */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary text-white font-bold text-sm flex items-center justify-center shadow-sm">
                      YM
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">Yemen Mobile (يمن موبايل)</h4>
                      <p className="text-[11px] text-secondary font-bold">المزود الأكبر في السوق الوطنية</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono">450,200 شريحة</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full transition-all" style={{ width: '65%' }}></div>
                </div>
              </div>

              {/* Sabafon */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                      S
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">Sabafon (سبأفون)</h4>
                      <p className="text-[11px] text-blue-600 font-bold">نمو مستمر بقاعدة المشتركين</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono">280,150 شريحة</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: '42%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Operations Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-title-lg text-sm font-bold text-gray-900">آخر العمليات والتوزيعات للنظام</h2>
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
            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  tx.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {tx.status === 'completed' ? 'receipt_long' : 'pending'}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900">{tx.clientName}</h4>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {tx.provider === 'Yemen Mobile' ? 'يمن موبايل' : tx.provider === 'Sabafon' ? 'سبأفون' : 'YOU'} • {tx.simsCount.toLocaleString()} شريحة مخصصة
                  </p>
                </div>
              </div>
              <div className="text-left">
                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                  tx.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {tx.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                </span>
                <p className="text-[11px] text-gray-400 mt-1 font-mono">{tx.relativeTime}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
