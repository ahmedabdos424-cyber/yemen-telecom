import React, { useState } from 'react';
import {
  User, CheckCircle, AlertTriangle, TrendingUp, Search, X, Edit, History,
  Smartphone, DollarSign, Lock, MoreVertical
} from 'lucide-react';
import { Seller } from '../../types';

interface SellerListViewProps {
  sellers: Seller[];
  onAddSeller?: () => void;
  onUpdateSellerStatus?: (sellerId: string, status: 'active' | 'inactive') => void;
  onResetSellerPassword?: (sellerId: string) => void;
  onEditSeller?: (seller: Seller) => void;
  onViewHistory?: (seller: Seller) => void;
  onManageSims?: (seller: Seller) => void;
  onViewPayments?: (seller: Seller) => void;
  onLockToggle?: (sellerId: string, locked: boolean) => void;
}

export default function SellerListView({
  sellers,
  onAddSeller,
  onUpdateSellerStatus,
  onResetSellerPassword,
  onEditSeller,
  onViewHistory,
  onManageSims,
  onViewPayments,
  onLockToggle
}: SellerListViewProps) {
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [sellerRegionFilter, setSellerRegionFilter] = useState('all');
  const [sellerStatusFilter, setSellerStatusFilter] = useState('all');
  const [sellerLockedState, setSellerLockedState] = useState<Record<string, boolean>>({});

  // Compute stats for sellers
  const totalCount = sellers.length;
  const activeCount = sellers.filter(s => s.status === 'active').length;
  const lowStockCount = sellers.filter(s => s.status === 'low_stock').length;
  const dailyAllocations = 0;

  // Apply filters
  const filteredSellers = sellers.filter(seller => {
    const q = sellerSearchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      (seller.name && seller.name.toLowerCase().includes(q)) ||
      (seller.phone && seller.phone.toLowerCase().includes(q)) ||
      (seller.storeName && seller.storeName.toLowerCase().includes(q));

    const matchesRegion = sellerRegionFilter === 'all' || seller.region === sellerRegionFilter;
    const matchesStatus = sellerStatusFilter === 'all' || seller.status === sellerStatusFilter;

    return matchesSearch && matchesRegion && matchesStatus;
  });

  const handleResetPasswordClick = (seller: Seller) => {
    if (onResetSellerPassword) onResetSellerPassword(seller.id);
  };

  const handleToggleStatusClick = (seller: Seller) => {
    const newStatus = seller.status === 'inactive' ? 'active' : 'inactive';
    if (onUpdateSellerStatus) onUpdateSellerStatus(seller.id, newStatus);
  };

  const handleLockToggle = (seller: Seller, isLocked: boolean) => {
    const lockState = !isLocked;
    setSellerLockedState({
      ...sellerLockedState,
      [seller.id]: lockState
    });
    if (onLockToggle) {
      onLockToggle(seller.id, lockState);
    } else {
      alert(lockState ? `تم قفل الحساب المالي للمستخدم "${seller.name}" مؤقتاً!` : `تم فك قفل وسحب الحظر عن البائع "${seller.name}"!`);
    }
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* Stat Cards: Total Sellers, Active, Low Stock, Daily Sales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="stat-card flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block">إجمالي البائعين</span>
            <h3 className="stat-card-value text-slate-100">{totalCount} <span className="text-xs text-slate-400 font-normal">بائع</span></h3>
            <span className="text-[9px] text-slate-500 block">نطاق التغطية الشاملة</span>
          </div>
          <div className="btn-icon bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <User size={18} />
          </div>
        </div>

        <div className="stat-card flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block">البائعين النشطين</span>
            <h3 className="stat-card-value text-emerald-400">{activeCount} <span className="text-xs text-slate-400 font-normal">متصل</span></h3>
            <span className="text-[9px] text-emerald-500 block">● متفاعل بالوقت الحالي</span>
          </div>
          <div className="btn-icon bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="stat-card flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block">مخزون منخفض حرج</span>
            <h3 className="stat-card-value text-amber-500">{lowStockCount} <span className="text-xs text-slate-400 font-normal">حساب</span></h3>
            <span className="text-[9px] text-amber-500 block">يحتاج للتغذية العاجلة</span>
          </div>
          <div className="btn-icon bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="stat-card flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block">مبيعات اليوم والتوزيع</span>
            <h3 className="stat-card-value text-red-500">{dailyAllocations} <span className="text-xs text-slate-400 font-normal">عملية</span></h3>
            <span className="text-[9px] text-red-500 block">تنشيطات ذكية فورية</span>
          </div>
          <div className="btn-icon bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>

      </div>

      {/* Live Search and Filtering Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-center justify-between">
        
        <div className="relative w-full lg:w-96">
          <input
            type="text"
            placeholder="بحث باسم البائع، رقم الهاتف، اسم المتجر التجاري..."
            value={sellerSearchQuery}
            onChange={(e) => setSellerSearchQuery(e.target.value)}
            className="input-field text-xs bg-slate-950"
          />
          <Search className="absolute right-3 top-3 text-slate-500" size={14} />
          {sellerSearchQuery && (
            <button onClick={() => setSellerSearchQuery('')} className="absolute left-3 top-3 text-slate-500 hover:text-slate-100">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select
            value={sellerRegionFilter}
            onChange={(e) => setSellerRegionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-200 outline-none"
          >
            <option value="all">كل المحافظات والمناطق</option>
            <option value="الرياض">الرياض / العليا</option>
            <option value="مكة المكرمة">مكة المكرمة</option>
            <option value="المدينة المنورة">المدينة المنورة</option>
            <option value="المنطقة الشرقية">المنطقة الشرقية</option>
          </select>

          <select
            value={sellerStatusFilter}
            onChange={(e) => setSellerStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-200 outline-none"
          >
            <option value="all">كل الحالات والأمن</option>
            <option value="active">نشط ومصرح</option>
            <option value="low_stock">مخزون منخفض</option>
            <option value="inactive">معلق / مقفل</option>
          </select>
        </div>

      </div>

      {/* Custom Interactive Table/Grid List */}
      {filteredSellers.length === 0 ? (
        <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl p-12 space-y-3">
          <User className="mx-auto text-slate-700 animate-pulse" size={32} />
          <h4 className="text-xs font-bold text-slate-100">لم نجد أي مطابق في قائمة البائعين المسجلين</h4>
          <p className="text-[10px] text-slate-400 font-light max-w-xs mx-auto">تأكد من تعديل كلمات البحث أو تصفير حقول المناطق والعمليات.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          
          {/* Desktop view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-bold">
                  <th className="p-4">البائع / المتجر</th>
                  <th className="p-4">الهاتف / المحافظة</th>
                  <th className="p-4">المخزون بعهدتهم</th>
                  <th className="p-4">استهلاك وتشغيل</th>
                  <th className="p-4 text-center">أمن وصلاحية</th>
                  <th className="p-4 text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredSellers.map(seller => {
                  const isLocked = !!sellerLockedState[seller.id];
                  
                  return (
                    <tr key={seller.id} className="hover:bg-slate-955/15">
                      <td className="p-4 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800/60 flex items-center justify-center font-bold text-slate-400">
                          {seller.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-100 text-xs">{seller.name}</p>
                          <p className="text-[10px] text-slate-500 font-light mt-0.5">{seller.storeName || 'محل التجزئة'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-mono text-slate-200" dir="ltr">{seller.phone}</p>
                        <p className="text-[10px] text-slate-500">{seller.region}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-100 font-sans">{seller.simsCount} <span className="text-[10px] text-slate-500 font-normal">SIM</span></p>
                        <p className="text-[9px] text-slate-500 font-light">آخر تحويل: فوري</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-amber-500 font-sans">{seller.activityRate || 68}%</p>
                        <span className="text-[9px] text-slate-500 font-light">معدل تسييل الحصة</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`badge ${
                          isLocked ? 'badge-suspended' :
                          seller.status === 'active' ? 'badge-active' :
                          seller.status === 'low_stock' ? 'badge-pending' :
                          'badge-suspended'
                        }`}>
                          {isLocked ? 'مقفل أمنياً' : seller.status === 'active' ? 'نشط وصالح' : seller.status === 'low_stock' ? 'مخزون حرج' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {/* Quick Actions (Icons only as requested) */}
                        <div className="flex gap-1.5 justify-center items-center">
                          
                          <button
                            onClick={() => {
                              if (onEditSeller) onEditSeller(seller);
                            }}
                            className="btn-sm btn-ghost"
                            title="تعديل بيانات الحساب"
                          >
                            <Edit size={12} />
                          </button>

                          <button
                            onClick={() => {
                              if (onViewHistory) onViewHistory(seller);
                            }}
                            className="btn-sm btn-ghost"
                            title="سجل العمليات"
                          >
                            <History size={12} />
                          </button>

                          <button
                            onClick={() => {
                              if (onManageSims) onManageSims(seller);
                            }}
                            className="btn-sm btn-ghost text-red-400 hover:bg-red-950/20 hover:text-red-300"
                            title="إدارة الشرائح المخصصة"
                          >
                            <Smartphone size={12} />
                          </button>

                          <button
                            onClick={() => {
                              if (onViewPayments) onViewPayments(seller);
                            }}
                            className="btn-sm btn-ghost"
                            title="دفعات الحساب المالية"
                          >
                            <DollarSign size={12} />
                          </button>

                          <button
                            onClick={() => handleLockToggle(seller, isLocked)}
                            className={`btn-sm rounded-lg border cursor-pointer transition-colors ${
                              isLocked ? 'bg-red-950 text-red-400 border-red-900/60' : 'btn-ghost'
                            }`}
                            title={isLocked ? "فك قفل الحساب" : "قفل الحساب فوراً"}
                          >
                            <Lock size={11} />
                          </button>

                          <button
                            onClick={() => {
                              alert(`الاسم: ${seller.name}\nالمتجر: ${seller.storeName}\nالرصيد المشحون: متوفر\nمعدل التشغيل: ممتاز`);
                            }}
                            className="btn-sm btn-ghost"
                          >
                            <MoreVertical size={12} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View: horizontal scrollable cards */}
          <div className="block md:hidden px-3 py-4">
            <div className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory scroll-smooth" dir="ltr">
              {filteredSellers.map(seller => {
                const isLocked = !!sellerLockedState[seller.id];
                const statusColor = isLocked ? 'badge-suspended' :
                  seller.status === 'active' ? 'badge-active' :
                  seller.status === 'low_stock' ? 'badge-pending' : 'badge-suspended';
                const statusText = isLocked ? 'مقفل' :
                  seller.status === 'active' ? 'نشط' :
                  seller.status === 'low_stock' ? 'مخزون حرج' : 'غير نشط';
                return (
                  <div key={seller.id} className="card flex-shrink-0 w-[75vw] max-w-[320px] snap-center space-y-3.5 relative overflow-hidden">
                    {/* Top gradient accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-red-500/40 via-amber-500/30 to-emerald-500/40 rounded-t-2xl"></div>
                    
                    {/* Header: Avatar + Name + Status */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/20 to-red-800/10 border border-slate-700/50 flex items-center justify-center font-bold text-slate-300 text-sm flex-shrink-0">
                        {seller.name.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <h4 className="font-bold text-slate-100 text-sm truncate">{seller.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{seller.storeName || 'متجر بيع بالتجزئة'}</p>
                      </div>
                      <span className={`badge ${statusColor} flex-shrink-0`}>{statusText}</span>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] bg-slate-900/60 p-3 rounded-xl">
                      <div className="text-slate-500">المنطقة: <strong className="text-slate-100 block text-xs mt-0.5">{seller.region}</strong></div>
                      <div className="text-slate-500">الهاتف: <strong className="text-slate-100 block text-xs mt-0.5 font-mono" dir="ltr">{seller.phone}</strong></div>
                      <div className="text-slate-500">الشرائح: <strong className="text-red-400 block text-xs mt-0.5">{seller.simsCount} SIM</strong></div>
                      <div className="text-slate-500">الاستهلاك: <strong className="text-amber-500 block text-xs mt-0.5">{seller.activityRate || 68}%</strong></div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-800/50">
                      <button onClick={() => { if (onManageSims) onManageSims(seller); }} className="flex-1 btn btn-sm btn-ghost text-red-400 hover:text-red-300 text-[10px] h-9">إدارة الشرائح</button>
                      <button onClick={() => { if (onViewPayments) onViewPayments(seller); }} className="flex-1 btn btn-sm btn-ghost text-[10px] h-9">المدفوعات</button>
                      <button onClick={() => {
                        const lockState = !isLocked;
                        setSellerLockedState({ ...sellerLockedState, [seller.id]: lockState });
                        if (onLockToggle) onLockToggle(seller.id, lockState);
                      }} className={`flex-1 btn btn-sm h-9 text-[10px] ${
                        isLocked ? 'bg-emerald-600/20 text-emerald-400 border-emerald-700/30' : 'btn-ghost'
                      }`}>{isLocked ? 'فتح الحظر' : 'حظر'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
