import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Seller, Sim, OperatorInventory, Operator, Role } from '../types';
import { Plus, RefreshCw, X, Send, ArrowLeft, Activity } from 'lucide-react';
import EmptyState from './shared/EmptyState';
import SellerListView from './agent/SellerListView';
import SimManagementView from './agent/SimManagementView';

interface AgentDashboardProps {
  role: Role;
  activeTab?: string;
  sellers: Seller[];
  sims: Sim[];
  inventories: OperatorInventory[];
  onAddSeller: () => void; // Redirects active tab to 'add_seller'
  onActivateSim?: () => void; // Redirects active tab to 'activate'
  onTransferSims: (operator: Operator, count: number, startSerial: string, endSerial: string, recipientName: string) => void;
  onUpdateSellerStatus: (sellerId: string, status: 'active' | 'inactive') => void;
  onResetSellerPassword: (sellerId: string) => void;
  onEditSeller: (seller: Seller) => void;
  onDeleteSeller: (sellerId: string) => Promise<void>;
  onUpdateInventories: (inventories: OperatorInventory[]) => void;
  username: string;
  onLogout: () => void;
  onConfirmLogout?: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onUpdateSims?: (updated: Sim[]) => void;
  onUpdateSellers?: (updated: Seller[]) => void;
}

export default function AgentDashboard({
  role,
  activeTab = 'home',
  sellers,
  sims,
  inventories,
  onAddSeller,
  onActivateSim,
  onTransferSims,
  onUpdateSellerStatus,
  onResetSellerPassword,
  onEditSeller,
  onDeleteSeller,
  onUpdateInventories,
  username,
  onLogout,
  onConfirmLogout,
  darkMode,
  setDarkMode,
  onUpdateSims,
  onUpdateSellers
}: AgentDashboardProps) {
  // Modals state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [sellerActionsOpen, setSellerActionsOpen] = useState(false);
  const [sellerDetailsOpen, setSellerDetailsOpen] = useState(false);

  // Redesigned Sellers and Mini Sim Portal states
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [sellerRegionFilter, setSellerRegionFilter] = useState('all');
  const [sellerStatusFilter, setSellerStatusFilter] = useState('all');
  
  // Custom interactive sub-modals
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [sellerLockedState, setSellerLockedState] = useState<Record<string, boolean>>({});
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editSellerModalOpen, setEditSellerModalOpen] = useState(false);
  const [editSellerName, setEditSellerName] = useState('');
  const [editSellerStore, setEditSellerStore] = useState('');
  const [editSellerPhone, setEditSellerPhone] = useState('');
  const [editSellerRegion, setEditSellerRegion] = useState('');
  const [editSellerStatus, setEditSellerStatus] = useState<'active' | 'low_stock' | 'inactive'>('active');

  // Mini SIMs Management overlay
  const [sellerSimPortalOpen, setSellerSimPortalOpen] = useState(false);
  const [selectedSellerForSims, setSelectedSellerForSims] = useState<Seller | null>(null);
  const [miniSimSearchQuery, setMiniSimSearchQuery] = useState('');
  const [miniSimOperatorFilter, setMiniSimOperatorFilter] = useState('all');
  const [assignSimIccid, setAssignSimIccid] = useState('');

  // New settings preferences loaded from localStorage
  const [passwordOpen, setPasswordOpen] = useState(false);
  // Transfer Sim form state
  const [transferOp, setTransferOp] = useState<Operator>('yemen_mobile');
  const [startRange, setStartRange] = useState('');
  const [endRange, setEndRange] = useState('');
  const [targetSellerId, setTargetSellerId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [refreshingOperator, setRefreshingOperator] = useState<string | null>(null);

  const handleRefreshInventory = async (operator: Operator) => {
    setRefreshingOperator(operator);
    try {
      const currentInv = inventories.find(i => i.operator === operator);
      if (!currentInv) return;

      const operatorName = 
        operator === 'yemen_mobile' || operator === 'Yemen Mobile' 
          ? 'يمن موبايل' 
          : operator === 'you' || operator === 'YOU' 
          ? 'YOU' 
          : 'سبأفون';

      const updatedInventories = inventories.map(i => {
        if (i.operator === operator) {
          return { ...i, periodDays: Math.min(30, i.periodDays + 1) };
        }
        return i;
      });
      onUpdateInventories(updatedInventories);
      alert(`تم تحديث بيانات المخزون لـ ${operatorName}.`);
    } catch {
      alert('فشلت عملية تحديث المخزون. يرجى المحاولة لاحقاً.');
    } finally {
      setRefreshingOperator(null);
    }
  };

  // Auto-calculated quantity for transfer
  const calculatedQty = useMemo(() => {
    const startNum = parseInt(startRange, 10);
    const endNum = parseInt(endRange, 10);
    if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
      return endNum - startNum + 1;
    }
    return 0;
  }, [startRange, endRange]);

  // Handle simulated range transfer
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transferOp) return alert('الرجاء اختيار شركة الاتصالات');
    if (!startRange || !endRange) return alert('الرجاء إدخال نطاق الأرقام التسلسلية');
    if (calculatedQty <= 0) return alert('الرجاء التأكد من صحة النطاق المدخل');
    if (!targetSellerId) return alert('الرجاء تحديد البائع المستلم');

    const recipient = sellers.find(s => s.id === targetSellerId);
    if (!recipient) return;

    setIsTransferring(true);
    setTimeout(() => {
      setIsTransferring(false);
      onTransferSims(transferOp, calculatedQty, startRange, endRange, recipient.name);
      
      // Reset Form and close modal
      setStartRange('');
      setEndRange('');
      setTargetSellerId('');
      setTransferModalOpen(false);

      alert(`تم تحويل عدد ${calculatedQty} شريحة بنجاح إلى البائع ${recipient.name}.`);
    }, 500);
  };

  const handleOpenTransferWithSeller = (seller: Seller) => {
    setTargetSellerId(seller.id);
    setTransferOp('yemen_mobile');
    setTransferModalOpen(true);
  };

  const handleResetPasswordClick = (seller: Seller) => {
    onResetSellerPassword(seller.id);
    setSellerActionsOpen(false);
  };

  const handleToggleStatusClick = (seller: Seller) => {
    const newStatus = seller.status === 'inactive' ? 'active' : 'inactive';
    onUpdateSellerStatus(seller.id, newStatus);
    setSellerActionsOpen(false);
  };

  return (
    <div dir="rtl" className="space-y-8 font-sans pb-16 safe-bottom">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            {role === 'manager' 
              ? 'بوابة الرقابة والتحكم للمدير العام' 
              : activeTab === 'sellers' 
              ? 'إدارة الحسابات ورقابة البائعين' 
              : 'إدارة مبيعات الوكيل'}
          </h1>

        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'sellers' && (
            <button
              onClick={onAddSeller}
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>{role === 'manager' ? 'إنشاء حساب مستخدم/بائع جديد' : 'إضافة بائع جديد'}</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'sellers' ? (
        <SellerListView
          sellers={sellers}
          onUpdateSellerStatus={onUpdateSellerStatus}
          onResetSellerPassword={onResetSellerPassword}
          onEditSeller={onEditSeller}
          onDeleteSeller={onDeleteSeller}
        />
      ) : activeTab === 'my_sims' ? (
        <SimManagementView
          sims={sims}
          onUpdateSims={onUpdateSims}
        />
      ) : (
        <>
          {/* Main Dashboard / Home Layout */}

          {/* Quick Actions AT THE TOP (Replacing 'طلب دفعة جديدة' for agent) */}
          {role === 'manager' ? (
            <div className="bg-gradient-to-r from-red-950/30 to-slate-900 border-r-4 border-red-500 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group">
              <div className="relative z-10 max-w-xl">
                <span className="bg-red-650/20 text-red-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">تقرير الفروقات والتسويات المالي</span>
                <h3 className="text-sm font-bold text-slate-100 mb-1.5 font-sans">توليد التقرير الختامي وتصدير كشوفات التدقيق؟</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  بصفتك مدير النظام المالي، بإمكانك فحص الإحصائيات الفعّالة لكفاية ونشاط الوكلاء في كافة المحافظات والمناطق اليمنية، ومعالجة وتصحيح العينات التالفة من السيريال المسجل.
                </p>
                <button 
                  type="button" 
                  onClick={() => alert('جاري معالجة قاعدة البيانات لتوليد التقرير المالي الموحد بصيغة PDF... تم الإرسال إلى بريدك المعتمد.')}
                  className="btn btn-primary mt-3.5"
                >
                  <span>تحميل التقرير الموحد لمبيعات الوكلاء</span>
                  <ArrowLeft size={12} className="rotate-180" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 pb-1">الإجراءات السريعة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quick action 1: تفعيل شريحة جديدة */}
                <button
                  type="button"
                  onClick={onActivateSim}
                  className="btn bg-gradient-to-r from-red-650/15 to-slate-900 border border-red-500/25 hover:border-red-500/50 p-4 rounded-xl flex items-center justify-between text-right cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-650/10 border border-red-500/20 text-red-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">add_task</span>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-100">تفعيل شريحة جديدة</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-sans">تسجيل عقد وتفعيل شريحة SIM جديدة في الميدان فوراً</p>
                    </div>
                  </div>
                  <ArrowLeft size={16} className="text-slate-400 group-hover:translate-x-[-4px] transition-transform" />
                </button>

              </div>
            </div>
          )}

          {/* 3. Summary Cards for Operator Stock & Sellers Statistics */}
          <h3 className="text-sm font-bold text-slate-300 pb-1 pt-4">مؤشرات الحصص وإحصائيات نقاط البيع</h3>
          <div className="snap-dashboard">
            {inventories.map((inv) => {
              const isYm = inv.operator === 'yemen_mobile' || inv.operator === 'Yemen Mobile';
              const isYou = inv.operator === 'you' || inv.operator === 'YOU';
              const colorBorder = isYm ? 'border-op-ym' : isYou ? 'border-op-you' : 'border-op-sf';
              const colorText = isYm ? 'op-ym' : isYou ? 'op-you' : 'op-sf';
              const bgBadge = isYm ? 'bg-op-ym-light' : isYou ? 'bg-op-you-light' : 'bg-op-sf-light';
              const badgeText = isYm ? 'يمن موبايل' : isYou ? 'YOU' : 'سبأفون';

              return (
                <div key={inv.operator} className={`stat-card border-r-4 ${colorBorder} shadow hover:shadow-lg transition-all flex flex-col justify-between`}>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-xl ${bgBadge} flex items-center justify-center shadow-lg shadow-black/20`}>
                          <span className="material-symbols-outlined text-slate-100 text-[18px]">signal_cellular_alt</span>
                        </div>
                        <span className="font-bold text-slate-100 text-sm">{badgeText}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] text-slate-500 font-medium">إجمالي الشرائح المتوفرة</h4>
                        <span className="text-2xl font-bold tracking-tight text-slate-100">{inv.available}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-800/40 pt-3 text-right">
                        <div>
                          <h4 className="text-[9px] text-slate-500 font-medium">اجمالي المتبقي</h4>
                          <p className={`font-bold text-xs ${colorText}`}>{inv.remaining}</p>
                        </div>
                        <div>
                          <h4 className="text-[9px] text-slate-500 font-medium">الفترة الزمنية</h4>
                          <p className="font-semibold text-slate-300 text-xs">{inv.periodDays} يوم</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    id={`btn-refresh-${inv.operator}`}
                    onClick={() => handleRefreshInventory(inv.operator)}
                    disabled={refreshingOperator === inv.operator}
                    className="btn btn-sm w-full mt-5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={refreshingOperator === inv.operator ? "animate-spin text-red-500" : "text-slate-400"} />
                    <span>{refreshingOperator === inv.operator ? 'جاري المزامنة...' : 'تحديث المخزون'}</span>
                  </button>
                </div>
              );
            })}

            {/* Dynamic Total Sellers statistics card */}
            <div className="stat-card border-r-4 border-r-emerald-500 shadow hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-black/20">
                      <span className="material-symbols-outlined text-emerald-400 text-[18px]">groups</span>
                    </div>
                    <span className="font-bold text-slate-100 text-sm">البائعين ونقاط البيع</span>
                  </div>
                </div>
                <div className="space-y-4 text-right">
                  <div>
                    <h4 className="text-[10px] text-slate-500 font-medium font-sans">إجمالي البائعين التابعين للوكيل</h4>
                    <span className="text-2xl font-bold tracking-tight text-slate-100">{sellers.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 border-t border-slate-800/40 pt-3 text-right">
                    <div>
                      <h4 className="text-[9px] text-slate-500 font-medium">النشطين</h4>
                      <p className="font-bold text-[11px] text-emerald-400">{sellers.filter((s) => s.status === 'active').length}</p>
                    </div>
                    <div>
                      <h4 className="text-[9px] text-slate-500 font-medium font-sans">مخزون منخفض</h4>
                      <p className="font-bold text-[11px] text-amber-500">{sellers.filter((s) => s.status === 'low_stock').length}</p>
                    </div>
                    <div>
                      <h4 className="text-[9px] text-slate-500 font-medium">غير نشط</h4>
                      <p className="font-semibold text-slate-400 text-[11px]">{sellers.filter((s) => s.status === 'inactive').length}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={onAddSeller}
                className="btn btn-sm w-full mt-5 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-700"
              >
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                <span>تسجيل بائع إضافي</span>
              </button>
            </div>
          </div>

          {/* 5. Recent Operations Table (آخر العمليات) */}
          <h3 className="text-sm font-bold text-slate-300 pb-1 pt-4 font-sans">آخر العمليات</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="table-wrap">
              <table className="text-xs table-cards-mobile">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                    <th className="p-4 font-bold text-slate-400">التاريخ</th>
                    <th className="p-4 font-bold text-slate-400">اسم البائع</th>
                    <th className="p-4 font-bold text-slate-400">المشغل</th>
                    <th className="p-4 font-bold text-slate-400">عدد الشرائح</th>
                    <th className="p-4 font-bold text-slate-400">نوع العملية</th>
                    <th className="p-4 font-bold text-slate-400 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {[].length > 0 ? [].map((op: any) => (
                    <tr key={op.id} className="hover:bg-slate-950/30 transition-colors">
                      <td data-label="التاريخ" className="p-4 text-slate-400 font-medium">{op.date}</td>
                      <td data-label="اسم البائع" className="p-4 font-bold text-slate-100">{op.sellerName}</td>
                      <td data-label="المشغل" className="p-4">
                        <span className={`badge ${op.operator === 'yemen_mobile' ? 'badge-active' : op.operator === 'you' ? 'badge-pending' : 'badge-available'}`}>
                          {op.operator === 'yemen_mobile' ? 'يمن موبايل' : op.operator === 'you' ? 'YOU' : 'سبأفون'}
                        </span>
                      </td>
                      <td data-label="عدد الشرائح" className="p-4 font-semibold text-slate-300 font-sans">{op.simsCount} شرائح</td>
                      <td data-label="نوع العملية" className="p-4 text-slate-300 font-medium">{op.opType}</td>
                      <td data-label="الحالة" className="p-4 text-center">
                        <span className={`badge ${op.status === 'success' ? 'badge-success' : 'badge-failed'}`}>
                          {op.status === 'success' ? 'ناجحة' : 'فشلت'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-8">
                        <EmptyState
                          icon={<Activity size={36} className="text-slate-600" />}
                          title="لا توجد عمليات حديثة"
                          description="عند تنفيذ أول عملية توزيع أو تفعيل، ستظهر هنا سجلات العمليات."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-950/40 text-[10px] text-slate-500 flex justify-between items-center">
              <span>آخر العمليات المسجلة في النظام</span>
              <span>مزامنة مباشرة مع خادم يمن تليكوم</span>
            </div>
          </div>
        </>
      )}

      {/* ========================================================== */}
      {/* 6. MODAL DIALOGS AND BOTTOM SHEETS (matching user images) */}
      {/* ========================================================== */}
      
      {/* Modal A: SIM Transfer Dialog ("تحويل شرائح إلى البائع") */}
      <AnimatePresence>
        {transferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransferModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh] text-slate-200"
            >
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-100">تحويل شرائح إلى بائع</h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    أدخل شركة الاتصالات ونطاق السيريال لحساب الكمية وتحويلها فوراً
                  </p>
                </div>
                <button 
                  onClick={() => setTransferModalOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-5 text-right">
                
                {/* Step 1: Carrier selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400">الخطوة 1: اختر شركة الاتصالات</label>
                  <select
                    value={transferOp}
                    onChange={(e: any) => setTransferOp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-600 transition-colors"
                  >
                    <option value="yemen_mobile">يمن موبايل (Yemen Mobile)</option>
                    <option value="sabafon">سبأفون (Sabafon)</option>
                    <option value="you">YOU (واي)</option>
                  </select>
                </div>

                {/* Step 2: Serial ranges input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400">الخطوة 2: حدد نطاق الأرقام التسلسلية</label>
                  <p className="text-[9px] text-slate-500">أدخل السيريال الأول والأخير لحساب الكميات تلقائياً.</p>
                  
                  <div className="grid grid-cols-2 gap-3" dir="ltr">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 block text-right">إلى رقم</span>
                      <input
                        type="text"
                        value={endRange}
                        onChange={(e) => setEndRange(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-center outline-none focus:border-red-650 transition-colors font-sans"
                        placeholder="89967..."
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 block text-right">من رقم</span>
                      <input
                        type="text"
                        value={startRange}
                        onChange={(e) => setStartRange(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-center outline-none focus:border-red-650 transition-colors font-sans"
                        placeholder="89961..."
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3: Computed Quantity Display */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400">الكمية المحسوبة المبدئية</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-100 font-extrabold font-sans text-center">
                    {calculatedQty > 0 ? `${calculatedQty} شرائح` : 'الرجاء إدخال نطاق سيريال صالح'}
                  </div>
                </div>

                {/* Step 4: Summary container */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-right">
                  <h4 className="text-[10px] font-bold text-red-500 mb-2 pb-1 border-b border-slate-800">ملخص العملية</h4>
                  <div className="space-y-2 text-[11px] font-light">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>المستلم:</span>
                      <span className="text-slate-100 font-bold">
                        {sellers.find(s => s.id === targetSellerId)?.name || 'الرجاء اختيار البائع'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>شركة الاتصالات:</span>
                      <span className="text-slate-100 font-bold">
                        {transferOp === 'yemen_mobile' ? 'يمن موبايل' : transferOp === 'you' ? 'YOU' : 'سبأفون'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>إجمالي النطاق:</span>
                      <span className="text-slate-100 font-sans font-semibold">
                        {startRange && endRange ? `${startRange} - ${endRange}` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/40">
                      <span>إجمالي الكمية:</span>
                      <span className="text-red-400 font-extrabold">{calculatedQty} شريحة</span>
                    </div>
                  </div>
                </div>

                {/* Recipient select under Modal */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400">المستلم المعتمد لرحلة الشرائح</label>
                  <select
                    value={targetSellerId}
                    onChange={(e) => setTargetSellerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-650 transition-colors text-slate-200"
                  >
                    <option value="" disabled>اختر البائع المستهدف...</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.storeName}</option>
                    ))}
                  </select>
                </div>

                {/* Submit block buttons */}
                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isTransferring || calculatedQty <= 0 || !targetSellerId}
                    className="btn btn-primary w-full"
                  >
                    {isTransferring ? (
                      <RefreshCw className="animate-spin text-slate-100" size={14} />
                    ) : (
                      <>
                        <Send size={12} />
                        <span>تأكيد تحويل الكمية للبائع</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferModalOpen(false)}
                    className="btn btn-ghost w-full"
                  >
                    إلغاء العملية
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal B: Seller Details Bottom Sheet ("تفاصيل البائع") */}
      <AnimatePresence>
        {sellerDetailsOpen && selectedSeller && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSellerDetailsOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              {/* Close handle indicator */}
              <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-slate-100">تفاصيل البائع والاعتماد</h3>
                <button 
                  onClick={() => setSellerDetailsOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Profile card avatar content */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-slate-850 shadow-md overflow-hidden bg-slate-950 mb-3 flex items-center justify-center">
                  {selectedSeller.avatar ? (
                    <img loading="lazy" src={selectedSeller.avatar} alt={selectedSeller.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-slate-600">store</span>
                  )}
                </div>
                <h4 className="font-bold text-lg text-slate-100">{selectedSeller.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{selectedSeller.storeName}</p>
              </div>

              {/* Specs detailed card stack */}
              <div className="space-y-3 bg-slate-950/40 p-5 rounded-2xl border border-slate-800 mb-6 text-right">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500 text-xs font-semibold">رقم هوية البائع:</span>
                  <span className="text-slate-200 text-xs font-mono font-bold">{selectedSeller.idNumber}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500 text-xs font-semibold">الهاتف المقترن:</span>
                  <span className="text-slate-200 text-xs font-mono font-bold" dir="ltr">{selectedSeller.phone}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500 text-xs font-semibold">التغطية والمنطقة الجغرافية:</span>
                  <span className="text-slate-200 text-xs font-bold">{selectedSeller.region}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500 text-xs font-semibold">تاريخ التسجيل والاعتماد:</span>
                  <span className="text-slate-200 text-xs font-bold">{selectedSeller.creationDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-semibold">آخر نشاط مسجل:</span>
                  <span className="text-slate-200 text-xs font-bold">{selectedSeller.lastLogin}</span>
                </div>
              </div>

              {/* Dialog buttons control */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSellerDetailsOpen(false);
                    handleOpenTransferWithSeller(selectedSeller);
                  }}
                  className="btn btn-primary w-full"
                >
                  تعديل بيانات البائع أو تحويل شرائح
                </button>
                <button
                  type="button"
                  onClick={() => setSellerDetailsOpen(false)}
                  className="btn btn-ghost w-full"
                >
                  إغلاق نافذة التفاصيل
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal C: Seller Action Sheet Menu ("إجراءات البائع") */}
      <AnimatePresence>
        {sellerActionsOpen && selectedSeller && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSellerActionsOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              {/* Slider handler indicator */}
              <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-100">إجراءات البائع والاعتماد</h3>
                  <p className="text-[11px] text-slate-400 mt-1">تعديل أو تغيير وضعية ونشاط الحساب لـ "{selectedSeller.name}"</p>
                </div>
                <button 
                  onClick={() => setSellerActionsOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Action Buttons Link stack */}
              <div className="space-y-2 text-right">
                
                {/* 1. Reset password option */}
                <button
                  type="button"
                  onClick={() => handleResetPasswordClick(selectedSeller)}
                  className="btn w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-800/40 text-slate-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 bg-slate-950 p-2.5 rounded-xl group-hover:text-red-500 transition-colors">lock_reset</span>
                    <div>
                      <p className="font-bold text-xs text-slate-100">إعادة تعيين كلمة المرور</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">تحديث تلقائي وإرسال الكود للبائع عبر SMS</p>
                    </div>
                  </div>
                  <ArrowLeft size={16} />
                </button>

                {/* 2. Suspend/Activate account option */}
                <button
                  type="button"
                  onClick={() => handleToggleStatusClick(selectedSeller)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${
                    selectedSeller.status === 'inactive'
                      ? 'border-emerald-950/20 hover:bg-emerald-950/20 text-emerald-400'
                      : 'border-yellow-950/20 hover:bg-yellow-950/20 text-yellow-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined bg-slate-950 p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                      {selectedSeller.status === 'inactive' ? 'check_circle' : 'block'}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-slate-100">
                        {selectedSeller.status === 'inactive' ? 'تفعيل الحساب والاعتماد' : 'إيقاف الحساب مؤقتاً'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {selectedSeller.status === 'inactive' 
                          ? 'السماح مجدداً للبائع بإجراء تفعيل الشرائح في الميدان' 
                          : 'منع البائع مؤقتاً من بيع وتفعيل الشرائح وعقد الخدمات'
                        }
                      </p>
                    </div>
                  </div>
                  <ArrowLeft size={16} />
                </button>

              </div>

              {/* Cancel actions footer */}
              <div className="mt-8 mb-4">
                <button
                  type="button"
                  onClick={() => setSellerActionsOpen(false)}
                  className="btn w-full bg-slate-800 text-slate-100 hover:bg-slate-700"
                >
                  إلغاء الإجراءات
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
